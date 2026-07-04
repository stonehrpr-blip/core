// `pnpm tsx scripts/seed-reminders.ts` — seeds 5 canonical ReminderTemplate rows.
// The AI Coach can ask scheduler.scheduleAtLocalTime(...) using these as defaults.

import { prisma } from '@/lib/db/prisma';

const TEMPLATES = [
  {
    key: 'morning_checkin',
    title: 'Good morning.',
    body: 'Quick 30 seconds — how did you sleep, what\'s the one thing today?',
    kind: 'STREAK_REMINDER' as const,
    whenSpec: 'DAILY 08:30',
  },
  {
    key: 'bedtime_reflection',
    title: 'Wind it down.',
    body: 'Phone in the kitchen. One honest log before sleep.',
    kind: 'STREAK_REMINDER' as const,
    whenSpec: 'DAILY 22:00',
  },
  {
    key: 'streak_at_risk',
    title: 'Day {{days}} on the line',
    body: 'You\'re hours from a milestone. Hold it.',
    kind: 'STREAK_REMINDER' as const,
    whenSpec: 'EVENT streak_close',
  },
  {
    key: 'inactivity_recovery',
    title: 'It\'s been a few days.',
    body: 'Come back. No judgement. The score moves with one honest log.',
    kind: 'COACH_NUDGE' as const,
    whenSpec: 'EVENT inactive_3d',
  },
  {
    key: 'trial_expiring',
    title: 'Trial ends tomorrow',
    body: 'First charge is $2.99. Cancel any time in Settings.',
    kind: 'TRIAL_EXPIRING' as const,
    whenSpec: 'EVENT trial_d6',
  },
];

async function main() {
  for (const t of TEMPLATES) {
    await prisma.reminderTemplate.upsert({
      where: { key: t.key },
      update: t,
      create: t,
    });
  }
  console.log('✓ seeded ' + TEMPLATES.length + ' reminder templates');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
