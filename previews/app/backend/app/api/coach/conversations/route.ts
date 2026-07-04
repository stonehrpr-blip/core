// GET /api/coach/conversations — list past closed conversations, paginated.
// Useful for the user to review prior coach advice.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const limit = Math.min(50, Math.max(1, Number(params.get('limit') || 20)));
  const cursor = params.get('cursor') || undefined;

  const rows = await prisma.coachConversation.findMany({
    where: { userId, closedAt: { not: null } },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
      closedAt: true,
      tone: true,
      messageCount: true,
      // First user message as a teaser
      messages: {
        where: { role: 'USER' },
        orderBy: { ts: 'asc' },
        take: 1,
        select: { content: true },
      },
    },
  });
  const nextCursor = rows.length > limit ? rows.pop()?.id : null;
  return NextResponse.json({
    conversations: rows.map(r => ({
      id: r.id,
      startedAt: r.startedAt,
      closedAt: r.closedAt,
      tone: r.tone,
      messageCount: r.messageCount,
      preview: r.messages[0]?.content?.slice(0, 100),
    })),
    nextCursor,
  });
}
