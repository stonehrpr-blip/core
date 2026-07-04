'use client';

import { useState, useEffect, useRef } from 'react';

type Section = 'FITNESS' | 'MIND' | 'WALLET' | 'BODY' | 'STREAKS';
interface Post {
  id: string;
  section: Section;
  text: string;
  scoreSnap: { label: string; n: number; unit?: string };
  createdAt: string;
  author: { id: string; handle: string; displayName: string; avatarKey: string; tier: string; xp: number };
  likeCount: number;
  commentCount: number;
  liked: boolean;
}
interface Props {
  initialPosts: Post[];
  activeSection: Section | null;
  nextCursor: string | null;
  me: { handle: string; avatarKey: string; displayName: string } | null;
  followingCount: number;
}

const SECTIONS: Array<{ key: Section | null; label: string; color: string }> = [
  { key: null, label: 'All', color: '#6BA9FF' },
  { key: 'FITNESS', label: 'Fitness', color: '#34D399' },
  { key: 'MIND', label: 'Mind', color: '#B388FF' },
  { key: 'WALLET', label: 'Wallet', color: '#FFD05C' },
  { key: 'BODY', label: 'Body', color: '#FF6BAA' },
  { key: 'STREAKS', label: 'Streaks', color: '#FF7A45' },
];

export function FeedClient({ initialPosts, activeSection, nextCursor: initialCursor, me, followingCount }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    if (!cursor) return;
    const obs = new IntersectionObserver(async entries => {
      if (!entries[0].isIntersecting || loading) return;
      setLoading(true);
      try {
        const url = '/api/feed?cursor=' + cursor + (activeSection ? '&section=' + activeSection.toLowerCase() : '');
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        setPosts(prev => [...prev, ...(data.posts || [])]);
        setCursor(data.nextCursor || null);
      } finally { setLoading(false); }
    }, { rootMargin: '600px' });
    if (sentinel.current) obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [cursor, loading, activeSection]);

  async function toggleLike(postId: string) {
    setPosts(ps => ps.map(p => p.id === postId
      ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
      : p
    ));
    const csrf = (document.cookie.split('core_csrf=')[1] || '').split(';')[0];
    await fetch('/api/feed/like', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
      credentials: 'include',
      body: JSON.stringify({ postId }),
    });
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Feed</div>
        <a href="/post/new" style={composeStyle}>+ Post</a>
      </header>

      <div style={tabsStyle}>
        {SECTIONS.map(s => (
          <a
            key={s.label}
            href={s.key ? `/feed?section=${s.key.toLowerCase()}` : '/feed'}
            style={{
              ...tabStyle,
              ...(activeSection === s.key || (activeSection === null && s.key === null) ? { background: s.color, color: '#050510', borderColor: s.color } : {}),
            }}>
            {s.label}
          </a>
        ))}
      </div>

      {posts.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>No posts yet in this section</div>
          <div style={{ fontSize: 12, color: '#9AA1B7', marginTop: 6 }}>Be the first to share an honest log.</div>
        </div>
      ) : posts.map(p => (
        <article key={p.id} style={postStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <a href={`/u/${p.author.handle}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff' }}>
              <div style={avatarStyle} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.author.displayName}</div>
                <div style={{ fontSize: 10, color: '#9AA1B7' }}>{timeAgo(p.createdAt)}</div>
              </div>
            </a>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.42, margin: 0 }}>{p.text}</p>
          <div style={scoreCardStyle(p.section)}>
            <div style={{ fontSize: 10, letterSpacing: '0.20em', color: SECTIONS.find(s => s.key === p.section)?.color, fontWeight: 700, textTransform: 'uppercase' }}>{p.scoreSnap.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: '#fff' }}>{p.scoreSnap.n}<span style={{ fontSize: 14, color: '#9AA1B7', marginLeft: 3 }}>{p.scoreSnap.unit || '/100'}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            <button onClick={() => toggleLike(p.id)} style={{ ...likeBtnStyle, color: p.liked ? '#F87171' : '#9AA1B7' }}>
              ♥ {p.likeCount}
            </button>
            <a href={`/post/${p.id}`} style={{ ...likeBtnStyle, color: '#9AA1B7', textDecoration: 'none' }}>💬 {p.commentCount}</a>
          </div>
        </article>
      ))}
      <div ref={sentinel} style={{ height: 1 }} />
      {loading && <div style={{ textAlign: 'center', padding: 20, color: '#4F5570', fontSize: 12 }}>Loading more…</div>}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

const pageStyle: any = { padding: '56px 18px 100px', background: '#02020A', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif', minHeight: '100vh' };
const headerStyle: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 };
const composeStyle: any = { padding: '7px 13px', borderRadius: 999, background: '#fff', color: '#050510', fontSize: 12, fontWeight: 700, textDecoration: 'none' };
const tabsStyle: any = { display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 };
const tabStyle: any = { padding: '7px 13px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', color: '#9AA1B7', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer' };
const postStyle: any = { padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', marginBottom: 12 };
const avatarStyle: any = { width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(circle at 35% 28%, #DCEBFF 0%, #4A8FFF 60%, #1856B8 100%)' };
const scoreCardStyle = (section: Section): any => ({ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginTop: 10 });
const likeBtnStyle: any = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '4px 6px' };
const emptyStyle: any = { padding: 40, textAlign: 'center', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };
