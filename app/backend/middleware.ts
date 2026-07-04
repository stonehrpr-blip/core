// Edge middleware — runs before every request.
// Purpose:
//   1. Block obviously malformed traffic
//   2. Pre-verify JWT access tokens (no DB hit) so /api routes can trust req
//   3. Strip caching from /api responses
//
// Heavier rate-limiting + DB checks happen inside the route handlers (Node runtime).
//
// Note: middleware runs on Edge runtime — no Node APIs (no Prisma, no bcrypt).

import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

const PUBLIC_ROUTES = new Set<string>([
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/refresh',
  '/api/auth/forgot',
  '/api/stripe/webhook',
  '/api/storekit/notification',
  '/api/health',
]);

// Admin auth endpoints — accessible without a regular user JWT, but each route
// internally checks the owner email + returns 404 to non-owners. The middleware
// just lets them through; the routes themselves do the stealth-404.
const ADMIN_PUBLIC_ROUTES = new Set<string>([
  '/api/admin/auth/pin',
  '/api/admin/auth/verify',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass non-API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  if (ADMIN_PUBLIC_ROUTES.has(pathname)) return NextResponse.next();

  // Stealth 404 for all other /api/admin/* if no owner cookie present.
  // The route itself does the full check; middleware just removes the
  // "401 Unauthorized" signal which would leak the route's existence.
  if (pathname.startsWith('/api/admin/')) {
    const ownerCookie = req.cookies.get('core_owner')?.value;
    if (!ownerCookie) {
      return new NextResponse('Not Found', { status: 404 });
    }
    // Cookie present — let the route do the real validation (it may also 404)
    return NextResponse.next();
  }

  // Verify access token from cookie
  const at = req.cookies.get('core_at')?.value;
  if (!at) return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
  const claims = await verifyAccessToken(at);
  if (!claims) return new NextResponse(JSON.stringify({ error: 'invalid_token' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

  // Stamp the verified userId into a request header so route handlers can read it
  const res = NextResponse.next();
  res.headers.set('x-core-user-id', claims.sub);
  res.headers.set('x-core-user-tier', claims.tier);
  res.headers.set('cache-control', 'no-store, must-revalidate');
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
