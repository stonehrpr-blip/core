// app/(app)/dashboard/page.tsx — production port of dashboard.html.
//
// MIGRATION PATTERN this turn establishes:
//   - Server Component (default) — fetches data on the server (no client wait, no flicker)
//   - Hand off interactive bits to client components (greeting time, chart interactions)
//   - JWT verified at middleware → x-core-user-id header in layout → user fetched once
//
// File-for-file, every preview HTML maps to one of these. The CSS-in-style preserved
// inline so designers can keep iterating in the previews/ folder without rebuilding.

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { resolveEntitlement } from '@/lib/billing/entitlement';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const h = await headers();
  const userId = h.get('x-core-user-id');
  if (!userId) redirect('/sign-in');

  const [user, entitlement] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, displayName: true, avatarKey: true,
        tier: true, subscriptionStatus: true,
        xp: true, coins: true, stats: true, doubleXpUntil: true,
        trialEndsAt: true,
        streak: {
          select: { days: true, freezesAvailable: true, lostAt: true, previousDays: true },
        },
      },
    }),
    resolveEntitlement(userId),
  ]);
  if (!user) redirect('/sign-in');

  return <DashboardClient user={user} entitlement={entitlement} />;
}
