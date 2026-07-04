// POST /api/admin/refund — owner refunds a transaction and revokes Pro access.
//
// Owner-only. CSRF-checked.
// Body: { transactionId: string, reason?: string, fullRefund?: boolean }
//
// Apple side: Apple is the merchant. We can't trigger an Apple refund directly —
// the user must request through Apple. What we DO is mark the Transaction as
// refunded in our DB + revoke Pro access immediately, so support cases can be
// resolved before Apple's refund processes.
//
// Stripe side: we call stripe.refunds.create() — real refund.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';
import { verifyCsrf } from '@/lib/security/csrf';
import { adminAudit } from '@/lib/security/audit';
import { stripe } from '@/lib/billing/stripe';
import { getRequestContext } from '@/lib/auth/session';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

const Body = z.object({
  transactionId: z.string().min(1).max(64),
  reason: z.string().max(280).optional(),
  fullRefund: z.boolean().optional().default(true),
  amountCents: z.number().int().positive().max(1_000_000).optional(),
});

export async function POST(req: NextRequest) {
  let actorId: string;
  try { actorId = await requireOwner(); } catch { return NOT_FOUND(); }
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) return NOT_FOUND();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { transactionId, reason, fullRefund, amountCents } = parsed.data;

  const ctx = await getRequestContext();
  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!txn) return NextResponse.json({ error: 'transaction_not_found' }, { status: 404 });
  if (txn.refundedAt) return NextResponse.json({ error: 'already_refunded' }, { status: 400 });

  const refundCents = fullRefund ? txn.amountCents : (amountCents || txn.amountCents);
  let stripeRefundId: string | null = null;

  // Stripe channel: real refund via Stripe API
  if (txn.provider === 'STRIPE' && txn.stripeChargeId) {
    try {
      const refund = await stripe.refunds.create({
        charge: txn.stripeChargeId,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: { userId: txn.userId, originalTxnId: txn.id, reason: reason || 'owner_refund' },
      });
      stripeRefundId = refund.id;
    } catch (err) {
      return NextResponse.json({ error: 'stripe_refund_failed', detail: (err as Error).message }, { status: 502 });
    }
  }
  // Apple channel: we can't issue the refund — it must come through Apple's
  // CONSUMPTION_REQUEST flow. We mark internally + revoke; Apple processes
  // independently and sends a REFUND notification later.

  // Persist the refund record + mark txn refunded + bump user's refund count + revoke Pro
  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: txn.id },
      data: { refundedAt: new Date() },
    }),
    prisma.refund.create({
      data: {
        userId: txn.userId,
        transactionId: txn.id,
        amountCents: refundCents,
        reason,
        provider: txn.provider,
      },
    }),
    prisma.user.update({
      where: { id: txn.userId },
      data: {
        refundCount: { increment: 1 },
        tier: 'FREE',
        subscriptionStatus: 'REFUNDED',
      },
    }),
  ]);

  await adminAudit({
    actorId,
    action: 'REFUND_ISSUED',
    targetId: txn.userId,
    meta: { transactionId: txn.id, refundCents, provider: txn.provider, stripeRefundId, reason } as any,
    ip: ctx.ip,
  });

  return NextResponse.json({
    ok: true,
    refundCents,
    stripeRefundId,
    appleNote: txn.provider === 'APPLE' ? 'Marked refunded in our DB and revoked Pro. Apple processes the actual refund through their CONSUMPTION_REQUEST flow.' : undefined,
  });
}
