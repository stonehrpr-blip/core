// Churn-risk scoring engine.
// Heuristic — no ML training needed at MVP scale. Real ML can plug into this same
// shape later (replace scoreUser() with a model.predict()).
//
// Features (0..1 normalized):
//   - days_since_last_login   (higher = more risk)
//   - slips_last_7d           (higher = more risk)
//   - life_score_trajectory   (negative slope = more risk)
//   - streak_recently_lost    (binary)
//   - failed_payment_count    (binary)
//   - sessions_per_week_drop  (rolling 4-week vs prior 4-week)
//
// Output: a 0..1 risk score stored in User.riskScore.

import { prisma } from '@/lib/db/prisma';

interface UserFeatures {
  daysSinceLastLogin: number;
  slipsLast7d: number;
  lifeScoreSlope: number; // -100..100 — change over last 14 days
  streakRecentlyLost: boolean;
  failedPaymentCount: number;
  sessionsThisMonth: number;
}

/** Normalize each feature to 0..1, weighted sum → 0..1 risk score. */
function scoreFromFeatures(f: UserFeatures): number {
  const n = (v: number, ceiling: number) => Math.min(1, Math.max(0, v / ceiling));
  const slope = f.lifeScoreSlope < 0 ? n(-f.lifeScoreSlope, 30) : 0;
  return Math.min(1,
    0.30 * n(f.daysSinceLastLogin, 14) +
    0.20 * n(f.slipsLast7d, 10) +
    0.15 * slope +
    0.15 * (f.streakRecentlyLost ? 1 : 0) +
    0.10 * n(f.failedPaymentCount, 3) +
    0.10 * (1 - n(f.sessionsThisMonth, 30))
  );
}

export async function scoreUserChurnRisk(userId: string): Promise<number> {
  const now = Date.now();
  const ONE_DAY = 86400000;
  const [lastSession, recentSlips, recentSnapshots, streak, failedSubs, sessionsThisMonth] = await Promise.all([
    prisma.deviceSession.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
      select: { lastUsedAt: true },
    }),
    prisma.slipLog.count({
      where: { userId, ts: { gte: new Date(now - 7 * ONE_DAY) } },
    }),
    prisma.userStatsSnapshot.findMany({
      where: { userId, date: { gte: new Date(now - 14 * ONE_DAY) } },
      orderBy: { date: 'asc' },
      select: { date: true, lifeScore: true },
    }),
    prisma.streak.findUnique({ where: { userId }, select: { lostAt: true } }),
    prisma.subscription.aggregate({
      _sum: { failedPaymentCount: true },
      where: { userId },
    }),
    prisma.analyticsEvent.count({
      where: { userId, ts: { gte: new Date(now - 30 * ONE_DAY) }, event: 'sign_in' },
    }),
  ]);

  // Life-score slope: latest - earliest, over the 14d window
  const lifeScoreSlope = recentSnapshots.length >= 2
    ? recentSnapshots[recentSnapshots.length - 1].lifeScore - recentSnapshots[0].lifeScore
    : 0;
  const lostAt = streak?.lostAt;
  const streakRecentlyLost = !!(lostAt && now - lostAt.getTime() < 7 * ONE_DAY);

  const features: UserFeatures = {
    daysSinceLastLogin: lastSession?.lastUsedAt ? Math.floor((now - lastSession.lastUsedAt.getTime()) / ONE_DAY) : 30,
    slipsLast7d: recentSlips,
    lifeScoreSlope,
    streakRecentlyLost,
    failedPaymentCount: failedSubs._sum.failedPaymentCount || 0,
    sessionsThisMonth,
  };
  const risk = scoreFromFeatures(features);
  await prisma.user.update({ where: { id: userId }, data: { riskScore: risk } });
  return risk;
}

/** Score every active user. Runs in the daily cron. */
export async function scoreAllUsers(): Promise<{ scanned: number; highRisk: number }> {
  // Only score active users (have signed in in last 60 days)
  const since = new Date(Date.now() - 60 * 86400000);
  const users = await prisma.user.findMany({
    where: { deviceSessions: { some: { lastUsedAt: { gte: since } } } },
    select: { id: true },
  });
  let highRisk = 0;
  for (const u of users) {
    const r = await scoreUserChurnRisk(u.id);
    if (r >= 0.7) highRisk++;
  }
  return { scanned: users.length, highRisk };
}
