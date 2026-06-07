/**
 * Email-OTP auth helpers — RN mirror of previews/_lib/core-accounts.js
 * (signInWithEmailOtp / verifyEmailOtp). signInWithOtp with shouldCreateUser
 * both signs in returning users and creates new accounts on first code.
 */
import { supabase } from "@/lib/supabase";

export async function sendOtp(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string): Promise<{ userId: string }> {
  const clean = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.verifyOtp({
    email: clean,
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("Verification succeeded but no user was returned.");
  return { userId };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
