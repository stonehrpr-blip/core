// Feed — list-heavy migration reference.
// Pattern: server fetches the first page synchronously; client component handles
// section filter + infinite scroll + like/comment interactions.

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { FeedClient } from './feed-client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function FeedPage({ searchParams }: PageProps) {
  const h = await headers();
  const userId = h.get('x-core-user-id');
  if (!userId) redirect('/sign-in');

  const { section } = await searchParams;
  const sectionFilter = ['FITNESS', 'MIND', 'WALLET', 'BODY', 'STREAKS'].includes((section || '').toUpperCase())
    ? (section!.toUpperCase() as 'FITNESS' | 'MIND' | 'WALLET' | 'BODY' | 'STREAKS')
    : undefined;

  // Fetch first page of posts + who I follow (for the "Following" filter later)
  const [posts, followingCount, me] = await Promise.all([
    prisma.post.findMany({
      where: { removedAt: null, ...(sectionFilter ? { section: sectionFilter } : {}) },
      take: PAGE_SIZE + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, handle: true, displayName: true, avatarKey: true, tier: true, xp: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, take: 1, select: { userId: true } },
      },
    }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { handle: true, avatarKey: true, displayName: true } }),
  ]);

  const hasMore = posts.length > PAGE_SIZE;
  const visible = posts.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? posts[PAGE_SIZE - 1].id : null;

  return (
    <FeedClient
      initialPosts={visible.map(p => ({
        id: p.id,
        section: p.section,
        text: p.text,
        scoreSnap: p.scoreSnap as any,
        createdAt: p.createdAt.toISOString(),
        author: p.author,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        liked: p.likes.length > 0,
      }))}
      activeSection={sectionFilter ?? null}
      nextCursor={nextCursor}
      me={me}
      followingCount={followingCount}
    />
  );
}
