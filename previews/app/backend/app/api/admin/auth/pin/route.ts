// POST /api/admin/auth/pin — owner submits email + PIN.
// On success: issues an email OTP (TWO_FA_LOGIN purpose) and emails it.
// Returns 404 to non-owners so the route's existence isn't disclosed.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isOwnerEmail, verifyOwnerPin } from '@/lib/auth/owner';
import { issueOtp } from '@/lib/security/otp';
import { RateLimits } from '@/lib/security/rate-limit';
import { recordFailedLogin, isLockedOut } from '@/lib/security/brute-force';
import { getRequestContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

const Body = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NOT_FOUND();
  const { email, pin } = parsed.data;

  // Stealth — pretend the route doesn't exist if the email isn't the owner.
  // Important: do this BEFORE any DB read so timing attacks can't probe.
  if (!isOwnerEmail(email)) return NOT_FOUND();

  const ctx = await getRequestContext();
  // Lockout check
  const lockout = await isLockedOut(email.toLowerCase());
  if (lockout.locked) return NOT_FOUND();
  // Rate limit
  const rl = await RateLimits.adminPin(email.toLowerCase());
  if (!rl.allowed) return NOT_FOUND();

  const userId = await verifyOwnerPin(email, pin);
  if (!userId) {
    await recordFailedLogin({ identifier: email.toLowerCase(), ip: ctx.ip, reason: 'admin_pin_wrong' });
    return NOT_FOUND();
  }

  // PIN OK → issue OTP and email it via Resend
  const { code, expiresAt } = await issueOtp({
    email: email.toLowerCase(),
    userId,
    purpose: 'OWNER_DASHBOARD',
    ip: ctx.ip,
  });
  const { sendEmail, buildOtpEmail } = await import('@/lib/notifications/email');
  const body = buildOtpEmail({ code, purpose: 'OWNER_DASHBOARD', expiresAt });
  await sendEmail({ to: email, subject: body.subject, html: body.html, text: body.text, tag: 'otp' });

  await prisma.adminLog.create({
    data: { actorId: userId, action: 'LOGIN', meta: { stage: 'pin_verified' } as any, ip: ctx.ip },
  });

  return NextResponse.json({
    ok: true,
    expiresAt,
    message: 'A 6-digit code was emailed to you. Submit it to /api/admin/auth/verify within 10 minutes.',
  });
}
