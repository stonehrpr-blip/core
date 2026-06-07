/**
 * Client-side crisis detection. Kept in its own module (no Supabase / RN
 * imports) so it stays a pure, unit-testable function — the in-app CrisisCard
 * relies on it and must work even with the model offline. Re-exported from
 * `coach.ts` for convenience.
 *
 * Conservative but biased toward surfacing help: a false positive only shows
 * helpline numbers, which is a safe failure mode.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+my\s*self\b/,
  /\b(end|ending)\s+(my\s+life|it\s+all)\b/,
  /\b(want\s+to|wanna|going\s+to)\s+die\b/,
  /\bi\s+(want|wish)\s+(to\s+)?(die|be\s+dead)\b/,
  /\bbetter\s+off\s+dead\b/,
  /\bsuicid(e|al)\b/,
  /\bself[\s-]?harm\b/,
  /\b(hurt|harm|cut)(ting)?\s+my\s*self\b/,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|life|going\s+on)\b/,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\b/,
  /\bcan'?t\s+(go\s+on|do\s+this\s+anymore|take\s+it\s+anymore)\b/,
];

export function detectCrisis(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS_PATTERNS.some((re) => re.test(t));
}
