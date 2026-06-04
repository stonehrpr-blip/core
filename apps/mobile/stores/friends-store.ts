/**
 * friends-store — real friends via Supabase.
 *
 * Reads friend cards through the list_friend_cards() RPC and adds friends by
 * player code through lookup_player_by_code() + an insert into the friends table
 * (RLS allows either side to write its own rows). Both RPCs are SECURITY DEFINER
 * because profiles RLS is self-only and blocks cross-user SELECT — see
 * supabase/migrations/0003_profile_game_card.sql.
 */
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import type { FriendCard, PublicCard } from "@/lib/player-card";

export type AddResult =
  | { ok: true; card: PublicCard }
  | { ok: false; reason: string };

type FriendsState = {
  friends: FriendCard[]; // accepted
  pending: FriendCard[]; // pending requests (either direction)
  loading: boolean;

  count: () => number; // accepted count, used by the power formula + card

  refresh: () => Promise<void>;
  addByCode: (code: string) => Promise<AddResult>;
  reset: () => void;
};

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  pending: [],
  loading: false,

  count: () => get().friends.length,

  refresh: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc("list_friend_cards");
      if (error) {
        console.error("[friends] list failed", error.message);
        return;
      }
      const rows = (data ?? []) as FriendCard[];
      set({
        friends: rows.filter((r) => r.status === "accepted"),
        pending: rows.filter((r) => r.status === "pending"),
      });
    } catch (e: any) {
      console.error("[friends] refresh threw", e?.message ?? e);
    } finally {
      set({ loading: false });
    }
  },

  addByCode: async (rawCode) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return { ok: false, reason: "Sign in to add friends." };

    const code = (rawCode || "").trim().toUpperCase();
    if (!code) return { ok: false, reason: "Enter a player ID." };

    try {
      const { data, error } = await supabase.rpc("lookup_player_by_code", { p_code: code });
      if (error) return { ok: false, reason: error.message };

      const card = (Array.isArray(data) ? data[0] : data) as PublicCard | undefined;
      if (!card) return { ok: false, reason: "No player with that ID." };
      if (card.id === userId) return { ok: false, reason: "That's your own ID." };

      const already =
        get().friends.some((f) => f.id === card.id) || get().pending.some((f) => f.id === card.id);
      if (already) return { ok: false, reason: "Already added." };

      const { error: insErr } = await supabase.from("friends").insert({
        user_id: userId,
        friend_id: card.id,
        status: "pending",
        initiated_by: userId,
      });
      if (insErr) return { ok: false, reason: insErr.message };

      await get().refresh();
      return { ok: true, card };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? "Something went wrong." };
    }
  },

  reset: () => set({ friends: [], pending: [], loading: false }),
}));
