// POST /api/billing/checkout — create a Stripe Checkout session for the active user.
// Body: { plan: 'monthly' | 'yearly', promoCode?: string }
// Returns: { url: string }  — client redirects there.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateStripeCustomer, createCheckoutSession, STRIPE_PRICES } from '@/lib/billing/stripe';
import { verifyCsrf } from '@/lib/security/csrf';
import { track } from '@/lib/analytics/track';

const Body = z.object({
  plan: z.enum(['monthly', 'yearly']),
  promoCode: z.string().min(2).max(40).optional(),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) {
    return NextResponse.json({ error: 'csrf_failed' }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const { plan, promoCode } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: { where: { provider: 'STRIPE' }, take: 1, orderBy: { createdAt: 'desc' } } },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const stripeCustomerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    existingId: user.subscriptions[0]?.stripeCustomerId,
  });

  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://core.harperlinks.com';
  const priceId = plan === 'yearly' ? STRIPE_PRICES.yearly : STRIPE_PRICES.monthly;

  const session = await createCheckoutSession({
    customerId: stripeCustomerId,
    userId: user.id,
    priceId,
    successUrl: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl:  `${origin}/pricing.html?cancelled=1`,
    trialDays: 7,
  });

  await track({ event: 'checkout_started', userId: user.id, meta: { plan, hasPromo: !!promoCode } });
  return NextResponse.json({ url: session.url, sessionId: session.id });
}
