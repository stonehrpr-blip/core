// GET /api/admin/transactions?limit=50&cursor=<id>&provider=APPLE|STRIPE
// Paginated transaction feed for the admin dashboard's "Recent" list.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

export async function GET(req: NextRequest) {
  try { await requireOwner(); } catch { return NOT_FOUND(); }
  const params = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25)));
  const cursor = params.get('cursor') || undefined;
  const provider = params.get('provider') as 'APPLE' | 'STRIPE' | null;

  const rows = await prisma.transaction.findMany({
    take: limit + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    where: provider ? { provider } : undefined,
    orderBy: { occurredAt: 'desc' },
    include: {
      user: { select: { id: true, handle: true, email: true, displayName: true, avatarKey: true } },
    },
  });
  const nextCursor = rows.length > limit ? rows.pop()?.id : null;

  return NextResponse.json({
    transactions: rows.map(t => ({
      id: t.id,
      provider: t.provider,
      amountCents: t.amountCents,
      feeCents: t.feeCents,
      netCents: t.netCents,
      currency: t.currency,
      occurredAt: t.occurredAt,
      refundedAt: t.refundedAt,
      description: t.description,
      user: t.user,
      kind: t.refundedAt ? 'refund' : 'charge',
    })),
    nextCursor,
  });
}
