// POST /api/me/push/register — register a device push token.
// Body: { token: string, kind: 'ios'|'android'|'web', timezone?: string }
// Encrypts the token at rest (AES-256-GCM) so DB compromise doesn't leak push capability.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/security/encrypt';
import { verifyCsrf } from '@/lib/security/csrf';
import { track } from '@/lib/analytics/track';

const Body = z.object({
  token: z.string().min(8).max(2000), // web push subscription JSON can be large
  kind: z.enum(['ios', 'android', 'web']),
  timezone: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-core-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) {
    return NextResponse.json({ error: 'csrf_failed' }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const { token, kind, timezone } = parsed.data;

  const encrypted = encrypt(token);
  const tokenField = kind === 'ios' ? 'pushTokenIos' : kind === 'android' ? 'pushTokenAndroid' : 'pushTokenWeb';

  await prisma.user.update({
    where: { id: userId },
    data: {
      [tokenField]: encrypted,
      pushOptedIn: true,
      ...(timezone ? { timezone } : {}),
    },
  });

  await track({ event: 'push_token_registered', userId, meta: { kind } });
  return NextResponse.json({ ok: true });
}
