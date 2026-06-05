/**
 * Supabase session wiring. This is the single place that populates
 * auth-store.userId from a real Supabase session — without it the app stays
 * 100% local and nothing syncs.
 *
 * initAuth() runs once at app root (app/_layout.tsx). It reads any persisted
 * session, mirrors it into auth-store, and registers an onAuthStateChange
 * listener so sign-in / sign-out / token-refresh keep the store + sync stores
 * in step.
 */
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useProfileSyncStore } from "@/stores/profile-sync-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useSlipsSyncStore } from "@/stores/slips-sync-store";

let installed = false;

function onSignedIn(userId: string, displayName: string | null) {
  useAuthStore.getState().setUser(userId, displayName);
  // Hydrate the profile card + friends + slip ledger now that we have a session.
  useProfileSyncStore.getState().hydrate();
  useFriendsStore.getState().refresh();
  useSlipsSyncStore.getState().hydrate();
}

function onSignedOut() {
  // Keep local game state; just clear the synced identity layer.
  useProfileSyncStore.getState().reset();
  useFriendsStore.getState().reset();
  useSlipsSyncStore.getState().reset();
  useAuthStore.setState({ userId: null });
}

/** Idempotent. Returns once the initial session check has resolved. */
export async function initAuth(): Promise<void> {
  if (installed) return;
  installed = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const name =
        (session.user.user_metadata?.name as string | undefined) ??
        (session.user.email ? session.user.email.split("@")[0] : null);
      onSignedIn(session.user.id, name ?? null);
    } else if (event === "SIGNED_OUT") {
      onSignedOut();
    }
  });

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const u = data.session.user;
      const name =
        (u.user_metadata?.name as string | undefined) ?? (u.email ? u.email.split("@")[0] : null);
      onSignedIn(u.id, name ?? null);
    }
  } catch (e: any) {
    console.error("[auth-session] getSession failed", e?.message ?? e);
  }
}
