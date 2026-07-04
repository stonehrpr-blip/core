// GET /api/admin/notifications?days=30
// Notification campaign analytics: delivery rate, open rate, per-kind breakdown.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

export async function GET(req: NextRequest) {
  try { await requireOwner(); } catch { return NOT_FOUND(); }
  const days = Math.min(180, Math.max(1, Number(req.nextUrl.searchParams.get('days') || 30)));
  const since = new Date(Date.now() - days * 86400000);

  const rows = await prisma.notification.findMany({
    where: { createdAt: { gte: since } },
    select: { kind: true, sentAt: true, deliveredAt: true, openedAt: true, failed: true, failedReason: true },
  });

  const totals = {
    created: rows.length,
    sent: rows.filter(r => r.sentAt).length,
    delivered: rows.filter(r => r.deliveredAt).length,
    opened: rows.filter(r => r.openedAt).length,
    failed: rows.filter(r => r.failed).length,
  };
  const sendRate     = totals.created > 0 ? totals.sent / totals.created : 0;
  const deliveryRate = totals.sent > 0    ? totals.delivered / totals.sent : 0;
  const openRate     = totals.delivered > 0 ? totals.opened / totals.delivered : 0;

  // Per-kind breakdown
  const byKind: Record<string, { sent: number; opened: number; failed: number }> = {};
  for (const r of rows) {
    byKind[r.kind] ??= { sent: 0, opened: 0, failed: 0 };
    if (r.sentAt) byKind[r.kind].sent++;
    if (r.openedAt) byKind[r.kind].opened++;
    if (r.failed) byKind[r.kind].failed++;
  }
  const kindRows = Object.entries(byKind).map(([kind, v]) => ({
    kind, ...v, openRate: v.sent > 0 ? v.opened / v.sent : 0,
  }));

  // Top failure reasons
  const failureReasons: Record<string, number> = {};
  for (const r of rows) {
    if (!r.failedReason) continue;
    for (const piece of r.failedReason.split(';')) {
      const key = piece.split(':')[0];
      failureReasons[key] = (failureReasons[key] || 0) + 1;
    }
  }

  return NextResponse.json({
    totals, sendRate, deliveryRate, openRate,
    byKind: kindRows,
    topFailureReasons: Object.entries(failureReasons).sort((a, b) => b[1] - a[1]).slice(0, 5),
  });
}
