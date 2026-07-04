// Suspicious login detection — runs after a successful auth.
// Flags:
//   - new country (user has never signed in from this country)
//   - new device fingerprint (no prior DeviceSession matches)
//   - impossible travel (>800km from last session in <1h)
//   - too many active devices (>10)
//
// On flag: log to SuspiciousLogin + queue an email notification to the user.

import { prisma } from '@/lib/db/prisma';

interface CheckInput {
  userId: string;
  country?: string;
  fingerprint: string;
  ip?: string;
  // Optional approx lat/lon — derived from IP geolocation service in real flow
  lat?: number;
  lon?: number;
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export async function checkSuspiciousLogin(input: CheckInput): Promise<{ flagged: boolean; reason?: string }> {
  const sessions = await prisma.deviceSession.findMany({
    where: { userId: input.userId, revokedAt: null },
    orderBy: { lastUsedAt: 'desc' },
    take: 20,
  });

  // 1. Too many active devices
  if (sessions.length > 10) {
    await flag(input, 'too_many_devices', { activeCount: sessions.length });
    return { flagged: true, reason: 'too_many_devices' };
  }

  // 2. New country
  if (input.country) {
    const seen = sessions.some(s => s.country === input.country);
    if (!seen && sessions.length > 0) {
      await flag(input, 'new_country', { newCountry: input.country });
      return { flagged: true, reason: 'new_country' };
    }
  }

  // 3. New device fingerprint
  if (input.fingerprint) {
    const seen = sessions.some(s => s.fingerprint === input.fingerprint);
    if (!seen && sessions.length > 0) {
      await flag(input, 'new_device', { fingerprint: input.fingerprint });
      return { flagged: true, reason: 'new_device' };
    }
  }

  // 4. Impossible travel (requires lat/lon from a future GeoIP integration)
  if (input.lat != null && input.lon != null) {
    // Look up last session's geo from a separate table in production
    // (omitted here — Phase 4 dedicated GeoIP integration)
  }

  return { flagged: false };
}

async function flag(input: CheckInput, reason: string, detail: object) {
  await prisma.suspiciousLogin.create({
    data: {
      userId: input.userId,
      reason,
      fromIp: input.ip,
      fromCountry: input.country,
      fingerprint: input.fingerprint,
      detail: detail as any,
    },
  });
  // TODO Phase 9: queue an email + push notification to the user ("New sign-in from …")
}
