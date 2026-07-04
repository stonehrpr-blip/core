// Session helpers — manages auth + refresh cookies, device sessions, and
// the active-request user context.

import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  type AccessClaims,
} from './jwt';
import type { Tier, DeviceKind } from '@prisma/client';

const ACCESS_COOKIE = 'core_at';
const REFRESH_COOKIE = 'core_rt';

const ACCESS_MAX_AGE = 60 * 15;            // 15 min
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function issueSession(opts: {
  userId: string;
  email: string;
  tier: Tier;
  deviceKind: DeviceKind;
  fingerprint: string;
  userAgent?: string;
  ip?: string;
}) {
  const access = await signAccessToken({ sub: opts.userId, tier: opts.tier as 'FREE' | 'PRO', email: opts.email });
  const refresh = generateRefreshToken();

  await prisma.deviceSession.create({
    data: {
      userId: opts.userId,
      refreshTokenHash: refresh.hash,
      deviceKind: opts.deviceKind,
      fingerprint: opts.fingerprint,
      userAgent: opts.userAgent,
      ip: opts.ip,
      expiresAt: new Date(Date.now() + REFRESH_MAX_AGE * 1000),
    },
  });

  const jar = await cookies();
  jar.set(ACCESS_COOKIE,  access,        { ...cookieOpts, maxAge: ACCESS_MAX_AGE });
  jar.set(REFRESH_COOKIE, refresh.token, { ...cookieOpts, maxAge: REFRESH_MAX_AGE });

  return { access, refresh: refresh.token };
}

/** Returns the active user's claims or null. Tries access token first, then refresh-rotates. */
export async function getCurrentUser(): Promise<AccessClaims | null> {
  const jar = await cookies();
  const at = jar.get(ACCESS_COOKIE)?.value;
  if (at) {
    const claims = await verifyAccessToken(at);
    if (claims) return claims;
  }
  // Try refresh rotation
  const rt = jar.get(REFRESH_COOKIE)?.value;
  if (!rt) return null;
  const session = await prisma.deviceSession.findUnique({
    where: { refreshTokenHash: hashRefreshToken(rt) },
    include: { user: { select: { id: true, email: true, tier: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  // Rotate the access token (and bump the session's lastUsedAt)
  await prisma.deviceSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });
  const access = await signAccessToken({
    sub: session.user.id,
    email: session.user.email,
    tier: session.user.tier as 'FREE' | 'PRO',
  });
  jar.set(ACCESS_COOKIE, access, { ...cookieOpts, maxAge: ACCESS_MAX_AGE });
  return { sub: session.user.id, email: session.user.email, tier: session.user.tier as 'FREE' | 'PRO' };
}

/** Revoke a single session (sign out one device) */
export async function revokeSession(refreshToken: string, reason?: string) {
  await prisma.deviceSession.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

/** Sign out — clears cookies + revokes the device session */
export async function signOut() {
  const jar = await cookies();
  const rt = jar.get(REFRESH_COOKIE)?.value;
  if (rt) await revokeSession(rt, 'user_signed_out');
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** Sign out every device for the user (e.g. after password reset) */
export async function signOutEverywhere(userId: string) {
  await prisma.deviceSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'sign_out_everywhere' },
  });
}

/** Extract IP + UA from incoming headers (works behind Vercel/Cloudflare) */
export async function getRequestContext() {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') || h.get('x-real-ip') || '').split(',')[0].trim() || undefined;
  const userAgent = h.get('user-agent') || undefined;
  const country = h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || undefined;
  return { ip, userAgent, country };
}
