// GET /api/me — full hydrate for the active user.
// PATCH /api/me — partial update (whitelisted fields only).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { resolveEntitlement } from '@/lib/billing/entitlement';

function userIdFromReq(req: NextRequest): string | null {
  return req.headers.get('x-core-user-id'); // set by middleware after JWT verify
}

export async function GET(req: NextRequest) {
  const userId = userIdFromReq(req);
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const [user, entitlement, streak] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, handle: true, displayName: true, avatarKey: true,
        bio: true, isPrivate: true, tier: true, subscriptionStatus: true,
        xp: true, coins: true, level: true, stats: true, iconsOwned: true,
        statWizardsDone: true, doubleXpUntil: true, trialEndsAt: true,
        pushOptedIn: true, timezone: true, referralCode: true,
        createdAt: true,
      },
    }),
    resolveEntitlement(userId),
    prisma.streak.findUnique({ where: { userId } }),
  ]);

  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ user, entitlement, streak });
}

const PatchBody = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(280).optional(),
  avatarKey: z.string().max(24).optional(),
  isPrivate: z.boolean().optional(),
  pushOptedIn: z.boolean().optional(),
  timezone: z.string().max(64).optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = userIdFromReq(req);
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const updated = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, displayName: true, bio: true, avatarKey: true, isPrivate: true, pushOptedIn: true, timezone: true },
  });
  return NextResponse.json(updated);
}
