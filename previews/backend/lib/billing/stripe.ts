// Stripe client singleton + checkout/portal helpers.

import Stripe from 'stripe';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY required in production');
}

export const stripe = new Stripe(STRIPE_KEY || 'sk_test_dummy', {
  apiVersion: '2024-12-18.acacia',
  appInfo: { name: 'CORE', version: '0.1.0' },
});

export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_placeholder',
  yearly:  process.env.STRIPE_PRICE_YEARLY  || 'price_yearly_placeholder',
};

/** Create or fetch a Stripe customer for the user. */
export async function getOrCreateStripeCustomer(opts: {
  userId: string;
  email: string;
  existingId?: string | null;
}): Promise<string> {
  if (opts.existingId) {
    try {
      const c = await stripe.customers.retrieve(opts.existingId);
      if (c && !('deleted' in c && c.deleted)) return opts.existingId;
    } catch {/* fall through */ }
  }
  const customer = await stripe.customers.create({
    email: opts.email,
    metadata: { userId: opts.userId },
  });
  return customer.id;
}

/** Create a Checkout Session for a new subscriber (7-day trial + intro pricing). */
export async function createCheckoutSession(opts: {
  customerId: string;
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}) {
  return await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: opts.customerId,
    line_items: [{ price: opts.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: opts.trialDays ?? 7,
      metadata: { userId: opts.userId },
    },
    metadata: { userId: opts.userId },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    automatic_tax: { enabled: true },
  });
}

/** Generate a one-time link to Stripe's customer portal (cancel, change plan, view invoices). */
export async function createPortalSession(customerId: string, returnUrl: string) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/** Verify a webhook event signature. Use the RAW request body, NOT the parsed JSON. */
export function verifyStripeWebhook(rawBody: string, signature: string | null): Stripe.Event {
  if (!signature) throw new Error('missing_signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('webhook_secret_not_configured');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
