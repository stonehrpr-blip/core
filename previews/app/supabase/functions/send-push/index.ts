// send-push — the engine. POST one notification to a user's devices.
// Body: { userId, title, body, url?, data? }
// Auth: x-cron-secret header (or open if CRON_SECRET unset, dev only).
// Reusable for coach nudges, coin-received, achievement-unlocked, etc.
import { adminClient, authorized, json } from "../_shared/supabase.ts";
import { dispatch } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  let p: {
    userId?: string;
    title?: string;
    body?: string;
    url?: string;
    data?: Record<string, string>;
  };
  try {
    p = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!p.userId || !p.title || !p.body) {
    return json({ error: "userId, title, body required" }, 400);
  }

  const sb = adminClient();
  const { data: prof, error } = await sb
    .from("profiles")
    .select("push_token_ios, push_token_android, push_token_web, push_opted_in")
    .eq("id", p.userId)
    .single();
  if (error || !prof) return json({ error: "profile_not_found" }, 404);
  if (!prof.push_opted_in) return json({ ok: false, reason: "not_opted_in" });

  const result = await dispatch(
    {
      ios: prof.push_token_ios,
      android: prof.push_token_android,
      web: prof.push_token_web,
    },
    { title: p.title, body: p.body, url: p.url, data: p.data },
  );
  return json({ ok: result.ok, sent: result.sent, results: result.results });
});
