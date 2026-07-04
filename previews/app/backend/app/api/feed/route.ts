// GET /api/feed?section=fitness|mind|wallet|body|streaks|all&cursor=...
// Returns paginated feed for the active user.

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

const VALID_SECTIONS = new Set(['fitness', 'mind', 'wallet', 'body', 'streaks']);

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const section = params.get('section') || 'all';
  const cursor = params.get('cursor') || undefined;
  const take = Math.min(50, Number(params.get('take') || 20));
  const where = section !== 'all' && VALID_SECTIONS.has(section) ? { section } : {};
  const posts = await prisma.post.findMany({
    where,
    take: take + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, handle: true, displayName: true, avatarKey: true, xp: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  const nextCursor = posts.length > take ? posts.pop()?.id : null;
  return NextResponse.json({ posts, nextCursor });
}
