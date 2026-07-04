// GET /api/coach/history — last 50 messages from the active conversation.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const conv = await prisma.coachConversation.findFirst({
    where: { userId, closedAt: null },
    orderBy: { lastActiveAt: 'desc' },
    include: {
      messages: {
        where: { role: { in: ['USER', 'ASSISTANT'] } },
        orderBy: { ts: 'asc' },
        take: 50,
        select: { role: true, content: true, ts: true },
      },
    },
  });
  if (!conv) return NextResponse.json({ conversationId: null, messages: [] });
  return NextResponse.json({
    conversationId: conv.id,
    startedAt: conv.startedAt,
    messages: conv.messages,
  });
}
