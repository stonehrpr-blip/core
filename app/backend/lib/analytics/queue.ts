// In-process analytics event queue.
//
// Why: writing every event individually fires N round trips to the DB. At
// scale we batch via `createMany`. In serverless we can't keep a long-lived
// queue across requests, so we keep an in-memory buffer that flushes on
// request end (or every 100ms via an interval), and the daily cron sweeps
// up anything that leaked.

import { prisma } from '@/lib/db/prisma';
import type { TrackOpts } from './track';

const MAX_BATCH = 500;
const FLUSH_INTERVAL_MS = 1000;

let buffer: TrackOpts[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flush();
  }, FLUSH_INTERVAL_MS);
}

export function enqueueEvent(opts: TrackOpts): void {
  buffer.push(opts);
  if (buffer.length >= MAX_BATCH) {
    // Don't await — fire and forget
    flush().catch(() => {});
  } else {
    scheduleFlush();
  }
}

export async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await prisma.analyticsEvent.createMany({
      data: batch.map(e => ({
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
    // Re-queue on failure so the daily-aggregations sweep catches them
    console.warn('analytics_flush_failed', err);
    buffer = batch.concat(buffer);
  }
}
