// One-shot setup: writes the owner's bcrypt-hashed PIN to the DB.
// Run after first deploy: `pnpm tsx scripts/setup-owner.ts`
//
// Reads OWNER_EMAIL from env. Prompts for the 6-digit PIN you want to use for the
// admin dashboard. Hashes with bcrypt cost 12, persists to OwnerSecret.

import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/security/bcrypt';
import readline from 'readline';

async function prompt(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, ans => { rl.close(); res(ans.trim()); }));
}

async function main() {
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  if (!email) {
    console.error('OWNER_EMAIL env var required');
    process.exit(1);
  }
  console.log('Setting up owner: ' + email);
  const pin = await prompt('6-digit PIN: ');
  if (!/^\d{6}$/.test(pin)) {
    console.error('PIN must be 6 digits');
    process.exit(1);
  }
  const confirm = await prompt('Confirm PIN: ');
  if (pin !== confirm) {
    console.error('PINs do not match');
    process.exit(1);
  }
  const pinHash = await hashPassword(pin);
  await prisma.ownerSecret.upsert({
    where: { email },
    update: { pinHash, rotatedAt: new Date() },
    create: { email, pinHash, requireOtp: true },
  });
  // Ensure a User row exists for the owner
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      handle: 'stone',
      displayName: 'Stone',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✓ Owner PIN set. You can now sign in to /admin.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
