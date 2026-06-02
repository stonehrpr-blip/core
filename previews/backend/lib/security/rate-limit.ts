// Rate limiter. Two-tier: in-memory LRU (fast path) + Postgres RateLimitBucket (durable).
//
// In serverless each lambda has its own memory, so in-memory alone undercounts.
// We use it as a fast-reject layer for obviously-over-limit calls; the DB is
// the source of truth.
//
// Future: swap the DB tier for Upstash Redis with INCR + EXPIRE for atomicity at scale.

import { prisma } from '@/lib/db/prisma';

interface MemBucket { count: number; resetAt: number; }
const memBuckets = new Map<string, MemBucket>();

export interface RateLimitOpts {
  key: string;       // unique identifier — e.g. `coin_send:userId`
  limit: number;     // max requests
  windowMs: number;  // sliding window in ms
}

export async function checkRateLimit(opts: RateLimitOpts): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  // Memory tier — fast reject if it's already known over
  let mem = memBuckets.get(opts.key);
  if (mem && mem.resetAt < now) { memBuckets.delete(opts.key); mem = undefined; }
  if (mem && mem.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(mem.resetAt) };
  }
  // DB tier — atomic increment with upsert
  const windowEnd = new Date(now + opts.windowMs);
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key: opts.key },
    update: {
      count: { increment: 1 },
      // If old window expired, reset both count + window
      ...(mem && mem.resetAt < now ? { count: 1, windowEnd } : {}),
    },
    create: { key: opts.key, count: 1, windowEnd },
  });
  // If the row is stale (window passed), reset
  if (bucket.windowEnd < new Date()) {
    await prisma.rateLimitBucket.update({
      where: { key: opts.key },
      data: { count: 1, windowEnd },
    });
    memBuckets.set(opts.key, { count: 1, resetAt: windowEnd.getTime() });
    return { allowed: true, remaining: opts.limit - 1, resetAt: windowEnd };
  }
  memBuckets.set(opts.key, { count: bucket.count, resetAt: bucket.windowEnd.getTime() });
  return {
    allowed: bucket.count <= opts.limit,
    remaining: Math.max(0, opts.limit - bucket.count),
    resetAt: bucket.windowEnd,
  };
}

/** Convenience wrappers for the common buckets. */
export const RateLimits = {
  login:       (id: string) => checkRateLimit({ key: `login:${id}`,       limit: 5,  windowMs: 15 * 60 * 1000 }),  // 5 per 15min
  coinSend:    (id: string) => checkRateLimit({ key: `coin_send:${id}`,   limit: 20, windowMs: 60 * 60 * 1000 }),   // 20 per hour
  postCreate:  (id: string) => checkRateLimit({ key: `post:${id}`,        limit: 6,  windowMs: 60 * 60 * 1000 }),   // 6 per hour
  adminPin:    (id: string) => checkRateLimit({ key: `admin_pin:${id}`,   limit: 5,  windowMs: 15 * 60 * 1000 }),   // 5 per 15min
  passwordReset:(id: string) => checkRateLimit({ key: `pw_reset:${id}`,   limit: 3,  windowMs: 60 * 60 * 1000 }),   // 3 per hour
};
