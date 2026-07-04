// POST /api/stripe/webhook — Stripe → server.
// Verifies signature with the raw body, dispatches to the right handler.

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { verifyStripeWebhook, stripe } from '@/lib/billing/stripe';
import { track } from '@/lib/analytics/track';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const userId = (sub.metadata?.userId as string) || undefined;
  if (!userId) return;
  const status = mapStripeStatus(sub.status, sub.cancel_at_period_end);
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: {
      status,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      stripePriceId: sub.items.data[0]?.price.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd:   new Date(sub.current_period_end   * 1000),
      trialEnd:           sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      cancelAtPeriodEnd:  sub.cancel_at_period_end,
      cancelledAt:        sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
    create: {
      userId,
      provider: 'STRIPE',
      status,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items.data[0]?.price.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd:   new Date(sub.current_period_end   * 1000),
      trialEnd:           sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      cancelAtPeriodEnd:  sub.cancel_at_period_end,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      tier: status === 'ACTIVE' || status === 'TRIALING' || status === 'GRACE_PERIOD' ? 'PRO' : 'FREE',
      subscriptionStatus: status,
    },
  });
}

function mapStripeStatus(s: Stripe.Subscription.Status, cancelAtPeriodEnd: boolean): any {
  if (cancelAtPeriodEnd) return 'CANCELLED';
  switch (s) {
    case 'trialing':            return 'TRIALING';
    case 'active':              return 'ACTIVE';
    case 'past_due':            return 'PAST_DUE';
    case 'unpaid':              return 'PAST_DUE';
    case 'canceled':            return 'EXPIRED';
    case 'incomplete':
    case 'incomplete_expired': return 'EXPIRED';
    default:                    return 'EXPIRED';
  }
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  const userId = (invoice.subscription_details?.metadata?.userId as string)
    || (invoice.metadata?.userId as string);
  if (!userId) return;
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  // Record the transaction (gross / fees / net)
  const gross = invoice.amount_paid;            // cents
  // Stripe fee = 2.9% + 30¢ on US cards. Real fee comes from balance transaction.
  const fee = Math.round(gross * 0.029 + 30);
  const net = gross - fee;
  await prisma.transaction.create({
    data: {
      userId,
      subscriptionId: subId ?? undefined,
      provider: 'STRIPE',
      amountCents: gross,
      feeCents: fee,
      netCents: net,
      currency: invoice.currency?.toUpperCase() || 'USD',
      stripeInvoiceId: invoice.id,
      description: invoice.description ?? 'subscription',
    },
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  let event: Stripe.Event;
  try { event = verifyStripeWebhook(raw, sig); }
  catch { return NextResponse.json({ error: 'invalid_signature' }, { status: 400 }); }

  // Idempotency. Stripe retries 5xx with exponential backoff and can deliver
  // the same event.id concurrently. Without atomic dedupe we double-write
  // Transaction rows / double-mutate Subscription state. The (provider, externalId)
  // unique constraint on ProcessedWebhook makes the claim atomic — first one
  // wins; everyone else short-circuits with duplicate=true.
  try {
    await prisma.processedWebhook.create({
      data: { provider: 'stripe', externalId: event.id, kind: event.type },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      await track({ event: 'stripe_webhook_duplicate', meta: { eventId: event.id, type: event.type } });
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.trial_will_end':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        // Stripe Smart Retry kicks in — we don't downgrade until subscription.status flips
        await track({ event: 'stripe_payment_failed', meta: { invoiceId: (event.data.object as Stripe.Invoice).id } });
        break;
      case 'checkout.session.completed':
        // First charge after checkout — subscription event will follow with details
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('stripe_webhook_error', err);
    // Page on-call — revenue webhook 5xx is critical
    try {
      const { pagePagerDuty } = await import('@/lib/notifications/pagerduty');
      await pagePagerDuty({
        summary: 'Stripe webhook handler error: ' + (err as Error).message.slice(0, 120),
        severity: 'critical',
        source: 'stripe:webhook',
        dedupKey: 'stripe-webhook-' + event.type,
        customDetails: { eventType: event.type, error: (err as Error).message },
      });
    } catch { /* never block response on alert */ }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
