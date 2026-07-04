// POST /api/billing/portal — open Stripe Customer Portal for the active user.
// Returns: { url: string }  — manage subscription, update card, view invoices, cancel.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createPortalSession } from '@/lib/billing/stripe';
import { verifyCsrf } from '@/lib/security/csrf';
import { track } from '@/lib/analytics/track';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) {
    return NextResponse.json({ error: 'csrf_failed' }, { status: 403 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId, provider: 'STRIPE' },
    orderBy: { createdAt: 'desc' },
    select: { stripeCustomerId: true },
  });
  if (!sub?.stripeCustomerId) return NextResponse.json({ error: 'no_stripe_customer' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://core.harperlinks.com';
  const session = await createPortalSession(sub.stripeCustomerId, `${origin}/settings.html`);

  await track({ event: 'portal_opened', userId });
  return NextResponse.json({ url: session.url });
}
