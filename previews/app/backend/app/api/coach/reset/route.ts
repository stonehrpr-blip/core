// POST /api/coach/reset — close the active conversation. Next message opens a fresh one.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCsrf } from '@/lib/security/csrf';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) {
    return NextResponse.json({ error: 'csrf_failed' }, { status: 403 });
  }
  await prisma.coachConversation.updateMany({
    where: { userId, closedAt: null },
    data: { closedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
