// Brute-force protection — account-level lockout on top of FailedLogin tracking.
// Soft lockout starts at 5 failed attempts in 15 minutes → 15-minute timeout.
// Repeat offenders get doubled timeouts (capped at 24h).

import { prisma } from '@/lib/db/prisma';

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_THRESHOLD = 5;
const BASE_LOCKOUT_MS   = 15 * 60 * 1000;
const MAX_LOCKOUT_MS    = 24 * 60 * 60 * 1000;

export async function recordFailedLogin(opts: {
  identifier: string;   // email (lowercased)
  ip?: string;
  reason?: string;
}): Promise<{ locked: boolean; unlocksAt?: Date }> {
  await prisma.failedLogin.create({
    data: { identifier: opts.identifier, ip: opts.ip, reason: opts.reason },
  });
  // Count recent failures
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MS);
  const recent = await prisma.failedLogin.count({
    where: { identifier: opts.identifier, ts: { gte: since } },
  });
  if (recent < ATTEMPT_THRESHOLD) return { locked: false };

  // How many lockouts has this identifier had? Each doubles the next.
  const priorLockouts = await prisma.accountLockout.count({ where: { identifier: opts.identifier } });
  const lockMs = Math.min(MAX_LOCKOUT_MS, BASE_LOCKOUT_MS * Math.pow(2, priorLockouts));
  const unlocksAt = new Date(Date.now() + lockMs);
  await prisma.accountLockout.upsert({
    where: { identifier: opts.identifier },
    update: { unlocksAt, lockedAt: new Date(), reason: 'brute_force' },
    create: { identifier: opts.identifier, unlocksAt, reason: 'brute_force' },
  });
  return { locked: true, unlocksAt };
}

/** Returns true if the identifier is currently locked out. */
export async function isLockedOut(identifier: string): Promise<{ locked: boolean; unlocksAt?: Date }> {
  const row = await prisma.accountLockout.findUnique({ where: { identifier } });
  if (!row) return { locked: false };
  if (row.unlocksAt < new Date()) {
    // Lockout expired — clean it up
    await prisma.accountLockout.delete({ where: { identifier } }).catch(() => {});
    return { locked: false };
  }
  return { locked: true, unlocksAt: row.unlocksAt };
}

/** Clear all failures + lockout (call on successful login). */
export async function clearFailures(identifier: string): Promise<void> {
  await prisma.failedLogin.deleteMany({ where: { identifier } });
  await prisma.accountLockout.delete({ where: { identifier } }).catch(() => {});
}
