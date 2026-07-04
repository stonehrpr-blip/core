'use client';

// Client component — handles the time-of-day greeting, freeze button confirm,
// streak banner click logic, and any DOM interactivity that doesn't need the
// server. The data already arrived from the server component above.

import { useEffect, useState } from 'react';
import type { Entitlement } from '@/lib/billing/entitlement';

interface Props {
  user: {
    id: string;
    displayName: string;
    avatarKey: string;
    tier: 'FREE' | 'PRO';
    xp: number;
    coins: number;
    stats: any;
    streak: { days: number; freezesAvailable: number; lostAt: Date | null; previousDays: number } | null;
    trialEndsAt: Date | null;
  };
  entitlement: Entitlement;
}

export function DashboardClient({ user, entitlement }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const stats = user.stats as Record<string, number>;
  const lifeScore = Math.round((stats.brain + stats.lungs + stats.wallet + stats.willpower * 1.2 + stats.body) / 5.2);

  async function onFreezeClick() {
    if (!user.streak || user.streak.freezesAvailable <= 0) {
      window.location.href = '/shop#freeze-extra';
      return;
    }
    if (!confirm('Use your weekly streak freeze? Today won\'t count against your streak.')) return;
    const csrf = (document.cookie.split('core_csrf=')[1] || '').split(';')[0];
    await fetch('/api/streak/freeze', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      credentials: 'include',
    });
    window.location.reload();
  }

  function onStreakClick() {
    if (user.streak && user.streak.days > 0) window.location.href = '/streak-board';
    else if (user.streak?.previousDays) window.location.href = '/restore-streak';
    else window.location.href = '/habit';
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <div style={{ fontSize: 14, color: '#9AA1B7' }}>{greeting},</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.7px' }}>
            {user.displayName} <span style={{ color: '#4A8FFF' }}>·</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={coinChip}>{user.coins}</div>
        </div>
      </header>

      <button onClick={onStreakClick} style={streakStyle}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{user.streak?.days || 0}-day streak</div>
          <div style={{ fontSize: 11, color: '#9AA1B7', marginTop: 2 }}>Keep it alive!</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onFreezeClick(); }} style={freezeStyle}>
          FREEZE {user.streak?.freezesAvailable || 0}/1
        </button>
      </button>

      <div style={lifeCardStyle}>
        <div style={{ fontSize: 10, letterSpacing: '0.20em', color: '#9AA1B7', textTransform: 'uppercase' as const, fontWeight: 700 }}>
          Life Score
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8, gap: 4 }}>
          <span style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-2.5px' }}>{lifeScore}</span>
          <span style={{ fontSize: 18, color: '#9AA1B7' }}>/100</span>
        </div>
      </div>

      {entitlement.tier === 'FREE' && (
        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,208,92,0.10)', border: '1px solid rgba(255,208,92,0.34)', color: '#FFD56E', fontSize: 12, marginTop: 14 }}>
          On Free tier — <a href="/pricing" style={{ color: '#FFD56E', textDecoration: 'underline' }}>upgrade</a> to unlock Coach + Scan
        </div>
      )}
    </div>
  );
}

const pageStyle: any = { padding: '56px 18px 100px', background: '#02020A', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif', minHeight: '100vh' };
const headerStyle: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 };
const coinChip: any = { padding: '5px 10px', borderRadius: 999, background: 'rgba(255,208,92,0.10)', border: '1px solid rgba(255,208,92,0.34)', color: '#FFD56E', fontSize: 11, fontWeight: 700 };
const streakStyle: any = { display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, background: 'linear-gradient(135deg, rgba(255,122,69,0.12), rgba(255,79,107,0.04))', border: '1px solid rgba(255,122,69,0.24)', width: '100%', textAlign: 'left' as const, color: '#fff', cursor: 'pointer', marginBottom: 14, fontFamily: 'inherit' };
const freezeStyle: any = { padding: '7px 12px', borderRadius: 999, background: 'rgba(91,177,255,0.08)', border: '1px solid rgba(91,177,255,0.36)', color: '#7DCBFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const lifeCardStyle: any = { padding: 16, borderRadius: 20, background: 'linear-gradient(180deg, rgba(74,143,255,0.05), rgba(132,100,255,0.04))', border: '1px solid rgba(255,255,255,0.10)', marginBottom: 14 };
