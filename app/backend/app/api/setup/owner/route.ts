// POST /api/setup/owner — one-shot HTTP endpoint to set the owner PIN.
// Gated by SETUP_BOOTSTRAP_TOKEN env var. Run once after first deploy.
//
// Why this exists: Vercel doesn't give you SSH or a CLI. The dev-machine
// `pnpm tsx scripts/setup-owner.ts` requires direct DB access. This endpoint
// lets you set the owner PIN from any browser by hitting the deployed app
// with the bootstrap token in the body.
//
// After first use: set OWNER_SETUP_LOCKED=1 in env to permanently disable.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, timingSafeEqual } from '@/lib/security/bcrypt';
import { adminAudit } from '@/lib/security/audit';
import { getRequestContext } from '@/lib/auth/session';

const Body = z.object({
  bootstrapToken: z.string().min(32),
  email: z.string().email(),
  pin: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  // Permanently locked?
  if (process.env.OWNER_SETUP_LOCKED === '1') {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Optional IP allowlist — comma-separated CIDR-less IP list in env
  // SETUP_ALLOWED_IPS="203.0.113.5,198.51.100.42"
  const allowed = (process.env.SETUP_ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0) {
    const ctx = await getRequestContext();
    const callerIp = ctx.ip || '';
    if (!callerIp || !allowed.includes(callerIp)) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse('Not Found', { status: 404 });

  const expected = process.env.SETUP_BOOTSTRAP_TOKEN || '';
  if (!expected || !timingSafeEqual(parsed.data.bootstrapToken, expected)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const email = parsed.data.email.toLowerCase();
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
  if (!ownerEmail || ownerEmail !== email) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const ctx = await getRequestContext();
  const pinHash = await hashPassword(parsed.data.pin);

  // Ensure a User exists for the owner
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      handle: 'stone',
      displayName: 'Stone',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.ownerSecret.upsert({
    where: { email },
    update: { pinHash, rotatedAt: new Date() },
    create: { email, pinHash, requireOtp: true },
  });

  await adminAudit({
    actorId: user.id,
    action: 'PIN_CHANGED',
    meta: { via: 'bootstrap_endpoint' },
    ip: ctx.ip,
  });

  return NextResponse.json({
    ok: true,
    message: 'Owner PIN set. Now go set OWNER_SETUP_LOCKED=1 in your env so this endpoint disables forever.',
  });
}
