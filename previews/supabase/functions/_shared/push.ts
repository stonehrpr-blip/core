// Dispatch one message to whatever device tokens a user has registered.
// Tokens are stored RAW in Supabase profiles by the client (core-push.js).
import { sendApns } from "./apns.ts";
import { sendFcm } from "./fcm.ts";

export interface DeviceTokens {
  ios?: string | null;
  android?: string | null;
  web?: string | null;
}
export interface PushMsg {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export async function dispatch(tokens: DeviceTokens, msg: PushMsg) {
  const data: Record<string, string> = { ...(msg.data || {}) };
  if (msg.url) data.url = msg.url;

  const results: Array<{ ok: boolean; reason?: string; channel: string }> = [];
  if (tokens.ios) {
    const r = await sendApns({
      deviceToken: tokens.ios,
      title: msg.title,
      body: msg.body,
      data,
    });
    results.push({ ...r, channel: "ios" });
  }
  if (tokens.android) {
    const r = await sendFcm({
      deviceToken: tokens.android,
      title: msg.title,
      body: msg.body,
      data,
      platform: "android",
    });
    results.push({ ...r, channel: "android" });
  }
  if (tokens.web) {
    const r = await sendFcm({
      deviceToken: tokens.web,
      title: msg.title,
      body: msg.body,
      data,
      platform: "web",
    });
    results.push({ ...r, channel: "web" });
  }
  return { ok: results.some((r) => r.ok), sent: results.length, results };
}
