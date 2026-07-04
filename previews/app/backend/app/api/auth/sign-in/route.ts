// POST /api/auth/sign-in — email + password.
// Full security stack:
//   - lockout check (AccountLockout)
//   - rate limit (IP + email)
//   - bcrypt-verify password
//   - device fingerprint
//   - suspicious-login detection
//   - issue session, audit-log, analytics

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/bcrypt';
import { RateLimits } from '@/lib/security/rate-limit';
import { isLockedOut, recordFailedLogin, clearFailures } from '@/lib/security/brute-force';
import { serverFingerprint } from '@/lib/security/fingerprint';
import { checkSuspiciousLogin } from '@/lib/security/suspicious-login';
import { issueSession, getRequestContext } from '@/lib/auth/session';
import { track } from '@/lib/analytics/track';
import { userAudit } from '@/lib/security/audit';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fingerprint: z.string().min(8).max(256),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { email, password, fingerprint } = parsed.data;
  const emailLc = email.toLowerCase();
  const ctx = await getRequestContext();

  // 1. Lockout check (account-level)
  const lockout = await isLockedOut(emailLc);
  if (lockout.locked) {
    return NextResponse.json({ error: 'account_locked', unlocksAt: lockout.unlocksAt }, { status: 423 });
  }

  // 2. Rate limit (per IP + per email, both must pass)
  const ipLimit = await RateLimits.login(ctx.ip || 'anon');
  if (!ipLimit.allowed) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
  const emailLimit = await RateLimits.login(emailLc);
  if (!emailLimit.allowed) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });

  // 3. Look up user (constant-time wrt password verify)
  const user = await prisma.user.findUnique({ where: { email: emailLc } });

  // Always run bcrypt even if user not found — prevents email-enumeration timing attack
  const verified = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, '$2a$12$abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuv'); // dummy

  if (!user || !verified) {
    const lock = await recordFailedLogin({ identifier: emailLc, ip: ctx.ip, reason: !user ? 'no_account' : 'bad_password' });
    return NextResponse.json({ error: 'invalid_credentials', ...(lock.locked ? { unlocksAt: lock.unlocksAt } : {}) }, { status: 401 });
  }
  if (user.isBanned) return NextResponse.json({ error: 'account_banned' }, { status: 403 });

  // 4. Compute server-side fingerprint hash
  const fp = serverFingerprint({
    clientFingerprint: fingerprint,
    userAgent: ctx.userAgent,
    country: ctx.country,
  });

  // 5. Issue session
  await issueSession({
    userId: user.id,
    email: user.email,
    tier: user.tier,
    deviceKind: 'WEB',
    fingerprint: fp,
    userAgent: ctx.userAgent,
    ip: ctx.ip,
  });

  // 6. Suspicious login detection — runs AFTER session is issued so the user
  // can still get in; flags are reviewed asynchronously.
  const suspicious = await checkSuspiciousLogin({
    userId: user.id,
    country: ctx.country,
    fingerprint: fp,
    ip: ctx.ip,
  });

  // 7. Clear lockout counters on success
  await clearFailures(emailLc);
  await userAudit({ userId: user.id, event: 'sign_in', ip: ctx.ip, meta: { suspicious: suspicious.flagged, reason: suspicious.reason } });
  await track({ event: 'sign_in', userId: user.id, ip: ctx.ip, ua: ctx.userAgent, country: ctx.country });

  return NextResponse.json({
    user: { id: user.id, handle: user.handle, email: user.email, tier: user.tier, avatarKey: user.avatarKey },
    ...(suspicious.flagged ? { warning: 'suspicious_login', reason: suspicious.reason } : {}),
  });
}
