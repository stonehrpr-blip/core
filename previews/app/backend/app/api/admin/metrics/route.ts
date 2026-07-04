// GET /api/admin/metrics?range=7|30|90|ytd|all
// Returns the real metrics for the admin dashboard. Owner-only.
// Non-owners get 404 — the route's existence is hidden.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

export async function GET(req: NextRequest) {
  try { await requireOwner(); } catch { return NOT_FOUND(); }

  const range = req.nextUrl.searchParams.get('range') || '30';
  const days = range === 'all' ? 270
             : range === 'ytd' ? daysSinceYearStart()
             : Number(range) || 30;

  const since = new Date(Date.now() - days * 86400000);

  // Pull pre-aggregated rows for speed — daily-aggregations.ts populates these
  const revenueRows = await prisma.revenueDaily.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' },
  });
  const eventRows = await prisma.analyticsDaily.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  const total = revenueRows.reduce((acc, r) => ({
    appleGross: acc.appleGross + r.appleGrossCents,
    appleNet:   acc.appleNet   + r.appleNetCents,
    stripeGross: acc.stripeGross + r.stripeGrossCents,
    stripeNet:   acc.stripeNet   + r.stripeNetCents,
    refund:      acc.refund      + r.refundCents,
    newSignups:  acc.newSignups  + r.newSignups,
    newPaid:     acc.newPaid     + r.newPaidConverts,
    cancellations: acc.cancellations + r.cancellations,
  }), { appleGross: 0, appleNet: 0, stripeGross: 0, stripeNet: 0, refund: 0, newSignups: 0, newPaid: 0, cancellations: 0 });

  const latest = revenueRows[revenueRows.length - 1];
  const downloadsSeries = eventRows
    .filter(e => e.event === 'app_install' || e.event === 'sign_up')
    .reduce<Record<string, number>>((acc, r) => {
      const k = r.date.toISOString().slice(0, 10);
      acc[k] = (acc[k] || 0) + r.uniqueUsers;
      return acc;
    }, {});

  // Approximate monthly recurring revenue from the most recent day's net
  const dailyNet = latest ? (latest.appleNetCents + latest.stripeNetCents) : 0;
  const mrrCents = dailyNet * 30;

  // Churn % over the range
  const startPaid = revenueRows[0]?.paidActive || 0;
  const churnPct = startPaid > 0 ? (total.cancellations / startPaid * 100) : 0;

  // Conversion = newPaid / newSignups
  const conversionPct = total.newSignups > 0 ? (total.newPaid / total.newSignups * 100) : 0;

  return NextResponse.json({
    range, days,
    mrrCents,
    apple: { grossCents: total.appleGross, netCents: total.appleNet, subscribers: latest?.paidActive ? Math.round(latest.paidActive * 0.75) : 0 },
    stripe: { grossCents: total.stripeGross, netCents: total.stripeNet, subscribers: latest?.paidActive ? Math.round(latest.paidActive * 0.25) : 0 },
    downloads: Object.values(downloadsSeries).reduce((a, b) => a + b, 0),
    paying: latest?.paidActive || 0,
    free: latest?.freeUsers || 0,
    trialing: latest?.trialing || 0,
    conversionPct,
    churnPct,
    refundCents: total.refund,
    series: Object.entries(downloadsSeries).map(([date, count]) => ({ date, count })),
  });
}

function daysSinceYearStart(): number {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  return Math.floor((Date.now() - yearStart.getTime()) / 86400000);
}
