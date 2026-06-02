/**
 * CORE shared state — one source of truth across every preview screen.
 *
 * Include with: <script src="core-state.js"></script>
 * (load BEFORE analytics.js if both are used, so coreState is available in screen-view tracks.)
 *
 * Usage:
 *   const s = coreState.read();
 *   s.stats.brain    // 78
 *   s.streak.days    // 14
 *   s.lifeScore      // 72 (computed)
 *
 *   coreState.logSlip('vape', { magnitude: 2 });
 *   coreState.restoreStreak();
 *   coreState.useFreeze();
 *
 * Listen for changes:
 *   window.addEventListener('coreStateChange', (e) => render(e.detail));
 */
(function() {
  if (typeof window === 'undefined') return;

  const STORAGE_KEY = 'coreState.v1';
  const FREEZE_PER_WEEK = 1;
  const STAT_MIN = 0, STAT_MAX = 100;
  const STAT_DECAY = { lungs: 0, brain: 0, wallet: 0, willpower: 0, body: 0.2 };
  const STAT_RECOVER = { lungs: 1.2, brain: 1.5, wallet: 1.0, willpower: 1.0, body: 0.8 };

  // Rank ladder — 10 tiers, Iron → Legend. XP threshold → rank name.
  // Each rank carries c1/c2/glow so badge rendering is consistent everywhere.
  const RANKS = [
    { name: 'Iron',        min: 0,    max: 299,  color: '#9aa0aa', c1: '#5f6670', c2: '#1d2229', glow: '#9aa0aa' },
    { name: 'Bronze',      min: 300,  max: 799,  color: '#ff9a2f', c1: '#ff9a2f', c2: '#693400', glow: '#ff9a2f' },
    { name: 'Silver',      min: 800,  max: 1499, color: '#dbe9ff', c1: '#e9f3ff', c2: '#586676', glow: '#dbe9ff' },
    { name: 'Gold',        min: 1500, max: 1999, color: '#ffd84d', c1: '#ffd84d', c2: '#8b5a00', glow: '#ffd84d' },
    { name: 'Emerald',     min: 2000, max: 2499, color: '#31f5b2', c1: '#31f5b2', c2: '#00644f', glow: '#31f5b2' },
    { name: 'Platinum',    min: 2500, max: 2999, color: '#38c7ff', c1: '#38c7ff', c2: '#003a84', glow: '#38c7ff' },
    { name: 'Diamond',     min: 3000, max: 3499, color: '#a970ff', c1: '#a970ff', c2: '#2b0d67', glow: '#a970ff' },
    { name: 'Master',      min: 3500, max: 3999, color: '#ff5a3d', c1: '#ff5a3d', c2: '#5d0900', glow: '#ff5a3d' },
    { name: 'Grandmaster', min: 4000, max: 4499, color: '#e35cff', c1: '#e35cff', c2: '#420077', glow: '#e35cff' },
    { name: 'Legend',      min: 4500, max: Infinity, color: '#ffe66d', c1: '#ffe66d', c2: '#c77700', glow: '#ffe66d' },
  ];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ── XP plumbing ───────────────────────────────────────────────────────────
  // Central XP mutator. All XP changes route through here so:
  //   1) `xpLedger` gets a real audit trail (Ranks page +XP/day rate)
  //   2) Rank-ups get captured into `rankHistory` with real timestamps
  // Capped at 200 / 50 entries respectively so localStorage doesn't bloat.
  function _rankIdxFor(xp) {
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) idx = i;
    return idx;
  }
  function _xpDelta(s, delta, reason) {
    if (!delta) return s;
    const oldXp = s.xp || 0;
    const newXp = Math.max(0, oldXp + delta);
    s.xp = newXp;
    s.xpLedger = s.xpLedger || [];
    s.xpLedger.unshift({ ts: Date.now(), delta: delta, reason: reason || 'unspecified' });
    if (s.xpLedger.length > 200) s.xpLedger.length = 200;
    if (delta > 0) {
      const oldIdx = _rankIdxFor(oldXp);
      const newIdx = _rankIdxFor(newXp);
      if (newIdx > oldIdx) {
        s.rankHistory = s.rankHistory || [];
        for (let i = oldIdx + 1; i <= newIdx; i++) {
          s.rankHistory.unshift({ rankName: RANKS[i].name, ts: Date.now(), xp: RANKS[i].min });
        }
        if (s.rankHistory.length > 50) s.rankHistory.length = 50;
      }
    }
    return s;
  }

  function defaultState() {
    // Fresh users start at zero. Stats fill in via the per-stat wizards (Phase B).
    // Streak starts at 0 with no `previousDays` (no restore offered until they have history).
    return {
      stats: { lungs: 0, brain: 0, wallet: 0, willpower: 0, body: 0 },
      streak: {
        days: 0,
        lastCleanAt: null,
        startedAt: null,
        lostAt: null,
        previousDays: null,
        freezes: { availableThisWeek: 1, weekResetAt: Date.now() + 7 * 86400000 },
      },
      xp: 0,
      coins: 100,           // starter coin balance for the economy (Phase D)
      level: 1,
      slips: [],            // { habit, ts, magnitude }
      // Tracks the per-stat wizard answers + a baseline Life Score from a week ago
      statWizardsDone: {},  // { brain: ts, lungs: ts, ... }
      lastWeekLifeScore: 0, // updated weekly to compute the improvement delta
      restoresUsedFree: 0,  // first restore free, subsequent cost coins (Phase A)
      xpLedger: [],         // { ts, delta, reason }[] — Ranks page reads for +XP/day
      rankHistory: [],      // { rankName, ts, xp }[] — captured on rank-up via _xpDelta
    };
  }

  // Write the OLD demo defaults so previews look alive without breaking the fresh-user flow.
  function seedDemo() {
    write({
      stats: { lungs: 64, brain: 78, wallet: 58, willpower: 81, body: 67 },
      streak: {
        days: 14,
        lastCleanAt: Date.now(),
        startedAt: Date.now() - 14 * 86400000,
        lostAt: null,
        previousDays: null,
        freezes: { availableThisWeek: 1, weekResetAt: Date.now() + 7 * 86400000 },
      },
      xp: 1140,
      coins: 240,
      level: 3,
      slips: [],
      statWizardsDone: { brain: Date.now() - 86400000, lungs: Date.now() - 86400000, wallet: Date.now() - 86400000, willpower: Date.now() - 86400000, body: Date.now() - 86400000 },
      lastWeekLifeScore: 66,
      restoresUsedFree: 0,
    });
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = defaultState();
        write(fresh);
        return fresh;
      }
      const s = JSON.parse(raw);
      // Roll forward freeze week if expired
      if (s.streak && s.streak.freezes && s.streak.freezes.weekResetAt < Date.now()) {
        s.streak.freezes.availableThisWeek = FREEZE_PER_WEEK;
        s.streak.freezes.weekResetAt = Date.now() + 7 * 86400000;
        write(s);
      }
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function write(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e){}
    try { window.dispatchEvent(new CustomEvent('coreStateChange', { detail: s })); } catch(e){}
  }

  function update(fn) {
    const s = read();
    const next = fn(s) || s;
    write(next);
    return next;
  }

  function lifeScore(s) {
    s = s || read();
    const v = s.stats;
    // simple weighted average; willpower carries a touch more weight
    const w = { lungs: 1, brain: 1, wallet: 1, willpower: 1.2, body: 1 };
    const total = w.lungs + w.brain + w.wallet + w.willpower + w.body;
    return Math.round((v.lungs * w.lungs + v.brain * w.brain + v.wallet * w.wallet + v.willpower * w.willpower + v.body * w.body) / total);
  }

  function rankFor(xp) {
    let r = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].min) r = RANKS[i];
    }
    const idx = RANKS.indexOf(r);
    const tier = idx + 1;
    // Iron → Legend: name is enough — no numeral suffix
    const nextR = RANKS[idx + 1];
    const toNext = nextR ? Math.max(0, nextR.min - xp) : 0;
    return { ...r, idx, tier, label: r.name, toNext };
  }

  function streakLost(s) {
    s = s || read();
    return s.streak.lostAt !== null && s.streak.days === 0;
  }

  /**
   * Day-of-trial. Returns 0 when no trial started; otherwise fractional days
   * since `coreOnboardTrial.trialStartedAt`. Caller can `Math.floor` or
   * compare ranges (e.g. `>=4 && <=5`).
   */
  function trialDay() {
    try {
      const t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}');
      if (!t || !t.trialStartedAt) return 0;
      const ms = typeof t.trialStartedAt === 'number'
        ? t.trialStartedAt
        : Date.parse(t.trialStartedAt);
      // Date.parse returns NaN on unparseable strings; both !ms and isNaN need checking
      if (!ms || Number.isNaN(ms)) return 0;
      return (Date.now() - ms) / (24 * 60 * 60 * 1000);
    } catch (e) { return 0; }
  }

  function isStreakRecoverable(s) {
    s = s || read();
    if (!streakLost(s)) return false;
    const lostHoursAgo = (Date.now() - (s.streak.lostAt || 0)) / 3600000;
    return lostHoursAgo <= 48 && (s.streak.previousDays || 0) > 0;
  }

  function logSlip(habit, opts) {
    opts = opts || {};
    const mag = opts.magnitude || 1;
    const next = update((s) => {
      s.slips.push({ habit, ts: Date.now(), magnitude: mag });
      const primary = habit === 'vape' ? 'lungs' : habit === 'doomscroll' ? 'brain' : habit === 'spend' ? 'wallet' : 'willpower';
      s.stats[primary] = clamp(s.stats[primary] - mag * 2.5, STAT_MIN, STAT_MAX);
      s.stats.willpower = clamp(s.stats.willpower - mag * 1.5, STAT_MIN, STAT_MAX);
      _xpDelta(s, -mag * 8, 'slip_' + habit);
      if (s.streak.days > 0) {
        s.streak.previousDays = s.streak.days;
        s.streak.days = 0;
        s.streak.lostAt = Date.now();
      }
      return s;
    });
    // Honest log earns +10 coins, capped once per day
    earnCoinsCapped(10, 'honest_slip', 1);
    return next;
  }

  function restoreStreak() {
    return update((s) => {
      if (!s.streak.previousDays) return s;
      s.streak.days = s.streak.previousDays;
      s.streak.lostAt = null;
      s.streak.lastCleanAt = Date.now();
      s.restoresUsedFree = (s.restoresUsedFree || 0) + 1;
      _xpDelta(s, 50, 'streak_restore');
      return s;
    });
  }

  // Public XP helper for any external earner (milestones, quests, coach completions).
  // Routes through _xpDelta so the ledger + rank-up tracking stay accurate.
  function addXp(amount, reason) {
    if (!amount) return read();
    return update((s) => { _xpDelta(s, amount, reason); return s; });
  }

  // ─── Coins economy ────────────────────────────────────────────────────────
  // Phase D: separate currency, NOT XP. Used for Shop items and peer-to-peer gifts.
  // All spends should be confirmation-gated at the UI layer (see ai_safety rule).
  const RESTORE_COIN_COST = 25;  // cost of streak restore AFTER the first free one
  function earnCoins(amount, reason) {
    if (!amount || amount <= 0) return read();
    return update((s) => {
      s.coins = (s.coins || 0) + amount;
      s.coinLedger = s.coinLedger || [];
      s.coinLedger.unshift({ ts: Date.now(), delta: +amount, reason: reason || 'earn' });
      if (s.coinLedger.length > 100) s.coinLedger.length = 100;
      return s;
    });
  }
  // Count how many times `reason` was earned today — used for daily caps.
  function earnedTodayCount(reason) {
    const s = read();
    if (!s.coinLedger) return 0;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    return s.coinLedger.filter(e => e.reason === reason && e.delta > 0 && e.ts >= todayStart.getTime()).length;
  }
  // Capped variant — earn only if today's count < limit. Returns true if awarded.
  function earnCoinsCapped(amount, reason, dailyLimit) {
    if (earnedTodayCount(reason) >= dailyLimit) return false;
    earnCoins(amount, reason);
    return true;
  }
  const DAILY_SPEND_CAP = 500;
  function spendCoins(amount, reason) {
    const s = read();
    const have = s.coins || 0;
    if (amount > have) return { ok: false, balance: have, needed: amount, reason: 'insufficient' };
    // Daily-spend cap — prevents draining the whole balance in one tap
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const spentToday = (s.coinLedger || [])
      .filter(e => e.delta < 0 && e.ts >= todayStart.getTime())
      .reduce((a, e) => a + Math.abs(e.delta), 0);
    if (spentToday + amount > DAILY_SPEND_CAP) {
      return { ok: false, balance: have, needed: amount, reason: 'daily_cap', spentToday, cap: DAILY_SPEND_CAP };
    }
    update((st) => {
      st.coins = (st.coins || 0) - amount;
      st.coinLedger = st.coinLedger || [];
      st.coinLedger.unshift({ ts: Date.now(), delta: -amount, reason: reason || 'spend' });
      if (st.coinLedger.length > 100) st.coinLedger.length = 100;
      return st;
    });
    return { ok: true, balance: read().coins };
  }
  // Convenience: cost calc for restore-streak
  function restoreCost() {
    const s = read();
    return (s.restoresUsedFree || 0) === 0 ? 0 : RESTORE_COIN_COST;
  }

  function useFreeze() {
    return update((s) => {
      if ((s.streak.freezes.availableThisWeek || 0) <= 0) return s;
      s.streak.freezes.availableThisWeek -= 1;
      // Freeze "protects" the streak — bump lastCleanAt forward so today doesn't break it.
      s.streak.lastCleanAt = Date.now();
      return s;
    });
  }

  function resetAll() {
    write(defaultState());
  }

  // Convenience reactive helpers for sample pages: bind text content to a path.
  function bind() {
    const els = document.querySelectorAll('[data-core]');
    const s = read();
    const lf = lifeScore(s);
    const r = rankFor(s.xp);
    els.forEach((el) => {
      const path = el.getAttribute('data-core');
      let v;
      switch (path) {
        case 'lifeScore':       v = lf; break;
        case 'streak.days':     v = s.streak.days; break;
        case 'streak.previous': v = s.streak.previousDays || 0; break;
        case 'xp':              v = s.xp; break;
        case 'rank.label':      v = r.label; break;
        case 'rank.color':      el.style.color = r.color; return;
        case 'freezes':         v = s.streak.freezes.availableThisWeek; break;
        case 'coins':           v = (s.coins || 0); break;
        default:
          if (path.startsWith('stats.')) {
            const key = path.slice(6);
            v = s.stats[key];
          }
      }
      if (v !== undefined && v !== null) el.textContent = String(v);
    });
  }

  // Daily login bonus — +10 coins the first time the app is opened each day.
  // Quiet success: state still triggers coreStateChange so the toast fires via core-toast.js
  function checkDailyLoginBonus() {
    try {
      const today = new Date().toDateString();
      const last = localStorage.getItem('coreLastDailyBonus');
      if (last === today) return; // already claimed today
      // Only after onboarding — don't pop a coin toast in the middle of the signup flow
      if (localStorage.getItem('coreOnboardComplete') !== '1') return;
      earnCoins(10, 'daily_login');
      localStorage.setItem('coreLastDailyBonus', today);
    } catch(e){}
  }

  function init() {
    bind();
    window.addEventListener('coreStateChange', bind);
    checkDailyLoginBonus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.coreState = {
    read, write, update,
    lifeScore, rankFor,
    streakLost, isStreakRecoverable, trialDay,
    logSlip, restoreStreak, useFreeze,
    earnCoins, spendCoins, restoreCost, earnCoinsCapped, earnedTodayCount,
    addXp,
    resetAll, bind, seedDemo,
    RANKS, RESTORE_COIN_COST,
  };
})();
