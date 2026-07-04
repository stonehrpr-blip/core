// Entitlement resolver — single source of truth for "is this user Pro?".
// Checks the User.tier (mirrored) and reconciles against the active Subscription.
//
// Phase 5/6 expand this to actively re-verify with Apple/Stripe if the mirror
// looks stale.

import { prisma } from '@/lib/db/prisma';

export interface Entitlement {
  tier: 'FREE' | 'PRO';
  status: 'TRIALING' | 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'NONE';
  expiresAt: Date | null;
  trialEndsAt: Date | null;
  inGrace: boolean;
  provider: 'APPLE' | 'STRIPE' | 'NONE';
}

export async function resolveEntitlement(userId: string): Promise<Entitlement> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true, subscriptionStatus: true, trialEndsAt: true,
      subscriptions: {
        where: { status: { in: ['TRIALING', 'ACTIVE', 'GRACE_PERIOD', 'PAST_DUE', 'CANCELLED'] } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!user) {
    return { tier: 'FREE', status: 'NONE', expiresAt: null, trialEndsAt: null, inGrace: false, provider: 'NONE' };
  }
  const active = user.subscriptions[0];
  if (!active) {
    return {
      tier: user.tier as 'FREE' | 'PRO',
      status: 'NONE',
      expiresAt: null,
      trialEndsAt: user.trialEndsAt,
      inGrace: false,
      provider: 'NONE',
    };
  }
  return {
    tier: ['TRIALING', 'ACTIVE', 'GRACE_PERIOD'].includes(active.status) ? 'PRO' : 'FREE',
    status: active.status as any,
    expiresAt: active.currentPeriodEnd ?? null,
    trialEndsAt: active.trialEnd ?? user.trialEndsAt,
    inGrace: active.status === 'GRACE_PERIOD',
    provider: active.provider as 'APPLE' | 'STRIPE',
  };
}

/** Server-side guard: throws if the user isn't Pro. Use in route handlers. */
export async function requirePro(userId: string): Promise<Entitlement> {
  const e = await resolveEntitlement(userId);
  if (e.tier !== 'PRO') throw new Error('PRO_REQUIRED');
  return e;
}
