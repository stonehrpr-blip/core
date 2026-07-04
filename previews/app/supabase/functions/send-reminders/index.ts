// send-reminders — run by pg_cron every 15 min. Sends the morning (08:30) and
// evening (21:00) check-in nudges at each user's LOCAL time, based on their
// onboarding `checkin` preference and stored timezone.
//
// Fires once per target per day: a target sends only when it lands inside the
// current 15-min cron tick (no dedup table needed if cron runs on the quarter-hour).
import { adminClient, authorized, json } from "../_shared/supabase.ts";
import { dispatch } from "../_shared/push.ts";
import { REMINDER_COPY } from "../_shared/copy.ts";

const TICK_MIN = 15;

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function localMinuteOfDay(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value || "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value || "0");
  return h * 60 + m;
}

Deno.serve(async (req) => {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  const sb = adminClient();
  const { data: rows, error } = await sb
    .from("profiles")
    .select(
      "id, timezone, trial_state, push_token_ios, push_token_android, push_token_web",
    )
    .eq("push_opted_in", true);
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const r of rows || []) {
    const tz = (r as { timezone?: string }).timezone || "UTC";
    const pref =
      ((r as { trial_state?: { checkin?: string } }).trial_state?.checkin) ||
      "both";
    const targets: string[] = [];
    if (pref === "morning" || pref === "both") targets.push("08:30");
    if (pref === "evening" || pref === "both") targets.push("21:00");

    let nowMin: number;
    try {
      nowMin = localMinuteOfDay(tz);
    } catch {
      nowMin = localMinuteOfDay("UTC");
    }

    for (const t of targets) {
      const diff = (((hhmmToMin(t) - nowMin) % 1440) + 1440) % 1440;
      if (diff < TICK_MIN) {
        const copy = t === "08:30"
          ? REMINDER_COPY.morning
          : REMINDER_COPY.evening;
        const res = await dispatch(
          {
            ios: r.push_token_ios,
            android: r.push_token_android,
            web: r.push_token_web,
          },
          { title: copy.title, body: copy.body, url: "20-dashboard.html" },
        );
        if (res.ok) sent++;
      }
    }
  }
  return json({ ok: true, processed: (rows || []).length, sent });
});
