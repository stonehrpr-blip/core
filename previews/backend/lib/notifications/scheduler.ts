// Timezone-aware notification scheduler.
//
// Modes:
//   1. Absolute UTC — pass scheduledFor as a Date, scheduler picks it up when due.
//   2. Local-time — pass { localTime: "21:00", timezone: "Australia/Perth" } and
//      we resolve it to the next UTC instant of that local clock-time.

import { prisma } from '@/lib/db/prisma';
import type { NotificationKind } from '@prisma/client';

export interface LocalScheduleOpts {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  // "HH:MM" in 24h format
  localTime: string;
  // Optional explicit TZ override (defaults to user's stored TZ)
  timezone?: string;
}

/** Resolve the next UTC instant of a local clock-time in a specific TZ. */
export function nextLocalTimeUtc(localTime: string, timezone: string, fromUtc = new Date()): Date {
  const [hh, mm] = localTime.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) throw new Error('invalid_localTime');
  // Use Intl to read the current "local hour" in the target tz.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const parts = Object.fromEntries(fmt.formatToParts(fromUtc).map(p => [p.type, p.value]));
  const localToday = new Date(`${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  // localToday is naive — convert to UTC by computing the TZ offset at that instant
  const tzOffsetMs = tzOffsetMillis(timezone, localToday);
  const targetUtc = new Date(localToday.getTime() - tzOffsetMs);
  if (targetUtc < fromUtc) {
    // Already passed today → schedule tomorrow
    return new Date(targetUtc.getTime() + 86400000);
  }
  return targetUtc;
}

function tzOffsetMillis(timezone: string, atUtc: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  const parts = fmt.formatToParts(atUtc);
  const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  const m = /GMT([+-])(\d{1,2}):?(\d{0,2})/.exec(offsetStr);
  if (!m) return 0;
  const sign = m[1] === '+' ? 1 : -1;
  const h = Number(m[2]) || 0;
  const min = Number(m[3]) || 0;
  return sign * (h * 60 + min) * 60 * 1000;
}

/** Schedule a notification at a user-local clock time. */
export async function scheduleAtLocalTime(opts: LocalScheduleOpts): Promise<{ scheduledFor: Date }> {
  let tz = opts.timezone;
  if (!tz) {
    const u = await prisma.user.findUnique({ where: { id: opts.userId }, select: { timezone: true } });
    tz = u?.timezone || 'UTC';
  }
  const scheduledFor = nextLocalTimeUtc(opts.localTime, tz);
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      title: opts.title,
      body: opts.body,
      meta: opts.meta as any,
      scheduledFor,
    },
  });
  return { scheduledFor };
}
