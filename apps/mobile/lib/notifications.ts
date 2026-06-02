import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { CoachTone, TrialState } from "@/stores/auth-store";

export type CheckinSlot = "morning" | "evening" | "both" | null;

const TAG_PREFIX = "core.checkin";
const MORNING_HOUR = 8;
const MORNING_MIN = 30;
const EVENING_HOUR = 21;
const EVENING_MIN = 0;

function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  Notifications.setNotificationChannelAsync("core-checkins", {
    name: "Daily check-ins",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    vibrationPattern: [0, 200, 200, 200],
  });
}

async function requestPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  }
  return false;
}

/**
 * Cancel any previously-scheduled CORE check-in notifications.
 * Identified by a TAG_PREFIX on their identifier so we don't nuke unrelated notifs.
 */
export async function clearScheduledCheckins() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => (n.identifier || "").startsWith(TAG_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function copy(slot: "morning" | "evening", tone: CoachTone | null, name: string) {
  const greet = name ? `, ${name}` : "";
  if (slot === "morning") {
    switch (tone) {
      case "gentle":   return { title: `Morning${greet}`, body: "No pressure today. One small honest log when you can." };
      case "balanced": return { title: `Morning${greet}`, body: "Anchor the day in 30 seconds. Log first, decide after." };
      case "direct":   return { title: `Up${greet}.`, body: "Phone open. Log the truth. Then go." };
      case "drill":    return { title: `Up${greet}.`, body: "No snooze. Log. Move." };
      default:         return { title: `Morning${greet}`, body: "One small honest log to anchor the day." };
    }
  }
  // evening
  switch (tone) {
    case "gentle":   return { title: `Evening${greet}`, body: "Soft reflection — how did the day land?" };
    case "balanced": return { title: `Evening${greet}`, body: "Two minutes to log + reflect. That's it." };
    case "direct":   return { title: `Evening${greet}.`, body: "Day's logged or it didn't count. Open CORE." };
    case "drill":    return { title: `Evening${greet}.`, body: "Stand and report. Day. Log. Now." };
    default:         return { title: `Evening${greet}`, body: "Reflect on the day and lock the streak in." };
  }
}

/**
 * Schedule daily morning / evening notifications based on trial.checkin.
 *
 * Returns the identifiers of the scheduled notifications, or null if skipped
 * (permission denied or no checkin slot).
 */
export async function scheduleCheckinsFromTrial(trial: TrialState): Promise<string[] | null> {
  const slot: CheckinSlot = (trial as any).checkin ?? null;
  if (!slot) return null;

  ensureAndroidChannel();
  const ok = await requestPermissions();
  if (!ok) return null;

  await clearScheduledCheckins();

  const ids: string[] = [];
  if (slot === "morning" || slot === "both") {
    const c = copy("morning", trial.tone, trial.name);
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${TAG_PREFIX}.morning`,
      content: { title: c.title, body: c.body, sound: "default" },
      trigger: { hour: MORNING_HOUR, minute: MORNING_MIN, repeats: true },
    });
    ids.push(id);
  }
  if (slot === "evening" || slot === "both") {
    const c = copy("evening", trial.tone, trial.name);
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${TAG_PREFIX}.evening`,
      content: { title: c.title, body: c.body, sound: "default" },
      trigger: { hour: EVENING_HOUR, minute: EVENING_MIN, repeats: true },
    });
    ids.push(id);
  }
  return ids;
}
