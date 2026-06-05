/**
 * slips-sync-store — persists the raw slip ledger to Supabase so it survives a
 * reinstall, mirroring the hydrate-on-sign-in / write-through-on-mutation pattern
 * of profile-sync-store.ts + friends-store.ts.
 *
 *   hydrate()  → pull this user's slip_logs, restore them into game-state's slip
 *                ledger (non-destructively, no stat re-damage), flush any queued
 *                writes, then push up any local slips the server hasn't seen.
 *   write-through → a one-time subscription to game-state diffs the slips[] array
 *                and upserts new slips to public.slip_logs.
 *
 * IDEMPOTENCY (lane5 step 4): every slip carries a deterministic client key
 * `${ts}:${habit}:${mag}`. slip_logs has a unique(user_id, client_slip_key)
 * index (migration 0007), so re-pushing — on replay, queue flush, or re-sign-in —
 * upserts the same row instead of duplicating it. Same spirit as the timestamp-
 * gated daily decay in game-state-store.ts: derive a stable key from the event
 * and let it no-op on repeat.
 *
 * Core progress (xp / streak / stats) is NOT handled here — profile-sync-store
 * already syncs that to profiles + user_stats. This store only owns the slip
 * EVENTS so the ledger (todayDeltas, history) rebuilds after a wipe.
 *
 * QUESTS / CHESTS: the RN app has no quest or chest model yet (quests are only
 * xpLedger 'quest_*' tags; chests live in previews/28-chest.html). The
 * syncQuestComplete()/syncChestOpen() hooks below are wired to the scaffold
 * tables from 0007 and ready to call, but nothing in RN invokes them yet.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStateStore, type Slip } from "@/stores/game-state-store";
import { slipKey, parseSlipKey, selectUnsynced, applyPushResult } from "@/lib/slip-sync";

// Slip xp hit mirrors game-state logSlip (delta = -mag * 8). slip_logs.xp_lost
// is NOT NULL, so we reconstruct the same value when writing through.
const XP_PER_MAGNITUDE = 8;
const PUSH_DEBOUNCE_MS = 1200;

type SlipRow = {
  user_id: string;
  user_habit_id: string;
  logged_at: string;
  xp_lost: number;
  client_slip_key: string;
  device_local_time: string;
};

type QuestEvent = { questSlug: string; xpAwarded?: number; clientKey?: string };
type ChestEvent = { chestTier: string; rewards?: Record<string, unknown>; clientKey?: string };

type SlipsSyncState = {
  hydrated: boolean;
  syncing: boolean;
  // Client keys already confirmed on the server — write-through skips these.
  syncedKeys: string[];
  // Slips whose push failed — replayed on next hydrate (offline-safe).
  pendingKeys: string[];

  hydrate: () => Promise<void>;
  pushNewSlips: () => void; // debounced
  // Dormant scaffold hooks — safe to call once RN gets quest/chest flows.
  syncQuestComplete: (q: QuestEvent) => Promise<void>;
  syncChestOpen: (c: ChestEvent) => Promise<void>;
  reset: () => void;
};

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let gameSubInstalled = false;
// slug → user_habits.id, rebuilt per session (slip_logs.user_habit_id is a NOT
// NULL FK, so each slipped habit needs a user_habits row first).
const habitIdCache = new Map<string, string>();

/** Ensure a user_habits row exists for this habit slug; returns its id (or null). */
async function ensureUserHabitId(userId: string, slug: string): Promise<string | null> {
  const cached = habitIdCache.get(slug);
  if (cached) return cached;

  const existing = await supabase
    .from("user_habits")
    .select("id")
    .eq("user_id", userId)
    .eq("habit_slug", slug)
    .maybeSingle();
  if (existing.data?.id) {
    habitIdCache.set(slug, existing.data.id);
    return existing.data.id;
  }

  const ins = await supabase
    .from("user_habits")
    .insert({ user_id: userId, habit_slug: slug })
    .select("id")
    .single();
  if (ins.data?.id) {
    habitIdCache.set(slug, ins.data.id);
    return ins.data.id;
  }

  // Lost an insert race (unique user_id+habit_slug) — re-select the winner.
  const retry = await supabase
    .from("user_habits")
    .select("id")
    .eq("user_id", userId)
    .eq("habit_slug", slug)
    .maybeSingle();
  if (retry.data?.id) {
    habitIdCache.set(slug, retry.data.id);
    return retry.data.id;
  }
  // habit_slug not in the seeded catalog (FK reject) or RLS issue — skip it
  // rather than wedging the whole flush.
  console.error("[slips-sync] could not resolve user_habit for", slug, ins.error?.message);
  return null;
}

/** Build slip_logs rows for the given slips, creating user_habits as needed. */
async function buildSlipRows(userId: string, slips: Slip[]): Promise<SlipRow[]> {
  const rows: SlipRow[] = [];
  for (const s of slips) {
    const habitId = await ensureUserHabitId(userId, s.habit);
    if (!habitId) continue;
    rows.push({
      user_id: userId,
      user_habit_id: habitId,
      logged_at: new Date(s.ts).toISOString(),
      xp_lost: Math.round(s.magnitude * XP_PER_MAGNITUDE),
      client_slip_key: slipKey(s),
      device_local_time: new Date(s.ts).toString(),
    });
  }
  return rows;
}

