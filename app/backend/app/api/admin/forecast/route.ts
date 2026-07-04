// GET /api/admin/forecast — CAC, LTV, ARPU + 90-day MRR projection.
// Computed from real RevenueDaily + Subscription rows.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

export async function GET(_req: NextRequest) {
  try { await requireOwner(); } catch { return NOT_FOUND(); }

  // 30-day window for "current state"
  const since30 = new Date(Date.now() - 30 * 86400000);
  const since90 = new Date(Date.now() - 90 * 86400000);

  const [revenue30, revenue90, paidActiveNow, cancelled30, transactions30] = await Promise.all([
    prisma.revenueDaily.findMany({ where: { date: { gte: since30 } }, orderBy: { date: 'asc' } }),
    prisma.revenueDaily.findMany({ where: { date: { gte: since90 } }, orderBy: { date: 'asc' } }),
    prisma.user.count({ where: { tier: 'PRO', subscriptionStatus: 'ACTIVE' } }),
    prisma.subscription.count({ where: { cancelledAt: { gte: since30 } } }),
    prisma.transaction.aggregate({ _sum: { netCents: true, amountCents: true }, where: { occurredAt: { gte: since30 } } }),
  ]);

  // ARPU — average revenue per paid user, monthly
  const netCents30 = transactions30._sum.netCents || 0;
  const arpuCents = paidActiveNow > 0 ? Math.round(netCents30 / paidActiveNow) : 0;

  // Churn rate, monthly
  const startPaid = revenue30[0]?.paidActive || paidActiveNow;
  const churnRate = startPaid > 0 ? cancelled30 / startPaid : 0;

  // LTV = ARPU / churn rate (capped at 5 years of revenue if churn is tiny)
  const ltvCents = churnRate > 0
    ? Math.round(arpuCents / churnRate)
    : arpuCents * 60; // 5y cap

  // CAC placeholder — would come from ad-platform integration (Phase 7+)
  // For now: assume $0 (organic). The endpoint shape is here for when paid ads land.
  const cacCents = 0;
  const cacLtvRatio = cacCents > 0 ? ltvCents / cacCents : null;

  // 90-day MRR linear projection from the last 30 days' trend
  const recent = revenue30.slice(-7);
  const avgDailyNet = recent.length > 0
    ? recent.reduce((a, r) => a + r.appleNetCents + r.stripeNetCents, 0) / recent.length
    : 0;
  const projectedMrrCents = Math.round(avgDailyNet * 30);

  return NextResponse.json({
    arpuCents,
    ltvCents,
    cacCents,
    cacLtvRatio,
    churnRateMonthly: churnRate,
    paidActive: paidActiveNow,
    projectedMrrCents,
    netRevenueLast30Cents: netCents30,
    netRevenueLast90Cents: revenue90.reduce((a, r) => a + r.appleNetCents + r.stripeNetCents, 0),
    cancellationsLast30: cancelled30,
  });
}
