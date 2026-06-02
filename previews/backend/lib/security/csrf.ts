// Double-submit-cookie CSRF protection.
// On GET we set a CSRF cookie + return the same value in a header.
// On POST/PATCH/DELETE we require the header to match the cookie.
// This blocks cross-origin form submissions even with `credentials: 'include'`.

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { timingSafeEqual } from './bcrypt';

const COOKIE_NAME = 'core_csrf';
const HEADER_NAME = 'x-csrf-token';

export async function issueCsrfToken(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(COOKIE_NAME)?.value;
  if (!token || token.length < 24) {
    token = randomBytes(24).toString('base64url');
    jar.set(COOKIE_NAME, token, {
      // CSRF cookie must be readable by JS so the SPA can set the header
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8h
    });
  }
  return token;
}

export async function verifyCsrf(headerToken: string | null): Promise<boolean> {
  if (!headerToken) return false;
  const jar = await cookies();
  const cookieToken = jar.get(COOKIE_NAME)?.value;
  if (!cookieToken) return false;
  return timingSafeEqual(headerToken, cookieToken);
}

export const CSRF_HEADER_NAME = HEADER_NAME;
