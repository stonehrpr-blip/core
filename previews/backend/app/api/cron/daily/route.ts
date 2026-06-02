// GET /api/cron/daily — fired by Vercel Cron at 02:00 UTC.
// Runs the daily aggregation script.

import { NextRequest, NextResponse } from 'next/server';
import { runDailyAggregations } from '../../../../scripts/daily-aggregations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron sends a Bearer token in production — verify it
  if (process.env.NODE_ENV === 'production') {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  try {
    await runDailyAggregations();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = (err as Error).message;
    // Alert the owner — Slack webhook (preferred) or email fallback
    await alertOwnerOfCronFailure(message).catch(() => { /* never block the response */ });
    return NextResponse.json({ error: 'failed', message }, { status: 500 });
  }
}

async function alertOwnerOfCronFailure(message: string) {
  // PagerDuty for true on-call paging
  try {
    const { pagePagerDuty } = await import('@/lib/notifications/pagerduty');
    await pagePagerDuty({
      summary: 'CORE daily aggregation cron failed: ' + message.slice(0, 120),
      severity: 'error',
      source: 'cron:daily',
      dedupKey: 'cron-daily-failure',
      customDetails: { message },
    });
  } catch { /* fall through to Slack/email */ }
  const slack = process.env.SLACK_WEBHOOK_URL;
  if (slack) {
    try {
      await fetch(slack, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: ':rotating_light: *CORE daily cron failed*\n```' + message.slice(0, 500) + '```',
        }),
      });
      return;
    } catch { /* fall through to email */ }
  }
  // Email fallback via Resend
  const owner = process.env.OWNER_EMAIL;
  if (!owner) return;
  const { sendEmail } = await import('@/lib/notifications/email');
  await sendEmail({
    to: owner,
    subject: 'CORE · daily aggregation cron failed',
    html: `<p>Daily aggregation cron failed at ${new Date().toISOString()} UTC.</p><pre>${message.slice(0, 1000)}</pre>`,
    text: 'Daily aggregation cron failed:\n' + message.slice(0, 1000),
    tag: 'security',
  });
}
