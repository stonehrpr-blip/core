// GET /api/admin/cohorts?weeks=12
// Returns weekly signup cohorts with retention at day 1, 7, 30, 60, 90.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });
const ONE_DAY = 86400000;

export async function GET(req: NextRequest) {
  try { await requireOwner(); } catch { return NOT_FOUND(); }
  const weeks = Math.min(52, Math.max(1, Number(req.nextUrl.searchParams.get('weeks') || 12)));
  const cohorts: Array<{ cohortDate: string; size: number; retention: Record<string, number> }> = [];

  // Walk back N weeks, build each cohort
  const now = new Date();
  for (let w = 0; w < weeks; w++) {
    const cohortStart = new Date(now.getTime() - (w + 1) * 7 * ONE_DAY);
    const cohortEnd = new Date(cohortStart.getTime() + 7 * ONE_DAY);
    const members = await prisma.user.findMany({
      where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
      select: { id: true, createdAt: true },
    });
    if (members.length === 0) continue;
    const retention: Record<string, number> = {};
    for (const offset of [1, 7, 30, 60, 90]) {
      const checkStart = new Date(cohortStart.getTime() + offset * ONE_DAY);
      const checkEnd = new Date(checkStart.getTime() + ONE_DAY);
      // Retained = user had at least one analytics event in the day-offset window
      const userIds = members.map(m => m.id);
      const active = await prisma.analyticsEvent.findMany({
        where: { userId: { in: userIds }, ts: { gte: checkStart, lt: checkEnd } },
        select: { userId: true },
        distinct: ['userId'],
      });
      retention[`d${offset}`] = active.length;
    }
    cohorts.push({
      cohortDate: cohortStart.toISOString().slice(0, 10),
      size: members.length,
      retention,
    });
  }
  return NextResponse.json({ cohorts: cohorts.reverse() });
}
