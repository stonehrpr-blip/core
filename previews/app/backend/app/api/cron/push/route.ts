// GET /api/cron/push — fires every minute via Vercel Cron.
// Picks up Notification rows with scheduledFor <= now and sends them.

import { NextRequest, NextResponse } from 'next/server';
import { runScheduler } from '@/lib/notifications/push';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  try {
    const result = await runScheduler();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: 'failed', message: (err as Error).message }, { status: 500 });
  }
}
