// GET /api/status — public health rollup. No auth required.
// Returns OK/degraded/down per upstream + per major feature.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface ServiceStatus {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  detail?: string;
}

async function checkDb(): Promise<ServiceStatus> {
  try {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - t;
    return { name: 'database', status: ms < 500 ? 'ok' : 'degraded', detail: `${ms}ms` };
  } catch { return { name: 'database', status: 'down' }; }
}

async function checkStripe(): Promise<ServiceStatus> {
  if (!process.env.STRIPE_SECRET_KEY) return { name: 'stripe', status: 'ok', detail: 'not_configured' };
  try {
    const t = Date.now();
    const res = await fetch('https://api.stripe.com/v1/products?limit=1', {
      headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    return { name: 'stripe', status: res.ok ? 'ok' : 'degraded', detail: `${Date.now() - t}ms` };
  } catch { return { name: 'stripe', status: 'down' }; }
}

async function checkApple(): Promise<ServiceStatus> {
  // Apple's StoreKit doesn't have a public health endpoint. Check our own
  // recent notification flow: did we receive any in the last 24h?
  try {
    const since = new Date(Date.now() - 24 * 3600000);
    const count = await prisma.analyticsEvent.count({
      where: { event: 'apple_notification', ts: { gte: since } },
    });
    return { name: 'apple_storekit', status: 'ok', detail: `${count} events 24h` };
  } catch { return { name: 'apple_storekit', status: 'degraded' }; }
}

async function checkOpenAi(): Promise<ServiceStatus> {
  if (!process.env.OPENAI_API_KEY) return { name: 'openai', status: 'ok', detail: 'not_configured' };
  try {
    const t = Date.now();
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    return { name: 'openai', status: res.ok ? 'ok' : 'degraded', detail: `${Date.now() - t}ms` };
  } catch { return { name: 'openai', status: 'down' }; }
}

export async function GET() {
  const checks = await Promise.all([checkDb(), checkStripe(), checkApple(), checkOpenAi()]);
  const overall =
    checks.some(c => c.status === 'down')     ? 'down' :
    checks.some(c => c.status === 'degraded') ? 'degraded' :
    'ok';
  return NextResponse.json({ overall, checks, ts: new Date().toISOString() }, {
    headers: { 'cache-control': 'public, max-age=60' },
  });
}
