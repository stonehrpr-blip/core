// POST /api/admin/auth/verify — owner submits the 6-digit OTP.
// On success: issues the OwnerSession cookie (1h TTL), clears brute-force counters.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isOwnerEmail, issueOwnerSession } from '@/lib/auth/owner';
import { verifyOtp } from '@/lib/security/otp';
import { clearFailures } from '@/lib/security/brute-force';
import { serverFingerprint } from '@/lib/security/fingerprint';
import { getRequestContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

const Body = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  fingerprint: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NOT_FOUND();
  const { email, code, fingerprint } = parsed.data;
  if (!isOwnerEmail(email)) return NOT_FOUND();

  const ctx = await getRequestContext();
  const verify = await verifyOtp({ email: email.toLowerCase(), code, purpose: 'OWNER_DASHBOARD' });
  if (!verify.ok) return NOT_FOUND();

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return NOT_FOUND();

  const fp = serverFingerprint({
    clientFingerprint: fingerprint,
    userAgent: ctx.userAgent,
    country: ctx.country,
  });
  const session = await issueOwnerSession({ userId: user.id, fingerprint: fp, ip: ctx.ip });
  await clearFailures(email.toLowerCase());

  await prisma.adminLog.create({
    data: {
      actorId: user.id,
      action: 'LOGIN',
      meta: { stage: 'otp_verified', expiresAt: session.expiresAt } as any,
      ip: ctx.ip,
    },
  });
  return NextResponse.json({ ok: true, expiresAt: session.expiresAt });
}
