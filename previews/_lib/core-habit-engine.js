/* core-habit-engine.js
 * Adaptive difficulty for habits and recurring tasks.
 *
 * Watches coreTaskComplete + coreTaskSkip events. For tasks tagged with
 * `source: 'habit'` (or a habit-style title that repeats daily), it tracks
 * the last 7 outcomes per habit-title. When the completion rate drops
 * below 50%, it lowers the difficulty by rewriting the title:
 *
 *   "Read 30 pages"  →  "Read 5 pages"   (3 fails)
 *   "Run 5 km"       →  "Walk 1 km"      (4 fails)
 *
 * Adjustments are logged to coreHabitAdjustments and shown in coach.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.coreHabitEngine) return;

  const STORE = 'coreHabitStreaks.v1';
  const LOG   = 'coreHabitAdjustments.v1';
  const WINDOW = 7;       // consider last 7 outcomes
  const THRESHOLD = 0.5;  // adjust if completion rate < 50%

  function read(key, def) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function noteOutcome(taskTitle, ok) {
    if (!taskTitle) return;
    const all = read(STORE, {});
    const key = taskTitle.toLowerCase().trim();
    const cur = all[key] || { hits: [], adjustedAt: 0, adjustments: 0 };
    cur.hits.push({ ok, ts: Date.now() });
    if (cur.hits.length > WINDOW) cur.hits = cur.hits.slice(-WINDOW);
    all[key] = cur;
    write(STORE, all);
    if (cur.hits.length >= 4) maybeAdjust(key, cur);
  }

  // Simple lexical rewrites for common pattern. AI version will replace
  // this via core-ai.js when a key is present.
  function easierTitle(title) {
    let t = title;
    t = t.replace(/(\d+)\s*pages?/i,    (_, n) => Math.max(5, Math.floor(n/4)) + ' pages');
    t = t.replace(/(\d+)\s*km/i,        (_, n) => Math.max(1, Math.floor(n/3)) + ' km');
    t = t.replace(/(\d+)\s*miles?/i,    (_, n) => Math.max(1, Math.floor(n/3)) + ' miles');
    t = t.replace(/(\d+)\s*minutes?/i,  (_, n) => Math.max(5, Math.floor(n/2)) + ' minutes');
    t = t.replace(/(\d+)\s*reps?/i,     (_, n) => Math.max(5, Math.floor(n/2)) + ' reps');
    t = t.replace(/(\d+)\s*pushups?/i,  (_, n) => Math.max(5, Math.floor(n/2)) + ' pushups');
    t = t.replace(/run/i, 'walk');
    return t === title ? null : t;
  }

  async function maybeAdjust(key, cur) {
    const ok = cur.hits.filter(h => h.ok).length;
    const rate = ok / cur.hits.length;
    // Don't double-adjust within 3 days
    if (cur.adjustedAt && (Date.now() - cur.adjustedAt) < 3 * 86400000) return;
    if (rate >= THRESHOLD) return;
    // Find a pending task with this exact title
    if (!window.coreTasks) return;
    const tasks = coreTasks.list({ status: 'pending' });
    const match = tasks.find(t => (t.title || '').toLowerCase().trim() === key);
    if (!match) return;
    // Compute easier title — prefer AI if available, fallback to lexical
    let newTitle = null;
    if (window.coreAI && coreAI.hasKey()) {
      try {
        const r = await coreAI.chat([{
          role: 'user',
          content: `Make this daily habit easier (about 1/3 the effort). Reply with the new title only, no quotes: "${match.title}"`
        }], { temperature: 0.3, maxTokens: 30 });
        if (r.ok) newTitle = (r.text || '').trim().replace(/^["']|["']$/g, '');
      } catch (e) {}
    }
    if (!newTitle) newTitle = easierTitle(match.title);
    if (!newTitle || newTitle === match.title) return;

    coreTasks.update(match.id, { title: newTitle, autoAdjusted: true });
    cur.adjustedAt = Date.now();
    cur.adjustments = (cur.adjustments || 0) + 1;
    const all = read(STORE, {});
    all[key] = cur;
    write(STORE, all);

    const log = read(LOG, []);
    log.push({ ts: Date.now(), from: match.title, to: newTitle, rate });
    write(LOG, log.slice(-50));

    // Surface to UI via toast if available
    if (window.coreToast) {
      coreToast(`Habit eased: "${match.title}" → "${newTitle}"`, { kind: 'info', ttl: 4500 });
    }
    try {
      if (window.coreAI) coreAI.logActivity('habit_adjusted', { from: match.title, to: newTitle, rate });
    } catch (e) {}
  }

  // Wire to task events
  window.addEventListener('coreTaskComplete', e => {
    const t = e.detail?.task; if (!t) return;
    if (t.source === 'habit' || t.recurring) noteOutcome(t.title, true);
  });
  window.addEventListener('coreTaskSkip', t => {
    if (!t) return;
    const det = t.detail || t;
    if (det.source === 'habit' || det.recurring) noteOutcome(det.title, false);
  });

  window.coreHabitEngine = {
    noteOutcome, maybeAdjust, easierTitle,
    history: () => read(LOG, []),
    streaks: () => read(STORE, {}),
  };
})();
