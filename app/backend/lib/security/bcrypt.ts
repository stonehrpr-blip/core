// Password + PIN hashing.
// bcryptjs is pure-JS (no native build step) which keeps Vercel/serverless cold-start fast.

import bcrypt from 'bcryptjs';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return await bcrypt.compare(plain, hash);
}

/** Constant-time comparison for tokens/secrets. Use for HMACs, CSRF, API keys. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
