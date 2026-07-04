// /status — public-facing health page. No auth.
// Fetches /api/status server-side and renders the rollup.

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'CORE · System Status' };

interface StatusResponse {
  overall: 'ok' | 'degraded' | 'down';
  checks: Array<{ name: string; status: 'ok' | 'degraded' | 'down'; detail?: string }>;
  ts: string;
}

async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    // Use absolute URL only in production; relative path works locally
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || '';
    const res = await fetch(origin + '/api/status', { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

const COLOR = { ok: '#34D399', degraded: '#FFC857', down: '#F87171' };
const LABEL = { ok: 'Operational', degraded: 'Degraded', down: 'Down' };

export default async function StatusPage() {
  const data = await fetchStatus();
  const overall = data?.overall || 'down';
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, letterSpacing: '0.22em', color: '#9AA1B7', fontWeight: 700, textTransform: 'uppercase' }}>CORE · Status</div>
        <h1 style={{ fontSize: 32, letterSpacing: '-0.7px', margin: '12px 0 6px', color: COLOR[overall] }}>
          {LABEL[overall]}
        </h1>
        <div style={{ fontSize: 12, color: '#4F5570', marginBottom: 24 }}>
          {data ? 'Last checked ' + new Date(data.ts).toLocaleString() : 'Unable to reach status endpoint'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data?.checks || []).map(c => (
            <div key={c.name} style={rowStyle}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR[c.status], boxShadow: `0 0 8px ${COLOR[c.status]}` }} />
              <span style={{ flex: 1, fontWeight: 600 }}>{c.name.replace(/_/g, ' ')}</span>
              <span style={{ color: '#9AA1B7', fontSize: 11 }}>{c.detail || LABEL[c.status]}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, fontSize: 11, color: '#4F5570' }}>
          Trouble? Email <a href="mailto:support@core.app" style={{ color: '#6BA9FF' }}>support@core.app</a>.<br/>
          © Core
        </div>
      </div>
    </div>
  );
}

const pageStyle: any = { minHeight: '100vh', background: '#02020A', display: 'grid', placeItems: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif', color: '#fff' };
const cardStyle: any = { maxWidth: 480, width: '100%', padding: 32, borderRadius: 22, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };
const rowStyle: any = { display: 'flex', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 13 };
