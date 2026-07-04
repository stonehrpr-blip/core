// send-offers — run by pg_cron once daily. Segment-based offers/win-back.
//
// Segments (from columns the app already writes):
//   trial-ending : completed_trial_at ~6 days ago (7-day trial → ends tomorrow)
//   win-back     : last_seen_at exactly 7 or 14 days ago
//
// NOTE: this fires by "days since" heuristics so it sends at most once on each
// boundary day. For production, add a `last_offer_sent` column to suppress
// repeats if the daily job runs more than once.
import { adminClient, authorized, json } from "../_shared/supabase.ts";
import { dispatch } from "../_shared/push.ts";
import { OFFER_COPY } from "../_shared/copy.ts";

const DAY = 86_400_000;
function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

Deno.serve(async (req) => {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  const sb = adminClient();
  const { data: rows, error } = await sb
    .from("profiles")
    .select(
      "id, completed_trial_at, last_seen_at, trial_state, push_token_ios, push_token_android, push_token_web",
    )
    .eq("push_opted_in", true);
  if (error) return json({ error: error.message }, 500);

  const counts = { trialEnding: 0, winBack: 0 };
  for (const r of rows || []) {
    const tokens = {
      ios: r.push_token_ios,
      android: r.push_token_android,
      web: r.push_token_web,
    };
    const trialDays = daysAgo(
      (r as { completed_trial_at?: string }).completed_trial_at || null,
    );
    const seenDays = daysAgo(
      (r as { last_seen_at?: string }).last_seen_at || null,
    );

    // Trial ending tomorrow (7-day trial, started ~6 days ago)
    if (trialDays === 6) {
      const res = await dispatch(tokens, {
        ...OFFER_COPY.trialEnding,
        url: "76-pricing.html",
      });
      if (res.ok) counts.trialEnding++;
      continue; // don't also win-back the same user the same day
    }

    // Win-back at the 7 and 14 day marks of inactivity
    if (seenDays === 7) {
      const res = await dispatch(tokens, {
        ...OFFER_COPY.winBack7,
        url: "20-dashboard.html",
      });
      if (res.ok) counts.winBack++;
    } else if (seenDays === 14) {
      const res = await dispatch(tokens, {
        ...OFFER_COPY.winBack14,
        url: "20-dashboard.html",
      });
      if (res.ok) counts.winBack++;
    }
  }
  return json({ ok: true, processed: (rows || []).length, ...counts });
});
