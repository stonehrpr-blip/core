// POST /api/storekit/notification — Apple App Store Server Notifications V2.
// Phase 5 production: full JWS cert-chain verification via
// @apple/app-store-server-library, replay protection via notificationUUID dedupe.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAppleNotification, applyAppleNotification } from '@/lib/billing/apple';
import { track } from '@/lib/analytics/track';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { signedPayload?: string } | null;
  if (!body?.signedPayload) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  // Step 1 — verify the envelope JWS (cert chain check)
  let payload;
  try {
    payload = await verifyAppleNotification(body.signedPayload);
  } catch (err) {
    await track({ event: 'apple_notification_verify_failed', meta: { reason: (err as Error).message } });
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 });
  }

  if (payload.notificationType === 'TEST') {
    return NextResponse.json({ received: true, test: true });
  }

  // Step 2 — replay protection. Apple retries on network failures and the
  // same notificationUUID can land twice concurrently. The previous code did
  // findFirst-then-create which has a check/insert race window — two parallel
  // deliveries could both pass the lookup and both invoke applyAppleNotification,
  // double-billing the user. We now rely on the (provider, externalId) unique
  // constraint on ProcessedWebhook: whichever request lands first wins, all
  // others get P2002 and short-circuit.
  if (payload.notificationUUID) {
    try {
      await prisma.processedWebhook.create({
        data: {
          provider: 'apple_storekit',
          externalId: payload.notificationUUID,
          kind: payload.notificationType,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        await track({ event: 'apple_notification_duplicate', meta: { uuid: payload.notificationUUID } });
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw err;
    }
  }

  // Step 3 — apply effect to our DB
  try {
    const result = await applyAppleNotification(payload);
    await track({
      event: 'apple_notification',
      meta: {
        type: payload.notificationType,
        subtype: payload.subtype,
        env: payload.data?.environment,
        ok: result.ok,
        reason: result.reason,
      },
    });
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error('storekit_notification_error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
