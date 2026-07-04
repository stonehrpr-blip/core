// Owner authentication — protects the /admin route.
//
// Flow:
//   1. Owner POSTs email + PIN to /api/admin/auth/pin
//      - Verify email matches OWNER_EMAIL env
//      - bcrypt-verify PIN against OwnerSecret.pinHash
//      - Issue email OTP (TWO_FA_LOGIN), email it to OWNER_EMAIL
//   2. Owner POSTs OTP to /api/admin/auth/verify
//      - Verify OTP, create OwnerSession (separate from regular user session)
//      - Return short-lived cookie `core_owner` (1h TTL)
//   3. Every /api/admin/* request checks core_owner cookie
//   4. Non-owner visitors hitting /api/admin/* get a 404 (route stealth)

import { cookies, headers } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/bcrypt';

const OWNER_COOKIE = 'core_owner';
const OWNER_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isOwnerEmail(email: string): boolean {
  const owner = (process.env.OWNER_EMAIL || '').toLowerCase();
  return !!owner && owner === email.toLowerCase();
}

/** Verify the owner's PIN. Returns userId (the owner's User.id) on success. */
export async function verifyOwnerPin(email: string, pin: string): Promise<string | null> {
  if (!isOwnerEmail(email)) return null;
  const secret = await prisma.ownerSecret.findUnique({ where: { email: email.toLowerCase() } });
  if (!secret) return null;
  const ok = await verifyPassword(pin, secret.pinHash);
  if (!ok) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return user?.id || null;
}

/** Create an OwnerSession and set the cookie. Called after PIN + OTP both verified. */
export async function issueOwnerSession(opts: {
  userId: string;
  fingerprint: string;
  ip?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + OWNER_SESSION_TTL_MS);
  await prisma.ownerSession.create({
    data: {
      userId: opts.userId,
      refreshHash: hashToken(token),
      fingerprint: opts.fingerprint,
      ip: opts.ip,
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // owner cookie is stricter than regular session
    path: '/',
    maxAge: OWNER_SESSION_TTL_MS / 1000,
  });
  return { token, expiresAt };
}

/** Check the owner cookie on a request. Returns the owner User.id or null. */
export async function getOwnerSession(): Promise<{ userId: string } | null> {
  const jar = await cookies();
  const token = jar.get(OWNER_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.ownerSession.findUnique({
    where: { refreshHash: hashToken(token) },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  return { userId: session.userId };
}

export async function revokeOwnerSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(OWNER_COOKIE)?.value;
  if (token) {
    await prisma.ownerSession.updateMany({
      where: { refreshHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(OWNER_COOKIE);
}

/** Throws if not the owner. Use at the top of /api/admin/* route handlers. */
export async function requireOwner(): Promise<string> {
  const s = await getOwnerSession();
  if (!s) throw new Error('NOT_OWNER');
  return s.userId;
}
