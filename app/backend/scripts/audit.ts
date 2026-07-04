// `pnpm tsx scripts/audit.ts` — one-shot daily security review.
// Prints:
//   - failed-login counts in last 24h (top 10 by identifier)
//   - suspicious-login flags pending review
//   - any active account lockouts
//   - any user with refundCount > 5 (potential abuse)
//   - active OwnerSessions
// No mutations — read-only.

import { prisma } from '@/lib/db/prisma';

const ONE_DAY = 24 * 60 * 60 * 1000;

function row(label: string, value: string | number) {
  console.log(`  ${label.padEnd(38)} ${String(value)}`);
}

function section(title: string) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('━'.repeat(60));
}

async function main() {
  const since = new Date(Date.now() - ONE_DAY);

  section('FAILED LOGINS · last 24h');
  const failures = await prisma.failedLogin.groupBy({
    by: ['identifier'],
    where: { ts: { gte: since } },
    _count: { identifier: true },
    orderBy: { _count: { identifier: 'desc' } },
    take: 10,
  });
  if (failures.length === 0) row('clean', 'no failed logins');
  else failures.forEach(f => row(f.identifier, `${f._count.identifier} attempts`));

  section('ACCOUNT LOCKOUTS · active');
  const locks = await prisma.accountLockout.findMany({
    where: { unlocksAt: { gt: new Date() } },
    orderBy: { unlocksAt: 'desc' },
  });
  if (locks.length === 0) row('clean', 'no active lockouts');
  else locks.forEach(l => row(l.identifier, `unlocks at ${l.unlocksAt.toISOString()}`));

  section('SUSPICIOUS LOGINS · pending review');
  const flags = await prisma.suspiciousLogin.findMany({
    where: { resolvedAt: null, createdAt: { gte: new Date(Date.now() - 7 * ONE_DAY) } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  if (flags.length === 0) row('clean', 'no pending flags');
  else flags.forEach(f => row(`${f.userId} · ${f.reason}`, `${f.fromCountry || '?'} · ${f.fromIp || '?'}`));

  section('HIGH-REFUND USERS · > 5 refunds');
  const refunders = await prisma.user.findMany({
    where: { refundCount: { gt: 5 } },
    select: { id: true, email: true, refundCount: true },
    orderBy: { refundCount: 'desc' },
    take: 20,
  });
  if (refunders.length === 0) row('clean', 'no high-refund users');
  else refunders.forEach(u => row(u.email, `${u.refundCount} refunds`));

  section('ACTIVE OWNER SESSIONS');
  const sessions = await prisma.ownerSession.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (sessions.length === 0) row('clean', 'no active owner sessions');
  else sessions.forEach(s => row(`${s.userId.slice(0, 10)}...`, `ip ${s.ip} · exp ${s.expiresAt.toISOString()}`));

  section('OTP CODES · pending');
  const otps = await prisma.emailOtp.count({
    where: { consumedAt: null, expiresAt: { gt: new Date() } },
  });
  row('un-consumed', `${otps} pending`);

  console.log('\n✓ audit complete\n');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
