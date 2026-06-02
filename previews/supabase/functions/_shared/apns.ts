// APNs sender for Supabase Edge Functions (Deno).
// Ported from backend/lib/notifications/apns.ts — Deno fetch speaks HTTP/2 to
// APNs, and `jose` signs the ES256 JWT. Keys come from env secrets (not files).
//
// Required Supabase secrets:
//   APNS_PRIVATE_KEY   the full contents of the .p8 file (PEM, with header/footer)
//   APNS_KEY_ID        Key ID from Apple Developer → Keys
//   APNS_TEAM_ID       your Apple Team ID
//   APNS_TOPIC         bundle id, e.g. com.harperlinks.core
//   APNS_HOST          https://api.push.apple.com (prod) | https://api.sandbox.push.apple.com (dev)

import { importPKCS8, SignJWT } from "npm:jose@5";

const KEY_PEM = Deno.env.get("APNS_PRIVATE_KEY") || "";
const KEY_ID = Deno.env.get("APNS_KEY_ID") || "";
const TEAM_ID = Deno.env.get("APNS_TEAM_ID") || "";
const TOPIC = Deno.env.get("APNS_TOPIC") || "com.harperlinks.core";
const HOST = Deno.env.get("APNS_HOST") || "https://api.sandbox.push.apple.com";

let cachedKey: CryptoKey | null = null;
let cachedJwt: { token: string; expiresAt: number } | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (!KEY_PEM) throw new Error("APNS_PRIVATE_KEY not set");
  cachedKey = await importPKCS8(KEY_PEM, "ES256");
  return cachedKey;
}

async function getJwt(): Promise<string> {
  if (cachedJwt && cachedJwt.expiresAt > Date.now() + 60_000) {
    return cachedJwt.token;
  }
  if (!KEY_ID || !TEAM_ID) {
    throw new Error("APNS_KEY_ID + APNS_TEAM_ID required");
  }
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .sign(await getKey());
  cachedJwt = { token, expiresAt: Date.now() + 55 * 60 * 1000 }; // 55m, < Apple's 1h
  return token;
}

export interface ApnsInput {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendApns(
  input: ApnsInput,
): Promise<{ ok: boolean; status?: number; reason?: string }> {
  if (!KEY_PEM || !KEY_ID || !TEAM_ID) {
    return { ok: false, reason: "apns_not_configured" };
  }
  const jwt = await getJwt();
  const body = JSON.stringify({
    aps: { alert: { title: input.title, body: input.body }, sound: "default" },
    ...(input.data || {}),
  });
  const res = await fetch(`${HOST}/3/device/${input.deviceToken}`, {
    method: "POST",
    headers: {
      "authorization": `bearer ${jwt}`,
      "apns-topic": TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body,
  });
  if (res.status === 200) return { ok: true, status: 200 };
  const detail = await res.text().catch(() => "");
  return { ok: false, status: res.status, reason: detail.slice(0, 200) };
}
