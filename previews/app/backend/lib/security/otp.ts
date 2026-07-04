// Email OTP — 6-digit one-time codes. Bcrypt-hashed at rest; we never store plain.
// Same module powers email verification, password reset, 2FA login, and owner-dashboard auth.

import { randomInt } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword } from './bcrypt';
import { RateLimits } from './rate-limit';
import type { OtpPurpose } from '@prisma/client';

const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const MAX_ATTEMPTS = 5;                  // verify failures before invalidation

/** Generate, persist, and return the plaintext 6-digit code. Caller emails it. */
export async function issueOtp(opts: {
  email: string;
  userId?: string;
  purpose: OtpPurpose;
  ip?: string;
}): Promise<{ code: string; expiresAt: Date }> {
  // Rate limit issuance — 3 codes per hour per email
  const rl = await RateLimits.passwordReset(opts.email);
  if (!rl.allowed) throw new Error('OTP_RATE_LIMITED');

  // Invalidate any prior un-consumed codes for this (email, purpose) — only one active at a time
  await prisma.emailOtp.updateMany({
    where: { email: opts.email, purpose: opts.purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.emailOtp.create({
    data: {
      email: opts.email.toLowerCase(),
      userId: opts.userId,
      purpose: opts.purpose,
      codeHash,
      expiresAt,
      ip: opts.ip,
    },
  });
  return { code, expiresAt };
}

/** Verify a submitted code. Side effects: increments attempts, consumes on match. */
export async function verifyOtp(opts: {
  email: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ ok: boolean; reason?: 'no_pending' | 'expired' | 'too_many_attempts' | 'bad_code' }> {
  const row = await prisma.emailOtp.findFirst({
    where: {
      email: opts.email.toLowerCase(),
      purpose: opts.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!row)                      return { ok: false, reason: 'no_pending' };
  if (row.expiresAt < new Date()) return { ok: false, reason: 'expired' };
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.emailOtp.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    return { ok: false, reason: 'too_many_attempts' };
  }
  const ok = await verifyPassword(opts.code, row.codeHash);
  if (!ok) {
    await prisma.emailOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: 'bad_code' };
  }
  await prisma.emailOtp.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
