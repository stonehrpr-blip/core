/*
 * core-config.js — runtime configuration for the CORE preview.
 *
 * This is the ONLY file you have to edit to point the preview at your real
 * Supabase project. Replace the empty strings below with your project's
 * URL and ANON KEY (find them in your Supabase dashboard -> Project Settings
 * -> API).
 *
 * Leave them empty to keep using the localStorage-only "fake backend"
 * (good for design previews and offline demos).
 *
 * The anon key is safe to ship in client-side code — Supabase's Row Level
 * Security policies are what protect the data. Do NOT paste your
 * service_role key here; that bypasses RLS.
 */

window.CORE_CONFIG = {
  SUPABASE_URL: "https://tqjpgknkbfaayrjuwoet.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_JoBIDal2xT5r7od1N85qYg_c7J53tHJ",
  OAUTH_REDIRECT_URL: (location.origin || "http://localhost:8000") + "/04-sign-in.html",
  AI_PROXY_URL: "https://core-ai.stonehrpr.workers.dev",
};

// Convenience flag — true when a real backend is configured.
window.CORE_BACKEND_READY = !!(
  window.CORE_CONFIG.SUPABASE_URL && window.CORE_CONFIG.SUPABASE_ANON_KEY
);
