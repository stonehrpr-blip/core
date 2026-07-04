// /billing/success?session_id=... — landing page after Stripe Checkout completes.
// Verifies the session, shows receipt, links back to the app.
// This is a server component — fetches Stripe-side, renders.

import { stripe } from '@/lib/billing/stripe';

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams;
  if (!session_id) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>Missing session</h1>
          <p>This page expects a Stripe Checkout session ID. Try opening from your email.</p>
          <a href="/" style={linkStyle}>← Back to CORE</a>
        </div>
      </div>
    );
  }

  let session: any = null;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['subscription'] });
  } catch {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>We couldn't find that session</h1>
          <p>If you were just charged, contact support@core.app — your subscription is still active.</p>
          <a href="/" style={linkStyle}>← Back to CORE</a>
        </div>
      </div>
    );
  }

  const trialEnd = session.subscription?.trial_end
    ? new Date(session.subscription.trial_end * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>✓ TRIAL ACTIVE</div>
        <h1 style={{ fontSize: 28, letterSpacing: '-0.6px', margin: '14px 0 8px' }}>You're in.</h1>
        <p style={{ color: '#9AA1B7', fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>
          7-day free trial started. {trialEnd ? `First charge on ${trialEnd}.` : 'No charge today.'}
          <br/>Cancel any time in Settings → Apple Subscriptions or the Stripe portal.
        </p>
        <a href="/" style={primaryBtn}>Open CORE →</a>
        <div style={smallText}>
          Receipt + invoice sent to {session.customer_email || 'your email'}.
        </div>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: '100vh', background: '#0A0A14', display: 'grid', placeItems: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif', color: '#fff' };
const cardStyle = { maxWidth: 420, padding: 32, borderRadius: 22, background: 'linear-gradient(180deg, rgba(74,143,255,0.10), rgba(74,143,255,0.02))', border: '1px solid rgba(255,255,255,0.10)', textAlign: 'center' as const };
const badgeStyle = { display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.40)', color: '#34D399', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em' };
const primaryBtn = { display: 'inline-block', padding: '14px 28px', borderRadius: 999, background: '#fff', color: '#050510', textDecoration: 'none', fontWeight: 700, fontSize: 14 };
const linkStyle = { color: '#6BA9FF', textDecoration: 'none', fontSize: 13 };
const smallText = { marginTop: 18, fontSize: 11, color: '#4F5570', letterSpacing: 0.4 };
