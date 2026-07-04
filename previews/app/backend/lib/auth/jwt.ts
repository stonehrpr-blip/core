// JWT helpers — HS256 with `jose`.
// Access tokens are short-lived (15m) and carry the userId + tier claims.
// Refresh tokens are opaque random strings stored hashed in DeviceSession.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { randomBytes, createHash } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail fast in production. Allow undefined only at build time when env not present.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var is required in production');
  }
}
const secret = new TextEncoder().encode(JWT_SECRET || 'dev-secret-do-not-use-in-prod');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';

export interface AccessClaims extends JWTPayload {
  sub: string;        // userId
  tier: 'FREE' | 'PRO';
  email: string;
}

export async function signAccessToken(claims: Omit<AccessClaims, 'iat' | 'exp'>): Promise<string> {
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .setIssuer('core')
    .setAudience('core-web')
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'core',
      audience: 'core-web',
    });
    return payload as AccessClaims;
  } catch {
    return null;
  }
}

/** Generate a random opaque refresh token + its sha256 hash for storage. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
