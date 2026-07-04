// Builds the user-context block injected into every Coach system prompt.
// Kept tight (~300 tokens) — we don't pay to remind the model of irrelevant fields.

import { prisma } from '@/lib/db/prisma';

export async function buildUserContext(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true, tier: true, timezone: true,
      stats: true, xp: true, coins: true,
      doubleXpUntil: true, trialEndsAt: true,
      streak: { select: { days: true, previousDays: true, lostAt: true, freezesAvailable: true } },
      slipLogs: { take: 5, orderBy: { ts: 'desc' }, select: { habit: true, magnitude: true, ts: true } },
      habits: { where: { archivedAt: null }, select: { habitKey: true, displayName: true, startedAt: true } },
    },
  });
  if (!user) return '';

  const lines: string[] = [];
  lines.push(`USER CONTEXT (live):`);
  lines.push(`- Name: ${user.displayName}`);
  lines.push(`- Tier: ${user.tier}`);
  if (user.timezone) lines.push(`- Timezone: ${user.timezone}`);
  if (user.streak) lines.push(`- Current streak: ${user.streak.days} days. Freezes available this week: ${user.streak.freezesAvailable}.`);
  if (user.streak?.lostAt) lines.push(`- Streak last broke: ${user.streak.lostAt.toISOString().slice(0,10)} (previous run was ${user.streak.previousDays} days).`);
  const s = user.stats as Record<string, number>;
  lines.push(`- Stats: Brain ${s.brain}, Lungs ${s.lungs}, Wallet ${s.wallet}, Willpower ${s.willpower}, Body ${s.body}.`);
  if (user.habits.length) {
    lines.push(`- Active habits: ${user.habits.map(h => h.displayName || h.habitKey).join(', ')}.`);
  }
  if (user.slipLogs.length) {
    const recent = user.slipLogs.map(sl => `${sl.habit} (${sl.magnitude}, ${ago(sl.ts)})`).join('; ');
    lines.push(`- Recent slips: ${recent}.`);
  } else {
    lines.push(`- Recent slips: none in last 5.`);
  }
  return lines.join('\n');
}

function ago(d: Date): string {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return Math.floor(diff / 60000) + 'm ago';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}