export const useSlipsSyncStore = create<SlipsSyncState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      syncing: false,
      syncedKeys: [],
      pendingKeys: [],

      hydrate: async () => {
        const userId = useAuthStore.getState().userId;
        if (!userId) return; // no session — stays local, no-op

        // Install the game-state subscription once so new slips auto-push.
        if (!gameSubInstalled) {
          gameSubInstalled = true;
          let lastCount = useGameStateStore.getState().slips.length;
          useGameStateStore.subscribe((state) => {
            const n = state.slips.length;
            if (n !== lastCount) {
              lastCount = n;
              if (useAuthStore.getState().userId) get().pushNewSlips();
            }
          });
        }

        try {
          // 1. Pull remote slip ledger and restore it locally (no stat re-damage).
          const { data, error } = await supabase
            .from("slip_logs")
            .select("client_slip_key")
            .eq("user_id", userId)
            .not("client_slip_key", "is", null)
            .order("logged_at", { ascending: false })
            .limit(500);
          if (error) {
            console.error("[slips-sync] read failed", error.message);
          } else {
            const remote = (data ?? [])
              .map((r: { client_slip_key: string | null }) => r.client_slip_key)
              .filter((k): k is string => !!k);
            const restored = remote
              .map(parseSlipKey)
              .filter((s): s is Slip => !!s);
            if (restored.length) useGameStateStore.getState().mergeRemoteSlips(restored);
            // Anything on the server is, by definition, already synced.
            set((s) => ({ syncedKeys: Array.from(new Set([...s.syncedKeys, ...remote])) }));
          }

          // 2. Push up any local slips the server hasn't confirmed (incl. queue).
          get().pushNewSlips();
          set({ hydrated: true });
        } catch (e: any) {
          console.error("[slips-sync] hydrate threw", e?.message ?? e);
        }
      },

      pushNewSlips: () => {
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(async () => {
          const userId = useAuthStore.getState().userId;
          if (!userId) return;

          const unsynced = selectUnsynced(
            useGameStateStore.getState().slips,
            get().syncedKeys,
          );
          if (!unsynced.length) return;

          set({ syncing: true });
          try {
            const rows = await buildSlipRows(userId, unsynced);
            if (!rows.length) return;
            const { error } = await supabase
              .from("slip_logs")
              .upsert(rows, { onConflict: "user_id,client_slip_key", ignoreDuplicates: true });
            const keys = rows.map((r) => r.client_slip_key);
            // ok=false queues the keys for the next hydrate to replay; ok=true
            // graduates them to syncedKeys (idempotent — re-push is a no-op).
            set((s) => applyPushResult(s, keys, !error));
            if (error) console.error("[slips-sync] push failed — queued", error.message);
          } catch (e: any) {
            console.error("[slips-sync] push threw", e?.message ?? e);
          } finally {
            set({ syncing: false });
          }
        }, PUSH_DEBOUNCE_MS);
      },

      // --- Scaffold hooks (lane5 step 2/3) — not yet invoked by any RN screen ---
      syncQuestComplete: async ({ questSlug, xpAwarded = 0, clientKey }) => {
        const userId = useAuthStore.getState().userId;
        if (!userId) return;
        try {
          const { error } = await supabase.from("user_quests").upsert(
            {
              user_id: userId,
              quest_slug: questSlug,
              status: "completed",
              xp_awarded: xpAwarded,
              client_quest_key: clientKey ?? null,
            },
            { onConflict: "user_id,client_quest_key", ignoreDuplicates: true },
          );
          if (error) console.error("[slips-sync] quest sync failed", error.message);
        } catch (e: any) {
          console.error("[slips-sync] quest sync threw", e?.message ?? e);
        }
      },

      // TRADEOFF (lane5 step 3): reward is client-rolled and logged here, which is
      // tamperable. Acceptable until chests are real in RN — then move the roll to
      // a SECURITY DEFINER rpc / edge function and have it write this row instead.
      syncChestOpen: async ({ chestTier, rewards = {}, clientKey }) => {
        const userId = useAuthStore.getState().userId;
        if (!userId) return;
        try {
          const { error } = await supabase.from("chest_opens").upsert(
            {
              user_id: userId,
              chest_tier: chestTier,
              rewards,
              client_open_key: clientKey ?? null,
            },
            { onConflict: "user_id,client_open_key", ignoreDuplicates: true },
          );
          if (error) console.error("[slips-sync] chest sync failed", error.message);
        } catch (e: any) {
          console.error("[slips-sync] chest sync threw", e?.message ?? e);
        }
      },

      reset: () => {
        habitIdCache.clear();
        set({ hydrated: false, syncing: false });
        // Keep syncedKeys/pendingKeys: they're device-local bookkeeping and the
        // unique index makes a re-push harmless anyway.
      },
    }),
    {
      name: "core.slipsSync.v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ syncedKeys: s.syncedKeys, pendingKeys: s.pendingKeys }),
    },
  ),
);
