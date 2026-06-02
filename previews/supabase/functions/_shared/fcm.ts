// FCM v1 sender for Supabase Edge Functions (Deno).
// Ported from backend/lib/notifications/fcm.ts. Android + web push.
//
// Required Supabase secret:
//   FCM_SERVICE_ACCOUNT_JSON   the full service-account JSON (string)

import { importPKCS8, SignJWT } from "npm:jose@5";

const SA_RAW = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") || "";

let account:
  | { client_email: string; private_key: string; project_id: string }
  | null = null;
let cachedKey: CryptoKey | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;

function loadAccount() {
  if (account) return account;
  if (!SA_RAW) throw new Error("FCM_SERVICE_ACCOUNT_JSON not set");
  account = JSON.parse(SA_RAW);
  return account!;
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  cachedKey = await importPKCS8(loadAccount().private_key, "RS256");
  return cachedKey;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const acc = loadAccount();
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(acc.client_email)
    .setSubject(acc.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await getKey());

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error("fcm_oauth_failed:" + res.status);
  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export interface FcmInput {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  platform?: "android" | "web";
}

export async function sendFcm(
  input: FcmInput,
): Promise<{ ok: boolean; status?: number; reason?: string }> {
  if (!SA_RAW) return { ok: false, reason: "fcm_not_configured" };
  try {
    const accessToken = await getAccessToken();
    const acc = loadAccount();
    const message: Record<string, unknown> = {
      token: input.deviceToken,
      notification: { title: input.title, body: input.body },
      data: input.data,
    };
    if (input.platform === "android") {
      message.android = {
        priority: "HIGH",
        notification: { sound: "default" },
      };
    } else if (input.platform === "web") {
      message.webpush = { headers: { Urgency: "high" } };
    }

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "authorization": `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        reason: (await res.text()).slice(0, 200),
      };
    }
    return { ok: true, status: 200 };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}
