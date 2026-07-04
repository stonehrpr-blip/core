// APNs HTTP/2 + JWT (ES256) client.
//
// Apple requires:
//   - A .p8 private key (downloaded from Apple Developer → Keys → APNs key)
//   - The key ID + team ID + topic (bundle ID)
//   - JWT signed with ES256 (P-256 curve, SHA-256 hash), refreshed every hour
//   - HTTP/2 POST to api.push.apple.com:443 (production) or api.sandbox.push.apple.com (dev)
//
// We use `jose` for the JWT (already in deps) and Node's native `http2` for the connection.

import { SignJWT, importPKCS8 } from 'jose';
import { readFileSync } from 'fs';
import { connect, type ClientHttp2Session } from 'http2';

const TOPIC = process.env.APNS_TOPIC || process.env.APPLE_BUNDLE_ID || 'com.harperlinks.core';
const KEY_ID = process.env.APNS_KEY_ID || '';
const TEAM_ID = process.env.APNS_TEAM_ID || '';
const KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH || '';
const HOST = process.env.APNS_HOST || (process.env.NODE_ENV === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com');

let cachedJwt: { token: string; expiresAt: number } | null = null;
let cachedSession: ClientHttp2Session | null = null;
let cachedPrivateKey: any = null;

async function getPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;
  if (!KEY_PATH) throw new Error('APPLE_PRIVATE_KEY_PATH not set');
  const pem = readFileSync(KEY_PATH, 'utf8');
  cachedPrivateKey = await importPKCS8(pem, 'ES256');
  return cachedPrivateKey;
}

async function getApnsJwt(): Promise<string> {
  // Apple requires regenerating the token at least every 60 minutes; max validity = 1 hour
  if (cachedJwt && cachedJwt.expiresAt > Date.now() + 60_000) return cachedJwt.token;
  if (!KEY_ID || !TEAM_ID) throw new Error('APNS_KEY_ID + APNS_TEAM_ID required');
  const key = await getPrivateKey();
  const expiresAt = Date.now() + 55 * 60 * 1000; // 55min — buffer before Apple's 1h limit
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .sign(key);
  cachedJwt = { token, expiresAt };
  return token;
}

function getSession(): ClientHttp2Session {
  if (cachedSession && !cachedSession.closed && !cachedSession.destroyed) return cachedSession;
  cachedSession = connect(HOST);
  cachedSession.on('error', err => { console.error('apns_session_error', err); cachedSession = null; });
  cachedSession.on('goaway', () => { cachedSession = null; });
  return cachedSession;
}

export interface ApnsPayload {
  deviceToken: string;            // hex string (~64 chars)
  alert: { title: string; body: string };
  badge?: number;
  sound?: string;
  category?: string;              // for interactive notifications
  threadId?: string;              // groups notifications
  customData?: Record<string, unknown>;
  pushType?: 'alert' | 'background';
  priority?: 5 | 10;              // 10 = immediate, 5 = power-saving
}

export async function sendApns(payload: ApnsPayload): Promise<{ ok: boolean; reason?: string; statusCode?: number }> {
  if (!KEY_PATH || !KEY_ID || !TEAM_ID) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[apns:dev]', payload.deviceToken.slice(0, 8), payload.alert.title);
      return { ok: true };
    }
    return { ok: false, reason: 'apns_not_configured' };
  }

  const jwt = await getApnsJwt();
  const session = getSession();
  return new Promise((resolve) => {
    const body = JSON.stringify({
      aps: {
        alert: payload.alert,
        badge: payload.badge,
        sound: payload.sound || 'default',
        'thread-id': payload.threadId,
        category: payload.category,
        'content-available': payload.pushType === 'background' ? 1 : undefined,
      },
      ...(payload.customData || {}),
    });
    const req = session.request({
      ':method': 'POST',
      ':path': '/3/device/' + payload.deviceToken,
      'apns-topic': TOPIC,
      'apns-push-type': payload.pushType || 'alert',
      'apns-priority': String(payload.priority || 10),
      'apns-expiration': '0',
      'authorization': `bearer ${jwt}`,
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(body)),
    });
    let status = 0;
    let respBody = '';
    req.on('response', headers => { status = Number(headers[':status'] || 0); });
    req.on('data', chunk => { respBody += chunk; });
    req.on('end', () => {
      req.close();
      if (status === 200) resolve({ ok: true, statusCode: 200 });
      else resolve({ ok: false, statusCode: status, reason: respBody.slice(0, 200) });
    });
    req.on('error', err => resolve({ ok: false, reason: err.message }));
    req.write(body);
    req.end();
  });
}
