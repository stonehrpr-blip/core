/**
 * Coach chat persistence. Mirrors the previews' behaviour:
 *   - keep the last 30 messages in AsyncStorage
 *   - if the user has been away > idle window (default 4h), start a fresh
 *     session so they don't resume a stale conversation.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ChatMessage } from "./coach";

const HISTORY_KEY = "core.coach.history.v1";
const LAST_ACTIVE_KEY = "core.coach.lastActive.v1";
const MAX_MESSAGES = 30;
const IDLE_RESET_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Load saved messages, or [] if absent, corrupt, or past the idle window. */
export async function loadHistory(): Promise<ChatMessage[]> {
  try {
    const [rawHist, rawActive] = await Promise.all([
      AsyncStorage.getItem(HISTORY_KEY),
      AsyncStorage.getItem(LAST_ACTIVE_KEY),
    ]);

    const lastActive = rawActive ? parseInt(rawActive, 10) : 0;
    if (lastActive && Date.now() - lastActive > IDLE_RESET_MS) {
      // Away too long — fresh session.
      await AsyncStorage.removeItem(HISTORY_KEY);
      return [];
    }

    if (!rawHist) return [];
    const parsed = JSON.parse(rawHist) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatMessage);
  } catch {
    return [];
  }
}

/** Persist the conversation (capped) and bump the activity timestamp. */
export async function saveHistory(messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    await Promise.all([
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)),
      AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())),
    ]);
  } catch {
    // Persistence is best-effort; never block the UI on it.
  }
}

function isChatMessage(v: unknown): v is ChatMessage {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.role === "coach" || m.role === "user") &&
    typeof m.text === "string" &&
    typeof m.ts === "number"
  );
}
