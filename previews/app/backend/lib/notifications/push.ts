// Push notification dispatcher — APNs (iOS) + FCM (Android) + Web Push.
// Persists a Notification row up front; updates sent/delivered/failed afterward.

import { prisma } from '@/lib/db/prisma';
import { decrypt } from '@/lib/security/encrypt';
import { sendApns } from './apns';
import { sendFcm } from './fcm';
import { sendWebPush } from './web-push';
import type { NotificationKind } from '@prisma/client';

export interface PushPayload {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  url?: string;
  scheduledFor?: Date;
}

export async function sendPush(payload: PushPayload): Promise<{ ok: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      pushTokenIos: true, pushTokenAndroid: true, pushTokenWeb: true,
      pushOptedIn: true, timezone: true, isBanned: true,
    },
  });
  if (!user)               return { ok: false, reason: 'user_not_found' };
  if (user.isBanned)       return { ok: false, reason: 'banned' };
  if (!user.pushOptedIn)   return { ok: false, reason: 'not_opted_in' };

  // Schedule for later → save the Notification with scheduledFor, the cron picks it up
  if (payload.scheduledFor && payload.scheduledFor > new Date()) {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        kind: payload.kind, title: payload.title, body: payload.body,
        meta: payload.meta as any,
        scheduledFor: payload.scheduledFor,
      },
    });
    return { ok: true };
  }

  // Create the Notification row first so we can track delivery analytics
  const notif = await prisma.notification.create({
    data: {
      userId: payload.userId,
      kind: payload.kind, title: payload.title, body: payload.body,
      meta: payload.meta as any,
    },
  });

  const results: Array<{ channel: string; ok: boolean; reason?: string }> = [];

  if (user.pushTokenIos) {
    try {
      const r = await sendApns({
        deviceToken: decrypt(user.pushTokenIos),
        alert: { title: payload.title, body: payload.body },
        threadId: payload.kind.toLowerCase(),
        customData: { url: payload.url, kind: payload.kind, ...payload.meta },
      });
      results.push({ channel: 'ios', ...r });
    } catch (err) { results.push({ channel: 'ios', ok: false, reason: (err as Error).message }); }
  }
  if (user.pushTokenAndroid) {
    try {
      const r = await sendFcm({
        deviceToken: decrypt(user.pushTokenAndroid),
        title: payload.title, body: payload.body,
        data: { url: payload.url || '', kind: payload.kind },
        platform: 'android',
      });
      results.push({ channel: 'android', ...r });
    } catch (err) { results.push({ channel: 'android', ok: false, reason: (err as Error).message }); }
  }
  if (user.pushTokenWeb) {
    try {
      const sub = JSON.parse(decrypt(user.pushTokenWeb));
      const r = await sendWebPush({
        subscription: sub,
        title: payload.title, body: payload.body,
        url: payload.url,
        data: payload.meta,
      });
      results.push({ channel: 'web', ...r });
    } catch (err) { results.push({ channel: 'web', ok: false, reason: (err as Error).message }); }
  }

  const anyOk = results.some(r => r.ok);
  await prisma.notification.update({
    where: { id: notif.id },
    data: {
      sentAt: anyOk ? new Date() : undefined,
      failed: !anyOk,
      failedReason: anyOk ? null : results.map(r => `${r.channel}:${r.reason || 'unknown'}`).join(';'),
    },
  });
  return { ok: anyOk, reason: anyOk ? undefined : 'all_channels_failed' };
}

// ─── Scheduler ─────────────────────────────────────────────────────────────
// Cron runs every minute → picks up Notification rows with scheduledFor <= now
// and sentAt == null, sends them, updates the row.

export async function runScheduler(): Promise<{ sent: number; failed: number }> {
  const due = await prisma.notification.findMany({
    where: {
      scheduledFor: { lte: new Date() },
      sentAt: null,
      failed: false,
    },
    take: 100,
    orderBy: { scheduledFor: 'asc' },
  });
  let sent = 0, failed = 0;
  for (const n of due) {
    const r = await sendPush({
      userId: n.userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      meta: n.meta as any,
    });
    if (r.ok) sent++; else failed++;
  }
  return { sent, failed };
}
