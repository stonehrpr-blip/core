// FCM (Firebase Cloud Messaging) v1 API client — Android + web push fallback.
//
// Setup:
//   1. Firebase console → Project settings → Service accounts → Generate new private key
//   2. Save JSON to /secrets/fcm-service-account.json
//   3. Set FCM_SERVICE_ACCOUNT_JSON_PATH
//
// Auth: OAuth 2.0 access token from the service account JWT (refreshed every ~50min).

import { SignJWT, importPKCS8 } from 'jose';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT_PATH = process.env.FCM_SERVICE_ACCOUNT_JSON_PATH || '';

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedAccount: { client_email: string; private_key: string; project_id: string } | null = null;
let cachedPrivateKey: any = null;

function loadServiceAccount() {
  if (cachedAccount) return cachedAccount;
  if (!SERVICE_ACCOUNT_PATH) throw new Error('FCM_SERVICE_ACCOUNT_JSON_PATH not set');
  cachedAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  return cachedAccount;
}

async function getPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;
  const acc = loadServiceAccount();
  cachedPrivateKey = await importPKCS8(acc!.private_key, 'RS256');
  return cachedPrivateKey;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const acc = loadServiceAccount();
  if (!acc) throw new Error('no service account');
  const key = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(acc.client_email)
    .setSubject(acc.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error('fcm_oauth_failed:' + res.status);
  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export interface FcmPayload {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  platform?: 'android' | 'web';
}

export async function sendFcm(payload: FcmPayload): Promise<{ ok: boolean; reason?: string; statusCode?: number }> {
  if (!SERVICE_ACCOUNT_PATH) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[fcm:dev]', payload.deviceToken.slice(0, 8), payload.title);
      return { ok: true };
    }
    return { ok: false, reason: 'fcm_not_configured' };
  }

  try {
    const accessToken = await getAccessToken();
    const acc = loadServiceAccount();
    const url = `https://fcm.googleapis.com/v1/projects/${acc!.project_id}/messages:send`;
    const message: any = {
      token: payload.deviceToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    };
    if (payload.platform === 'android') {
      message.android = { priority: 'HIGH', notification: { sound: 'default' } };
    } else if (payload.platform === 'web') {
      message.webpush = { headers: { Urgency: 'high' } };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, statusCode: res.status, reason: detail.slice(0, 200) };
    }
    return { ok: true, statusCode: 200 };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}
