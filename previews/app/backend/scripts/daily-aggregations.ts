// Daily aggregation cron — runs every night at 02:00 (UTC) via Vercel Cron / GitHub Action.
//
// What it does:
//   1. Roll AnalyticsEvent → AnalyticsDaily (event_name, date, count, uniqueUsers)
//   2. Compute RevenueDaily from Transaction + Subscription tables
//   3. Snapshot each user's stats → UserStatsSnapshot (for cohort charts)
//   4. Compute RetentionCohort for the rolling 90 days
//
// Run manually: `pnpm cron:daily`
// Vercel Cron config in vercel.json points at /api/cron/daily (which calls this).

import { prisma } from '@/lib/db/prisma';

const ONE_DAY = 24 * 60 * 60 * 1000;

function startOfUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function rollAnalytics(date: Date) {
  const dayStart = startOfUTCDate(date);
  const dayEnd = new Date(dayStart.getTime() + ONE_DAY);
  // Group by event in JS — Prisma's groupBy is OK but we need distinct users too
  const rows = await prisma.analyticsEvent.findMany({
    where: { ts: { gte: dayStart, lt: dayEnd } },
    select: { event: true, userId: true },
  });
  const byEvent: Record<string, { count: number; users: Set<string> }> = {};
  for (const r of rows) {
    byEvent[r.event] ??= { count: 0, users: new Set() };
    byEvent[r.event].count++;
    if (r.userId) byEvent[r.event].users.add(r.userId);
  }
  for (const [event, agg] of Object.entries(byEvent)) {
    await prisma.analyticsDaily.upsert({
      where: { date_event: { date: dayStart, event } },
      update: { count: agg.count, uniqueUsers: agg.users.size },
      create: { date: dayStart, event, count: agg.count, uniqueUsers: agg.users.size },
    });
  }
}

async function rollRevenue(date: Date) {
  const dayStart = startOfUTCDate(date);
  const dayEnd = new Date(dayStart.getTime() + ONE_DAY);

  const txns = await prisma.transaction.findMany({
    where: { occurredAt: { gte: dayStart, lt: dayEnd } },
    select: { provider: true, amountCents: true, feeCents: true, netCents: true, refundedAt: true },
  });
  let appleGross = 0, appleFee = 0, appleNet = 0;
  let stripeGross = 0, stripeFee = 0, stripeNet = 0;
  let refund = 0;
  for (const t of txns) {
    if (t.refundedAt) refund += t.amountCents;
    if (t.provider === 'APPLE')  { appleGross += t.amountCents; appleFee += t.feeCents; appleNet += t.netCents; }
    if (t.provider === 'STRIPE') { stripeGross += t.amountCents; stripeFee += t.feeCents; stripeNet += t.netCents; }
  }

  const [paidActive, trialing, expired, freeUsers, newSignups, newPaidConverts, cancellations] = await Promise.all([
    prisma.user.count({ where: { tier: 'PRO', subscriptionStatus: 'ACTIVE' } }),
    prisma.user.count({ where: { subscriptionStatus: 'TRIALING' } }),
    prisma.user.count({ where: { subscriptionStatus: 'EXPIRED' } }),
    prisma.user.count({ where: { tier: 'FREE' } }),
    prisma.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.subscription.count({ where: { createdAt: { gte: dayStart, lt: dayEnd }, status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { cancelledAt: { gte: dayStart, lt: dayEnd } } }),
  ]);

  await prisma.revenueDaily.upsert({
    where: { date: dayStart },
    update: {
      appleGrossCents: appleGross, appleFeeCents: appleFee, appleNetCents: appleNet,
      stripeGrossCents: stripeGross, stripeFeeCents: stripeFee, stripeNetCents: stripeNet,
      refundCents: refund,
      paidActive, trialing, expired, freeUsers,
      newSignups, newPaidConverts, cancellations,
    },
    create: {
      date: dayStart,
      appleGrossCents: appleGross, appleFeeCents: appleFee, appleNetCents: appleNet,
      stripeGrossCents: stripeGross, stripeFeeCents: stripeFee, stripeNetCents: stripeNet,
      refundCents: refund,
      paidActive, trialing, expired, freeUsers,
      newSignups, newPaidConverts, cancellations,
    },
  });
}

export async function runDailyAggregations(forDate = new Date()) {
  // Roll yesterday (UTC) — the "day" only completes at 00:00 UTC
  const yesterday = new Date(forDate.getTime() - ONE_DAY);
  await rollAnalytics(yesterday);
  await rollRevenue(yesterday);
  // Phase 7 — score churn risk for every active user, store in User.riskScore
  try {
    const { scoreAllUsers } = await import('@/lib/analytics/churn');
    const result = await scoreAllUsers();
    console.log('churn_scored', result);
  } catch (err) {
    console.warn('churn_scoring_failed', err);
  }
}

// Allow direct invocation via `pnpm cron:daily`
if (require.main === module) {
  runDailyAggregations()
    .then(() => { console.log('daily aggregations done'); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
}
