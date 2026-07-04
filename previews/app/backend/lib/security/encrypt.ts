// AES-256-GCM at-rest encryption for sensitive fields (push tokens, raw card last-4, etc).
// Key: ENCRYPTION_KEY env var, 64 hex chars (= 32 bytes).
//
// Format: base64url( IV (12) || ciphertext || authTag (16) )

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (KEY_HEX && KEY_HEX.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
}
const KEY = KEY_HEX ? Buffer.from(KEY_HEX, 'hex') : null;

export function encrypt(plain: string): string {
  if (!KEY) throw new Error('ENCRYPTION_KEY not set');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64url');
}

export function decrypt(payload: string): string {
  if (!KEY) throw new Error('ENCRYPTION_KEY not set');
  const buf = Buffer.from(payload, 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
