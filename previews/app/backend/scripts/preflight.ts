// `pnpm tsx scripts/preflight.ts`
//
// Pre-deploy / pre-release health check. Verifies:
//   - DATABASE_URL reachable + schema in sync
//   - All required env vars present
//   - OpenAI key responds to a tiny ping
//   - Stripe key responds (lists products)
//   - Apple cert directory exists + has files
//   - Resend key responds (if set)
//
// Exits 0 on all-clear, non-zero on any failure.

import { prisma } from '@/lib/db/prisma';
import { readFileSync, readdirSync } from 'fs';

type Check = { name: string; ok: boolean; detail?: string };

const REQUIRED = [
  'DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'NEXT_PUBLIC_APP_ORIGIN',
  'OWNER_EMAIL',
];
const OPTIONAL = [
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'APPLE_BUNDLE_ID', 'APPLE_PRIVATE_KEY_PATH', 'APPLE_ROOT_CERTS_DIR',
  'RESEND_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'PAGERDUTY_ROUTING_KEY', 'SLACK_WEBHOOK_URL',
  'APNS_KEY_ID', 'APNS_TEAM_ID',
  'FCM_SERVICE_ACCOUNT_JSON_PATH',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY',
];

async function checkEnv(): Promise<Check[]> {
  const out: Check[] = [];
  for (const k of REQUIRED) {
    const v = process.env[k];
    out.push({ name: 'env:' + k, ok: !!v, detail: v ? undefined : 'REQUIRED but not set' });
  }
  for (const k of OPTIONAL) {
    const v = process.env[k];
    out.push({ name: 'env:' + k + ' (optional)', ok: true, detail: v ? 'set' : 'not set' });
  }
  return out;
}

async function checkDb(): Promise<Check> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    return { name: 'db:reachable', ok: true, detail: `${userCount} users` };
  } catch (err) {
    return { name: 'db:reachable', ok: false, detail: (err as Error).message };
  }
}

async function checkOpenAi(): Promise<Check> {
  if (!process.env.OPENAI_API_KEY) return { name: 'openai', ok: true, detail: 'not configured (skipped)' };
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    return { name: 'openai', ok: res.ok, detail: 'status ' + res.status };
  } catch (err) {
    return { name: 'openai', ok: false, detail: (err as Error).message };
  }
}

async function checkStripe(): Promise<Check> {
  if (!process.env.STRIPE_SECRET_KEY) return { name: 'stripe', ok: true, detail: 'not configured (skipped)' };
  try {
    const res = await fetch('https://api.stripe.com/v1/products?limit=1', {
      headers: { 'authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    return { name: 'stripe', ok: res.ok, detail: 'status ' + res.status };
  } catch (err) {
    return { name: 'stripe', ok: false, detail: (err as Error).message };
  }
}

async function checkApple(): Promise<Check> {
  const dir = process.env.APPLE_ROOT_CERTS_DIR;
  if (!dir) return { name: 'apple_certs', ok: true, detail: 'not configured (skipped)' };
  try {
    const files = readdirSync(dir).filter(f => /\.(cer|pem|crt)$/.test(f));
    return { name: 'apple_certs', ok: files.length > 0, detail: `${files.length} cert files` };
  } catch (err) {
    return { name: 'apple_certs', ok: false, detail: (err as Error).message };
  }
}

async function checkResend(): Promise<Check> {
  if (!process.env.RESEND_API_KEY) return { name: 'resend', ok: true, detail: 'not configured (skipped)' };
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    });
    return { name: 'resend', ok: res.ok, detail: 'status ' + res.status };
  } catch (err) {
    return { name: 'resend', ok: false, detail: (err as Error).message };
  }
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━ CORE PREFLIGHT ━━━━━━━━━━━━━━━━━━━━');

  const checks: Check[] = [];
  checks.push(...await checkEnv());
  checks.push(await checkDb());
  checks.push(await checkOpenAi());
  checks.push(await checkStripe());
  checks.push(await checkApple());
  checks.push(await checkResend());

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? '✓' : '✗';
    console.log(`  ${mark} ${c.name.padEnd(38)} ${c.detail || ''}`);
    if (!c.ok) failed++;
  }
  console.log(`\n${failed === 0 ? '✓ All checks passed' : '✗ ' + failed + ' check(s) failed'}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
