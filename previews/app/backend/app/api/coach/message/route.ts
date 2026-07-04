// POST /api/coach/message — send a message to the AI Coach. Streams the reply.
// Body: { text: string }
// Response: text/event-stream with `data: <token>\n\n` lines.

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { RateLimits } from '@/lib/security/rate-limit';
import { streamChat } from '@/lib/ai/provider';
import { systemPrompt, type CoachTone } from '@/lib/ai/prompts';
import { buildUserContext } from '@/lib/ai/context';
import { track } from '@/lib/analytics/track';

const Body = z.object({ text: z.string().min(1).max(2000) });

const IDLE_MS = 4 * 60 * 60 * 1000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return new Response('unauthenticated', { status: 401 });

  // Rate limit — uses the post bucket. AI calls are expensive.
  const rl = await RateLimits.postCreate(userId);
  if (!rl.allowed) return new Response('rate_limited', { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new Response('invalid_body', { status: 400 });

  // Find or create the active conversation (idle > 4h closes the old one)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true },
  });
  if (!user) return new Response('not_found', { status: 404 });

  // Resolve preferred tone — stored in TrialState or default 'balanced'
  // (Add a User.coachTone column later if needed.)
  const tone: CoachTone = 'balanced';

  let conv = await prisma.coachConversation.findFirst({
    where: { userId, closedAt: null },
    orderBy: { lastActiveAt: 'desc' },
  });
  if (conv && Date.now() - conv.lastActiveAt.getTime() > IDLE_MS) {
    await prisma.coachConversation.update({
      where: { id: conv.id },
      data: { closedAt: new Date() },
    });
    conv = null;
  }
  if (!conv) {
    conv = await prisma.coachConversation.create({
      data: { userId, tone },
    });
  }

  // Persist the user message
  await prisma.coachMessage.create({
    data: { conversationId: conv.id, role: 'USER', content: parsed.data.text },
  });

  // Build the prompt — first user message of a fresh session also gets top nudges
  let contextBlock = await buildUserContext(userId);
  const isFirstInSession = (await prisma.coachMessage.count({ where: { conversationId: conv.id, role: 'USER' } })) === 1;
  if (isFirstInSession) {
    try {
      const { getCachedRecommendations, generateRecommendations } = await import('@/lib/ai/recommendation');
      let nudges = await getCachedRecommendations(userId);
      if (nudges.length === 0) nudges = await generateRecommendations(userId);
      if (nudges.length > 0) {
        contextBlock += '\n\nPROACTIVE NUDGES (mention only if relevant to the user\'s message):\n' +
          nudges.map(n => `- [${n.urgency}] ${n.title}: ${n.body}`).join('\n');
      }
    } catch { /* never block the coach on recs */ }
  }
  const sysPrompt = systemPrompt(tone, contextBlock);
  const history = await prisma.coachMessage.findMany({
    where: { conversationId: conv.id, role: { in: ['USER', 'ASSISTANT'] } },
    orderBy: { ts: 'asc' },
    take: 20, // last 20 messages — keeps token cost down
  });

  let reply: Awaited<ReturnType<typeof streamChat>>;
  try {
    reply = await streamChat({
      messages: [
        { role: 'system', content: sysPrompt },
        ...history.map(m => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content })),
      ],
      maxTokens: 320,
      temperature: 0.6,
      stream: true,
    });
  } catch (err) {
    return new Response('ai_error:' + (err as Error).message, { status: 502 });
  }

  // Stream the reply as SSE. Persist the full text + token counts when done.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = '';
      try {
        for await (const delta of reply.deltas) {
          full += delta;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        const usage = await reply.done;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, usage })}\n\n`));
        // Persist
        await prisma.coachMessage.create({
          data: {
            conversationId: conv!.id,
            role: 'ASSISTANT',
            content: full,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            model: usage.model,
          },
        });
        await prisma.coachConversation.update({
          where: { id: conv!.id },
          data: { lastActiveAt: new Date(), messageCount: { increment: 2 } },
        });
        await track({ event: 'coach_message', userId, meta: { tokens: usage.completionTokens } });
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  });
}
