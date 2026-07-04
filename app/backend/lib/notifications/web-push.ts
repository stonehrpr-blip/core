// Web Push via VAPID — full RFC 8030 + RFC 8291 implementation.
//
// Setup:
//   1. Generate VAPID keys: `npx web-push generate-vapid-keys`
//   2. Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in env
//   3. Client subscribes via Notification API + serviceWorker.pushManager.subscribe(applicationServerKey)
//
// We delegate the heavy ECDH + AES-GCM payload encryption to the `web-push`
// library, dynamically imported. Production install: `pnpm add web-push`.

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:no-reply@harperlinks.com';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

let webPushLib: any = null;
async function loadLib() {
  if (webPushLib) return webPushLib;
  try {
    webPushLib = await import('web-push');
    webPushLib.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    return webPushLib;
  } catch {
    if (process.env.NODE_ENV === 'production') throw new Error('web-push not installed');
    return null;
  }
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushPayload {
  subscription: WebPushSubscription;
  title: string;
  body: string;
  url?: string;       // open-on-click URL
  badge?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export async function sendWebPush(payload: WebPushPayload): Promise<{ ok: boolean; reason?: string; statusCode?: number }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[web-push:dev]', payload.title);
      return { ok: true };
    }
    return { ok: false, reason: 'vapid_not_configured' };
  }

  const lib = await loadLib();
  if (!lib) return { ok: false, reason: 'web_push_lib_missing' };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    badge: payload.badge,
    icon: payload.icon,
    data: payload.data,
  });
  try {
    await lib.sendNotification(payload.subscription, body, {
      TTL: 60 * 60 * 24, // 24h delivery window
      urgency: 'high',
    });
    return { ok: true, statusCode: 201 };
  } catch (err: any) {
    return { ok: false, statusCode: err.statusCode, reason: err.body?.slice?.(0, 200) || err.message };
  }
}
