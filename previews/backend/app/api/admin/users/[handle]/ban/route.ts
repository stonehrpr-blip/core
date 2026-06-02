// POST /api/admin/users/[handle]/ban  — ban or unban a user. Owner-only.
// Body: { ban: boolean, reason?: string }
// Revokes every active DeviceSession when banning.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireOwner } from '@/lib/auth/owner';
import { verifyCsrf } from '@/lib/security/csrf';
import { adminAudit } from '@/lib/security/audit';
import { getRequestContext } from '@/lib/auth/session';

const NOT_FOUND = () => new NextResponse('Not Found', { status: 404 });

const Body = z.object({
  ban: z.boolean(),
  reason: z.string().min(2).max(280).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ handle: string }> }) {
  let actorId: string;
  try { actorId = await requireOwner(); } catch { return NOT_FOUND(); }
  if (!(await verifyCsrf(req.headers.get('x-csrf-token')))) return NOT_FOUND();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { ban, reason } = parsed.data;

  const { handle } = await ctx.params;
  const reqCtx = await getRequestContext();
  const user = await prisma.user.findUnique({ where: { handle } });
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (user.id === actorId) return NextResponse.json({ error: 'cannot_ban_self' }, { status: 400 });

  const ops: any[] = [
    prisma.user.update({
      where: { id: user.id },
      data: ban
        ? { isBanned: true,  bannedAt: new Date(), bannedReason: reason }
        : { isBanned: false, bannedAt: null,       bannedReason: null },
    }),
  ];
  if (ban) {
    // Revoke every active session so they're kicked out instantly
    ops.push(prisma.deviceSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'banned' },
    }));
  }
  await prisma.$transaction(ops);

  await adminAudit({
    actorId,
    action: ban ? 'USER_BAN' : 'USER_UNBAN',
    targetId: user.id,
    meta: { reason },
    ip: reqCtx.ip,
  });

  // Email the user — give them a heads-up + appeal contact
  try {
    const { sendEmail } = await import('@/lib/notifications/email');
    if (ban) {
      await sendEmail({
        to: user.email,
        subject: 'CORE · your account has been suspended',
        html: `<p>Your CORE account has been suspended.</p>
               <p><strong>Reason:</strong> ${reason || 'Violation of community guidelines.'}</p>
               <p>To appeal, reply to this email or contact <a href="mailto:support@core.app">support@core.app</a>.</p>
               <p>— Core</p>`,
        text: `Your CORE account has been suspended.\nReason: ${reason || 'Violation of community guidelines.'}\nTo appeal, contact support@core.app\n— Core`,
        tag: 'security',
      });
    } else {
      await sendEmail({
        to: user.email,
        subject: 'CORE · your account has been restored',
        html: `<p>Your CORE account has been reinstated. Welcome back.</p><p>— Core</p>`,
        text: 'Your CORE account has been reinstated. Welcome back.\n— Core',
        tag: 'security',
      });
    }
  } catch (err) { console.warn('ban_email_failed', err); }

  return NextResponse.json({ ok: true, banned: ban });
}
