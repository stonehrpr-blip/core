// GET /api/admin/users/[handle] — full user record + subscription history + activity.
// Owner-only.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';
import { adminAudit } from '@/lib/security/audit';
import { getRequestContext } from '@/lib/auth/session';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

export async function GET(req: NextRequest, ctx: { params: Promise<{ handle: string }> }) {
  let actorId: string;
  try { actorId = await requireOwner(); } catch { return NOT_FOUND(); }

  const { handle } = await ctx.params;
  const reqCtx = await getRequestContext();

  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' } },
      transactions: { orderBy: { occurredAt: 'desc' }, take: 50 },
      refunds: { orderBy: { createdAt: 'desc' }, take: 20 },
      streak: true,
      deviceSessions: {
        where: { revokedAt: null },
        orderBy: { lastUsedAt: 'desc' },
        select: { id: true, deviceKind: true, ip: true, country: true, lastUsedAt: true, expiresAt: true, userAgent: true },
      },
    },
  });
  if (!user) return new NextResponse(JSON.stringify({ error: 'not_found' }), { status: 404 });

  // Audit-log this view so we know who looked at whose record
  await adminAudit({ actorId, action: 'USER_VIEW', targetId: user.id, ip: reqCtx.ip });

  // Derived totals
  const lifetimeNetCents = user.transactions.reduce((a, t) => a + t.netCents, 0);
  const totalRefundCents = user.refunds.reduce((a, r) => a + r.amountCents, 0);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      avatarKey: user.avatarKey,
      bio: user.bio,
      tier: user.tier,
      subscriptionStatus: user.subscriptionStatus,
      isBanned: user.isBanned,
      bannedReason: user.bannedReason,
      riskScore: user.riskScore,
      refundCount: user.refundCount,
      coins: user.coins,
      xp: user.xp,
      level: user.level,
      signupCountry: user.signupCountry,
      signupIp: user.signupIp,
      createdAt: user.createdAt,
      lastSignedIn: user.deviceSessions[0]?.lastUsedAt,
    },
    streak: user.streak,
    subscriptions: user.subscriptions,
    transactions: user.transactions,
    refunds: user.refunds,
    activeSessions: user.deviceSessions,
    derived: { lifetimeNetCents, totalRefundCents },
  });
}
