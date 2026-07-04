// POST /api/coins/send — atomic peer-to-peer coin transfer.
// Validated by Zod. Rate-limited per-user. CSRF-checked. Transactional.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { RateLimits } from '@/lib/security/rate-limit';
import { verifyCsrf } from '@/lib/security/csrf';
import { track } from '@/lib/analytics/track';

export const runtime = 'nodejs';

const DAILY_CAP = 500;

const Body = z.object({
  toHandle: z.string().min(2).max(64),
  amount: z.number().int().positive().max(10000),
  reason: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const fromId = req.headers.get('x-core-user-id');
  if (!fromId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // CSRF
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) {
    return NextResponse.json({ error: 'csrf_failed' }, { status: 403 });
  }
  // Rate limit
  const rl = await RateLimits.coinSend(fromId);
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited', resetAt: rl.resetAt }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const { toHandle, amount, reason = 'transfer' } = parsed.data;

  const toUser = await prisma.user.findUnique({ where: { handle: toHandle } });
  if (!toUser) return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 });
  if (toUser.id === fromId) return NextResponse.json({ error: 'self_transfer' }, { status: 400 });
  if (toUser.isBanned) return NextResponse.json({ error: 'recipient_banned' }, { status: 403 });

  try {
    const result = await prisma.$transaction(async tx => {
      const from = await tx.user.findUnique({ where: { id: fromId } });
      if (!from) throw new Error('sender_not_found');
      if (from.isBanned) throw new Error('sender_banned');
      if (from.coins < amount) throw new Error('insufficient');

      // Daily-cap check inside the transaction (preserves correctness under concurrency)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todaysSpend = await tx.coinLedger.aggregate({
        _sum: { delta: true },
        where: { userId: fromId, delta: { lt: 0 }, createdAt: { gte: todayStart } },
      });
      const spentToday = Math.abs(todaysSpend._sum.delta || 0);
      if (spentToday + amount > DAILY_CAP) throw new Error('daily_cap');

      await tx.user.update({ where: { id: fromId },     data: { coins: { decrement: amount } } });
      await tx.user.update({ where: { id: toUser.id },  data: { coins: { increment: amount } } });
      await tx.coinLedger.create({ data: { userId: fromId,    delta: -amount, reason: `transfer_to_${toHandle}` } });
      await tx.coinLedger.create({ data: { userId: toUser.id, delta: +amount, reason: `transfer_from_${from.handle}` } });
      await tx.coinTransfer.create({ data: { fromId, toId: toUser.id, amount, reason } });

      return { ok: true, balance: from.coins - amount };
    });

    await track({ event: 'coin_transfer', userId: fromId, meta: { amount, to: toUser.id } });
    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'insufficient')         return NextResponse.json({ error: 'insufficient' }, { status: 400 });
    if (msg === 'daily_cap')             return NextResponse.json({ error: 'daily_cap', cap: DAILY_CAP }, { status: 400 });
    if (msg === 'sender_banned')         return NextResponse.json({ error: 'sender_banned' }, { status: 403 });
    console.error('coin_send_error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
