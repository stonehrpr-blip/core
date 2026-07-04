// Device fingerprint — deterministic hash from request signals + client-supplied
// canvas/audio entropy. Used to bind sessions to a device.
//
// On the client (Phase 4 web app):
//   const fp = await CoreFingerprint.compute();  // canvas+audio+ua+timezone+screen
// Then send `fp` to /api/auth/sign-in as `fingerprint`.
//
// Server-side we hash (clientFp || userAgent || acceptLanguage || country) so
// even if a client spoofs the canvas signal we still pin the session to the UA.

import { createHash } from 'crypto';

export function serverFingerprint(opts: {
  clientFingerprint: string;
  userAgent?: string;
  acceptLanguage?: string;
  country?: string;
}): string {
  const parts = [
    opts.clientFingerprint || '',
    opts.userAgent || '',
    (opts.acceptLanguage || '').split(',')[0],
    opts.country || '',
  ].join('|');
  return createHash('sha256').update(parts).digest('hex');
}

/** Is this fingerprint plausibly the same device as a previous one? */
export function fingerprintMatch(a: string, b: string): boolean {
  return a === b;
}
