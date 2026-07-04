// GET /api/admin/ai-costs?days=30
// Token usage + dollar cost for the AI coach over the period.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

// Pricing per 1M tokens (USD). Update when providers change pricing.
const PRICING: Record<string, { prompt: number; completion: number }> = {
  // OpenAI
  'gpt-4o-mini':   { prompt: 0.15,  completion: 0.60  },
  'gpt-4o':        { prompt: 2.50,  completion: 10.00 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { prompt: 3.00, completion: 15.00 },
  'claude-3-5-haiku-20241022':  { prompt: 1.00, completion: 5.00 },
};

function costCents(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  // pricing is per 1M tokens, in USD; convert to cents
  return Math.round(((promptTokens / 1_000_000) * p.prompt + (completionTokens / 1_000_000) * p.completion) * 100);
}

export async function GET(req: NextRequest) {
  try { await requireOwner(); } catch { return NOT_FOUND(); }
  const days = Math.min(180, Math.max(1, Number(req.nextUrl.searchParams.get('days') || 30)));
  const since = new Date(Date.now() - days * 86400000);

  const messages = await prisma.coachMessage.findMany({
    where: { role: 'ASSISTANT', ts: { gte: since }, model: { not: null } },
    select: { promptTokens: true, completionTokens: true, model: true, ts: true },
  });

  let totalCents = 0;
  let totalPrompt = 0;
  let totalCompletion = 0;
  const perModel: Record<string, { messages: number; promptTokens: number; completionTokens: number; cents: number }> = {};
  for (const m of messages) {
    const pt = m.promptTokens || 0;
    const ct = m.completionTokens || 0;
    const cents = costCents(m.model!, pt, ct);
    totalCents += cents;
    totalPrompt += pt;
    totalCompletion += ct;
    perModel[m.model!] ??= { messages: 0, promptTokens: 0, completionTokens: 0, cents: 0 };
    perModel[m.model!].messages++;
    perModel[m.model!].promptTokens += pt;
    perModel[m.model!].completionTokens += ct;
    perModel[m.model!].cents += cents;
  }

  // Per-day breakdown for the sparkline
  const perDay: Record<string, number> = {};
  for (const m of messages) {
    const d = m.ts.toISOString().slice(0, 10);
    perDay[d] = (perDay[d] || 0) + costCents(m.model!, m.promptTokens || 0, m.completionTokens || 0);
  }

  return NextResponse.json({
    days,
    totalCostCents: totalCents,
    totalCostUsd: (totalCents / 100).toFixed(2),
    totalMessages: messages.length,
    totalPromptTokens: totalPrompt,
    totalCompletionTokens: totalCompletion,
    perModel,
    perDay: Object.entries(perDay).sort().map(([date, cents]) => ({ date, cents })),
  });
}
