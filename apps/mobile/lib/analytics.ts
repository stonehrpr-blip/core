/**
 * CORE analytics chokepoint for React Native.
 *
 * Mirrors the API of previews/analytics.js — same event names, same shape.
 * Swap in PostHog/Amplitude/Mixpanel by changing the implementation here once.
 *
 * Usage:
 *   import { coreTrack } from "@/lib/analytics";
 *   coreTrack("screen_view", { screen: "dashboard" });
 *
 * Auto-tracking helpers:
 *   const trackScreen = useCoreScreenView("dashboard");
 */

import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AID_KEY = "coreAid.v1";
let cachedAid: string | null = null;

async function getAid(): Promise<string> {
  if (cachedAid) return cachedAid;
  try {
    const existing = await AsyncStorage.getItem(AID_KEY);
    if (existing) { cachedAid = existing; return existing; }
    const fresh = "a_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    await AsyncStorage.setItem(AID_KEY, fresh);
    cachedAid = fresh;
    return fresh;
  } catch {
    return "a_anon";
  }
}

export type CoreEvent =
  | "screen_view"
  | "trial_step_view"
  | "trial_step_complete"
  | "trial_promise_signed"
  | "trial_started"
  | "trial_exit_intent_shown"
  | "trial_exit_intent_dismissed"
  | "trial_exit_intent_left"
  | "slip_logged"
  | "habit_opened"
  | "stat_opened"
  | "coach_msg_sent"
  | "coach_action_confirmed"
  | "recovery_started"
  | "recovery_completed"
  | "pricing_viewed"
  | "paywall_viewed"
  | "subscription_started"
  | "subscription_cancelled"
  | "referral_link_opened"
  | "referral_claimed"
  | "demo_state_set"
  | "streak_freeze_used"
  | "restore_streak_viewed"
  | "restore_streak_purchased"
  | "restore_streak_dismissed"
  | "checkin_slot_changed"
  // string fallback for one-off events
  | (string & {});

export type CoreProps = Record<string, unknown>;

export async function coreTrack(event: CoreEvent, props?: CoreProps) {
  try {
    const aid = await getAid();
    const payload = {
      ts: Date.now(),
      aid,
      ...props,
    };

    // Single swap-point. Replace this body to ship to real analytics.
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, payload);

    // PostHog.capture(event, payload);
    // mixpanel.track(event, payload);
    // amplitude.track(event, payload);
  } catch {
    /* never let analytics break the app */
  }
}

/**
 * Fires `screen_view` once on mount. Use at the top of every screen component:
 *
 *   export default function Dashboard() {
 *     useCoreScreenView("dashboard");
 *     ...
 *   }
 */
export function useCoreScreenView(screen: string, extraProps?: CoreProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void coreTrack("screen_view", { screen, ...(extraProps || {}) });
  }, [screen]);
}
