/**
 * profile-sync-store — bridges local game state to the Supabase `profiles` row.
 *
 * Mirrors the read/insert/queue pattern of previews/_lib/core-accounts.js:
 *   - hydrate()      → read own profiles row (self-insert if missing), flush queue
 *   - setTitle/etc.  → optimistic local update + debounced push
 *   - pushProgress() → debounced upsert of card fields; on failure, queue for the
 *                      next successful hydrate (offline-safe, no lost writes)
 *
 * Cosmetics (title/frame/class) live here and sync to the matching profiles
 * columns, so equipping a frame on one device shows up on the next.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStateStore, type StatKey } from "@/stores/game-state-store";
import { useFriendsStore } from "@/stores/friends-store";
import { levelFor, corePower } from "@/lib/player-card";
import { DEFAULT_TITLE, DEFAULT_FRAME, DEFAULT_CLASS } from "@/constants/cosmetics";

// The five Core Stats that exist server-side today (public.stats / stat_slug enum).
const STAT_SLUGS: StatKey[] = ["lungs", "brain", "wallet", "willpower", "body"];

// Sixth stat. The previews carry "social", but its slug only lands once migrations
// 0004_stat_slug_social + 0005_social_stat_catalog are applied. Flip this to TRUE
// AFTER applying them — until then, including 'social' would reject the WHOLE
// upsert and break the working 5-stat sync, so it stays off.
const SOCIAL_SYNC_ENABLED = false;

type SyncSlug = StatKey | "social";
type StatRow = { user_id: string; stat_slug: SyncSlug; value: number; level: number };

const statRow = (userId: string, slug: SyncSlug, raw: number): StatRow => {
  const value = Math.max(0, Math.min(100, Math.round(raw)));
  return { user_id: userId, stat_slug: slug, value, level: Math.max(1, Math.floor(value / 10)) };
};

// Rows for public.user_stats from the live game-state. `value` is clamped to the
// table's 0–100 check; `level` is a coarse 1–10 tier so friend cards can show it.
function buildStatRows(userId: string): StatRow[] {
  const stats = useGameStateStore.getState().stats;
  const rows = STAT_SLUGS.map((slug) => statRow(userId, slug, stats[slug] ?? 0));
  if (SOCIAL_SYNC_ENABLED) {
    // Social isn't habit-backed — derive it from the friend graph (matches lib/core-stats).
    rows.push(statRow(userId, "social", useFriendsStore.getState().count() * 4));
  }
  return rows;
}

type CardPatch = {
  display_name: string | null;
  class: string;
  title: string;
  frame: string;
  level: number;
  xp: number;
  streak_days: number;
  power: number;
  last_seen_at: string;
};

type ProfileSyncState = {
  playerId: string | null;
  class: string;
  title: string;
  frame: string;
  hydrated: boolean;
  syncing: boolean;
  // DB-ready patch stashed when a push fails — replayed on next hydrate.
  pendingPatch: CardPatch | null;
  // Core-stat rows stashed when their push fails — replayed on next hydrate.
  pendingStats: StatRow[] | null;

  // derived
  power: () => number;

  // actions
  hydrate: () => Promise<void>;
  setTitle: (t: string) => void;
  setFrame: (f: string) => void;
  setClass: (c: string) => void;
  pushProgress: () => void; // debounced
  pushStats: () => void; // debounced — upserts the 5 Core Stats to user_stats
  reset: () => void;
};

const PUSH_DEBOUNCE_MS = 1500;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let statsTimer: ReturnType<typeof setTimeout> | null = null;
// Subscribe to game-state changes once, lazily, so XP/streak edits trigger a push.
let gameSubInstalled = false;

function buildPatch(get: () => ProfileSyncState): CardPatch {
  const g = useGameStateStore.getState();
  const auth = useAuthStore.getState();
  const friends = useFriendsStore.getState().count();
  const xp = g.xp;
  return {
    display_name: auth.trial.name || auth.displayName || "New user",
    class: get().class,
    title: get().title,
    frame: get().frame,
    level: levelFor(xp),
    xp,
    streak_days: g.streak?.days ?? 0,
    power: corePower({ xp, streakDays: g.streak?.days ?? 0, friends }),
    last_seen_at: new Date().toISOString(),
  };
}

export const useProfileSyncStore = create<ProfileSyncState>()(
  persist(
    (set, get) => ({
      playerId: null,
      class: DEFAULT_CLASS,
      title: DEFAULT_TITLE,
      frame: DEFAULT_FRAME,
      hydrated: false,
      syncing: false,
      pendingPatch: null,
      pendingStats: null,

      power: () => {
        const g = useGameStateStore.getState();
        const friends = useFriendsStore.getState().count();
        return corePower({ xp: g.xp, streakDays: g.streak?.days ?? 0, friends });
      },

      hydrate: async () => {
        const userId = useAuthStore.getState().userId;
        if (!userId) return; // no session yet — sync stays local, no-op

        // Install the game-state subscription once so progress auto-syncs.
        if (!gameSubInstalled) {
          gameSubInstalled = true;
          useGameStateStore.subscribe(() => {
            if (useAuthStore.getState().userId) {
              get().pushProgress();
              get().pushStats();
            }
          });
        }

        try {
          // Replay any queued patch from a previous failed session first.
          const queued = get().pendingPatch;
          if (queued) {
            const { error } = await supabase.from("profiles").update(queued).eq("id", userId);
            if (!error) set({ pendingPatch: null });
          }
          // Replay any queued stat rows from a previous failed session.
          const queuedStats = get().pendingStats;
          if (queuedStats?.length) {
            const { error } = await supabase
              .from("user_stats")
              .upsert(queuedStats, { onConflict: "user_id,stat_slug" });
            if (!error) set({ pendingStats: null });
          }

          let { data, error } = await supabase
            .from("profiles")
            .select("player_id, class, title, frame")
            .eq("id", userId)
            .maybeSingle();

          if (error) {
            console.error("[profile-sync] read failed", error.message);
            return;
          }

          // Self-insert if the row doesn't exist yet (player_id filled by trigger).
          if (!data) {
            const auth = useAuthStore.getState();
            const ins = await supabase
              .from("profiles")
              .insert({
                id: userId,
                display_name: auth.trial.name || auth.displayName || "New user",
              })
              .select("player_id, class, title, frame")
              .single();
            if (ins.error) {
              console.error("[profile-sync] insert failed", ins.error.message);
              return;
            }
            data = ins.data;
          }

          set({
            playerId: data.player_id ?? null,
            class: data.class ?? DEFAULT_CLASS,
            title: data.title ?? DEFAULT_TITLE,
            frame: data.frame ?? DEFAULT_FRAME,
            hydrated: true,
          });

          // Push current local progress + stats up so the freshly-read row reflects reality.
          get().pushProgress();
          get().pushStats();
        } catch (e: any) {
          console.error("[profile-sync] hydrate threw", e?.message ?? e);
        }
      },

      setTitle: (t) => {
        set({ title: t });
        get().pushProgress();
      },
      setFrame: (f) => {
        set({ frame: f });
        get().pushProgress();
      },
      setClass: (c) => {
        set({ class: c });
        get().pushProgress();
      },

      pushProgress: () => {
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(async () => {
          const userId = useAuthStore.getState().userId;
          if (!userId) return;
          const patch = buildPatch(get);
          set({ syncing: true });
          try {
            const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
            if (error) {
              // Don't lose the write — stash it for the next hydrate to replay.
              set({ pendingPatch: patch });
              console.error("[profile-sync] push failed — queued", error.message);
            } else {
              set({ pendingPatch: null });
            }
          } catch (e: any) {
            set({ pendingPatch: patch });
            console.error("[profile-sync] push threw — queued", e?.message ?? e);
          } finally {
            set({ syncing: false });
          }
        }, PUSH_DEBOUNCE_MS);
      },

      pushStats: () => {
        if (statsTimer) clearTimeout(statsTimer);
        statsTimer = setTimeout(async () => {
          const userId = useAuthStore.getState().userId;
          if (!userId) return;
          const rows = buildStatRows(userId);
          try {
            const { error } = await supabase
              .from("user_stats")
              .upsert(rows, { onConflict: "user_id,stat_slug" });
            if (error) {
              // Don't lose the write — stash for the next hydrate to replay.
              set({ pendingStats: rows });
              console.error("[profile-sync] stat push failed — queued", error.message);
            } else {
              set({ pendingStats: null });
            }
          } catch (e: any) {
            set({ pendingStats: rows });
            console.error("[profile-sync] stat push threw — queued", e?.message ?? e);
          }
        }, PUSH_DEBOUNCE_MS);
      },

      reset: () =>
        set({
          playerId: null,
          class: DEFAULT_CLASS,
          title: DEFAULT_TITLE,
          frame: DEFAULT_FRAME,
          hydrated: false,
          syncing: false,
          pendingPatch: null,
          pendingStats: null,
        }),
    }),
    {
      name: "core.profileSync.v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist transient flags.
      partialize: (s) => ({
        playerId: s.playerId,
        class: s.class,
        title: s.title,
        frame: s.frame,
        pendingPatch: s.pendingPatch,
        pendingStats: s.pendingStats,
      }),
    },
  ),
);
