// Service-role Supabase client for Edge Functions (server-side, bypasses RLS).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected into every Edge Function.
import { createClient } from "npm:@supabase/supabase-js@2";

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Shared-secret gate for cron-invoked functions.
export function authorized(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET") || "";
  if (!secret) return true; // no secret configured → open (dev only)
  return req.headers.get("x-cron-secret") === secret;
}
