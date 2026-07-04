// Analytics ingestion — fast write path. The expensive aggregation runs in a
// nightly job (scripts/daily-aggregations.ts → AnalyticsDaily + RevenueDaily).
//
// Events get batched per request (we buffer in-memory and flush at the end of
// the request lifecycle). For serverless we just write through immediately.

import { prisma } from '@/lib/db/prisma';

export interface TrackOpts {
  event: string;
  userId?: string;
  sessionId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  ua?: string;
  country?: string;
}

export async function track(opts: TrackOpts): Promise<void> {
  // Route via the in-memory queue if ANALYTICS_QUEUE=1 (default in Phase 7+).
  // Falls back to direct write otherwise.
  if (process.env.ANALYTICS_QUEUE !== '0') {
    const { enqueueEvent } = await import('./queue');
    enqueueEvent(opts);
    return;
  }
  try {
    await prisma.analyticsEvent.create({
      data: {
        event: opts.event,
        userId: opts.userId,
        sessionId: opts.sessionId,
        meta: opts.meta as any,
        ip: opts.ip,
        ua: opts.ua,
        country: opts.country,
      },
    });
  } catch (err) {
    console.warn('analytics_write_failed', err);
  }
}

/** Batch flavor — useful in higher-volume contexts (Stripe webhooks, push receipts). */
export async function trackBatch(events: TrackOpts[]): Promise<void> {
  if (events.length === 0) return;
  try {
    await prisma.analyticsEvent.createMany({
      data: events.map(e => ({
        event: e.event,
        userId: e.userId,
        sessionId: e.sessionId,
        meta: e.meta as any,
        ip: e.ip,
        ua: e.ua,
        country: e.country,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.warn('analytics_batch_failed', err);
  }
}
