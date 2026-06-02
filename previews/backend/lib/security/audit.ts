// Typed wrappers for AdminLog + AuditLog inserts. Use these instead of raw
// prisma.adminLog.create() so every audited action has a discoverable call site.

import { prisma } from '@/lib/db/prisma';
import type { AdminAction } from '@prisma/client';

export async function adminAudit(opts: {
  actorId: string;
  action: AdminAction;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await prisma.adminLog.create({
    data: {
      actorId: opts.actorId,
      action: opts.action,
      targetId: opts.targetId,
      meta: opts.meta as any,
      ip: opts.ip,
    },
  });
}

export async function userAudit(opts: {
  userId?: string;
  event: string;
  meta?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: opts.userId,
      event: opts.event,
      meta: opts.meta as any,
      ip: opts.ip,
    },
  });
}
