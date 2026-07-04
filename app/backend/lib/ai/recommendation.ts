// Recommendation engine — generates 1-3 nudges per user per day.
//
// Inputs: user state (stats, streak, recent slips, last sign-in).
// Outputs: nudges with title + body + suggested action + urgency.
//
// Rules-based (no LLM needed) — fast, deterministic, predictable. The Coach
// surfaces these on first message of a new session and the dashboard shows
// them as insight cards.

import { prisma } from '@/lib/db/prisma';

export interface Nudge {
  id: string;
  title: string;
  body: string;
  action?: { kind: 'open_url'; url: string } | { kind: 'log_slip' } | { kind: 'open_coach' };
  urgency: 'low' | 'medium' | 'high';
}

interface RuleInput {
  stats: Record<string, number>;
  streakDays: number;
  lostAtAgoHours: number | null;
  freezesAvailable: number;
  slipsLast24h: number;
  inactiveDays: number;
  trialDaysLeft: number | null;
  refundCount: number;
}

const RULES: Array<{ id: string; test: (i: RuleInput) => Nudge | null }> = [
  {
    id: 'streak_milestone_close',
    test: i => {
      const tiers = [7, 14, 30, 60, 100];
      const next = tiers.find(t => t > i.streakDays);
      if (!next) return null;
      const gap = next - i.streakDays;
      if (gap > 3) return null;
      return {
        id: 'streak_milestone_close',
        title: `${gap} ${gap === 1 ? 'day' : 'days'} from day ${next}`,
        body: `Day ${next} unlocks a celebration card + +50 coins. Keep going.`,
        urgency: gap === 1 ? 'high' : 'medium',
      };
    },
  },
  {
    id: 'streak_at_risk_lost',
    test: i => {
      if (i.lostAtAgoHours === null || i.lostAtAgoHours > 48) return null;
      const remaining = 48 - i.lostAtAgoHours;
      return {
        id: 'streak_at_risk_lost',
        title: 'Restore window: ' + Math.ceil(remaining) + 'h left',
        body: 'You can still restore your streak. First one is free.',
        action: { kind: 'open_url', url: '/restore-streak.html' },
        urgency: 'high',
      };
    },
  },
  {
    id: 'willpower_low',
    test: i => i.stats.willpower < 30 ? ({
      id: 'willpower_low',
      title: 'Willpower in the slip zone',
      body: 'Below 30. One honest log gets you 10 coins + builds it back.',
      action: { kind: 'log_slip' },
      urgency: 'medium',
    }) : null,
  },
  {
    id: 'sleep_debt',
    test: i => i.stats.brain > 0 && i.stats.brain < 50 ? ({
      id: 'sleep_debt',
      title: 'Brain stat sliding',
      body: 'Sleep is doing the work. Try a 10pm phone-down nudge.',
      action: { kind: 'open_coach' },
      urgency: 'low',
    }) : null,
  },
  {
    id: 'inactive_user',
    test: i => i.inactiveDays >= 3 && i.inactiveDays < 14 ? ({
      id: 'inactive_user',
      title: 'Been ' + i.inactiveDays + ' days',
      body: 'No judgement. Just check in — log honestly and the score moves.',
      urgency: 'medium',
    }) : null,
  },
  {
    id: 'trial_ending',
    test: i => i.trialDaysLeft !== null && i.trialDaysLeft <= 2 ? ({
      id: 'trial_ending',
      title: i.trialDaysLeft === 1 ? 'Trial ends tomorrow' : `Trial ends in ${i.trialDaysLeft} days`,
      body: 'First charge is $2.99. Cancel any time before then to pay $0.',
      action: { kind: 'open_url', url: '/pricing.html' },
      urgency: 'high',
    }) : null,
  },
  {
    id: 'multiple_slips',
    test: i => i.slipsLast24h >= 3 ? ({
      id: 'multiple_slips',
      title: 'Rough 24 hours',
      body: 'Three slips today. What was different? Coach is open.',
      action: { kind: 'open_coach' },
      urgency: 'high',
    }) : null,
  },
];

/** Generate nudges for a user. Caches results to RecommendationCache. */
export async function generateRecommendations(userId: string): Promise<Nudge[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stats: true, refundCount: true, trialEndsAt: true,
      streak: { select: { days: true, lostAt: true, freezesAvailable: true } },
      slipLogs: { where: { ts: { gte: new Date(Date.now() - 86400000) } }, select: { id: true } },
      deviceSessions: { orderBy: { lastUsedAt: 'desc' }, take: 1, select: { lastUsedAt: true } },
    },
  });
  if (!user) return [];

  const lastSeen = user.deviceSessions[0]?.lastUsedAt;
  const inactiveDays = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 86400000) : 0;
  const trialDaysLeft = user.trialEndsAt ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86400000)) : null;
  const lostAtAgoHours = user.streak?.lostAt ? (Date.now() - user.streak.lostAt.getTime()) / 3600000 : null;

  const input: RuleInput = {
    stats: user.stats as Record<string, number>,
    streakDays: user.streak?.days || 0,
    lostAtAgoHours,
    freezesAvailable: user.streak?.freezesAvailable || 0,
    slipsLast24h: user.slipLogs.length,
    inactiveDays,
    trialDaysLeft,
    refundCount: user.refundCount,
  };

  const all = RULES.map(r => r.test(input)).filter((n): n is Nudge => !!n);
  // Sort by urgency (high → low), cap at 3
  const order = { high: 0, medium: 1, low: 2 } as const;
  all.sort((a, b) => order[a.urgency] - order[b.urgency]);
  const nudges = all.slice(0, 3);

  await prisma.recommendationCache.upsert({
    where: { userId },
    update: { generated: new Date(), nudges: nudges as any },
    create: { userId, nudges: nudges as any },
  });

  return nudges;
}

export async function getCachedRecommendations(userId: string): Promise<Nudge[]> {
  const row = await prisma.recommendationCache.findUnique({ where: { userId } });
  if (!row) return [];
  // Stale if > 6h old
  if (Date.now() - row.generated.getTime() > 6 * 3600000) return [];
  return row.nudges as unknown as Nudge[];
}
