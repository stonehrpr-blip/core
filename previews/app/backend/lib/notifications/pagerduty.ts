// PagerDuty Events API v2 — true on-call paging for revenue-critical failures
// (Stripe webhook 5xx, Apple notification 5xx, daily cron failure, etc).
//
// Setup:
//   1. PagerDuty → Service → Integrations → Events API v2
//   2. Copy "Integration Key" → PAGERDUTY_ROUTING_KEY env var
//
// Severity guide:
//   - critical → wakes you up (revenue webhook failure, payment processing broken)
//   - error    → notifies during business hours (cron failure, scheduler stuck)
//   - warning  → in dashboard only (suspicious-login spike, daily-cap hit by many users)

export type PagerDutySeverity = 'critical' | 'error' | 'warning' | 'info';

export async function pagePagerDuty(opts: {
  summary: string;
  severity: PagerDutySeverity;
  source: string;          // 'cron:daily' | 'stripe:webhook' | etc
  customDetails?: Record<string, unknown>;
  dedupKey?: string;       // same key collapses repeated alerts into one incident
}): Promise<{ ok: boolean; reason?: string }> {
  const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
  if (!routingKey) {
    if (process.env.NODE_ENV !== 'production') console.log('[pagerduty:dev]', opts.severity, opts.summary);
    return { ok: false, reason: 'no_routing_key' };
  }
  try {
    const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: opts.dedupKey,
        payload: {
          summary: opts.summary,
          severity: opts.severity,
          source: opts.source,
          custom_details: opts.customDetails,
        },
      }),
    });
    if (!res.ok) return { ok: false, reason: 'pd_api_' + res.status };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

/** Resolve an open incident (call when the issue self-heals). */
export async function resolvePagerDuty(dedupKey: string): Promise<void> {
  const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
  if (!routingKey) return;
  try {
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ routing_key: routingKey, event_action: 'resolve', dedup_key: dedupKey }),
    });
  } catch {/* ignore */}
}
