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
  const STAT_DECAY = { lungs: 0.3, brain: 0.3, wallet: 0.3, willpower: 0.35, body: 0.4, social: 0.5 };
  const STAT_RECOVER = { lungs: 1.2, brain: 1.5, wallet: 1.0, willpower: 1.0, body: 0.8, social: 1.0 };

  // Rank ladder — 11 tiers, Stone → CORE. XP threshold → rank name.
  // Each rank carries c1/c2/glow for badge rendering + `unlocks` (2 perks) the
  // profile/rank pages surface to drive progression desire. CORE is the apex.
  const RANKS = [
    { name: 'Stone',   min: 0,     max: 299,    color: '#AEB4BD', c1: '#cdd2da', c2: '#4b515b', glow: '#AEB4BD', tagline: 'Every legend starts as nothing.',      unlocks: ['Profile Unlocked', 'Daily Quests Unlocked'] },
    { name: 'Earth',   min: 300,   max: 799,    color: '#C08A4A', c1: '#d79c55', c2: '#5a3b18', glow: '#C08A4A', tagline: 'You build unshakable habits.',          unlocks: ['Inventory Unlocked', '+2% Chest Luck'] },
    { name: 'Leaf',    min: 800,   max: 1499,   color: '#57D964', c1: '#7cf07f', c2: '#176b2d', glow: '#57D964', tagline: 'Growth begins with consistency.',       unlocks: ['Weekly Quests Unlocked', '+5% XP From Habit Quests'] },
    { name: 'Water',   min: 1500,  max: 2499,   color: '#3FA9F5', c1: '#6cc4ff', c2: '#0c4a8e', glow: '#3FA9F5', tagline: 'Discipline flows, results follow.',     unlocks: ['Streak Shield Unlocked', '+5% XP From Discipline Quests'] },
    { name: 'Crystal', min: 2500,  max: 3999,   color: '#A86BF0', c1: '#c79bff', c2: '#3b1568', glow: '#A86BF0', tagline: 'Clarity turns you into strength.',      unlocks: ['Badge Slot Unlocked', 'Rare Chest Chance +3%'] },
    { name: 'Gold',    min: 4000,  max: 6499,   color: '#F5C518', c1: '#ffe27a', c2: '#7a5300', glow: '#F5C518', tagline: 'Commitment creates value.',            unlocks: ['Leaderboard Unlocked', 'Gold Profile Frame'] },
    { name: 'Ember',   min: 6500,  max: 8999,   color: '#F0463C', c1: '#ff6f63', c2: '#6b1208', glow: '#F0463C', tagline: 'Passion fuels relentless action.',     unlocks: ['Boss Quests Unlocked', '+10% XP From Hard Quests'] },
    { name: 'Wind',    min: 9000,  max: 12999,  color: '#2BD4C4', c1: '#64f0e2', c2: '#0f5a52', glow: '#2BD4C4', tagline: 'Adapt. Improve. Never settle.',        unlocks: ['Aura Slot Unlocked', 'Guild Access Preview'] },
    { name: 'Aurora',  min: 13000, max: 17999,  color: '#5B8DEF', c1: '#86b0ff', c2: '#23306b', glow: '#5B8DEF', tagline: 'Excellence becomes your standard.',     unlocks: ['Custom Titles Unlocked', 'Epic Chest Chance +5%'] },
    { name: 'Ascend',  min: 18000, max: 24999,  color: '#A05BE0', c1: '#c48cff', c2: '#4a1a8a', glow: '#A05BE0', tagline: 'You rise above the ordinary.',         unlocks: ['Elite Card Effects Unlocked', 'Advanced Stats Unlocked'] },
    { name: 'CORE',    min: 25000, max: Infinity, color: '#BBD8FF', c1: '#EAF3FF', c2: '#2a4f9b', glow: '#9CC6FF', tagline: 'You embody the highest version.',      unlocks: ['Animated CORE Card', 'Endgame Rewards Unlocked'] },
  ];

  // Gem-style rank emblems (viewBox 0 0 100 100). Use currentColor (rank colour);
  // facet layers (#fff / #000 at low opacity) give the gem sheen. Shared so the
  // profile, ranks page and rank-up overlay all render identical icons.
  const RANK_ICONS = {
    Stone:'<path d="M30 38 Q26 25 40 23 Q52 14 64 25 Q79 29 74 45 Q81 59 66 67 Q54 79 39 70 Q24 66 27 50 Q22 43 30 38Z" fill="currentColor"/><path d="M40 23 Q52 14 64 25 Q71 27 73 38 L50 47 Z" fill="#fff" opacity="0.22"/><path d="M50 47 L74 45 Q81 59 66 67 Q54 79 39 70 Z" fill="#000" opacity="0.22"/>',
    Earth:'<path d="M44 15 L59 22 L71 41 L64 66 L47 78 L33 65 L29 40 L40 26 Z" fill="currentColor"/><path d="M44 15 L59 22 L52 45 L40 26 Z" fill="#fff" opacity="0.24"/><path d="M52 45 L71 41 L64 66 L47 78 Z" fill="#000" opacity="0.24"/>',
    Leaf:'<path d="M50 13 C73 26 75 60 50 87 C25 60 27 26 50 13 Z" fill="currentColor"/><path d="M50 13 C73 26 75 60 50 87 Z" fill="#fff" opacity="0.14"/><path d="M50 21 L50 81 M50 38 L36 48 M50 53 L64 61 M50 66 L40 73" stroke="#003314" stroke-width="2.6" fill="none" opacity="0.4"/>',
    Water:'<path d="M50 13 C50 30 75 47 75 65 A25 25 0 0 1 25 65 C25 47 50 30 50 13 Z" fill="currentColor"/><path d="M50 13 C50 30 50 47 50 65 A25 25 0 0 1 25 65 C25 47 50 30 50 13 Z" fill="#000" opacity="0.12"/><ellipse cx="40" cy="58" rx="6" ry="10" fill="#fff" opacity="0.4"/>',
    Crystal:'<path d="M50 11 L67 40 L57 88 L43 88 L33 40 Z" fill="currentColor"/><path d="M50 11 L67 40 L50 47 Z" fill="#fff" opacity="0.26"/><path d="M50 11 L33 40 L50 47 Z" fill="#fff" opacity="0.10"/><path d="M50 47 L57 88 L43 88 Z" fill="#000" opacity="0.2"/>',
    Gold:'<path d="M50 13 L79 30 L79 63 L50 80 L21 63 L21 30 Z" fill="currentColor"/><path d="M50 13 L79 30 L50 41 L21 30 Z" fill="#fff" opacity="0.28"/><path d="M50 41 L79 30 L79 63 L50 80 Z" fill="#000" opacity="0.16"/><path d="M50 41 L21 30 L21 63 L50 80 Z" fill="#000" opacity="0.26"/>',
    Ember:'<path d="M50 11 C59 30 67 37 62 57 C60 76 50 85 50 85 C50 85 40 76 38 57 C33 37 41 30 50 11 Z" fill="currentColor"/><path d="M50 30 C55 43 57 51 50 66 C45 55 45 44 50 30 Z" fill="#fff" opacity="0.34"/>',
    Wind:'<path d="M50 13 L73 50 L50 87 L27 50 Z" fill="currentColor"/><path d="M50 13 L73 50 L50 57 L27 50 Z" fill="#fff" opacity="0.24"/><path d="M50 57 L73 50 L50 87 Z" fill="#000" opacity="0.18"/><path d="M50 13 L50 87" stroke="#fff" stroke-width="1.4" opacity="0.25"/>',
    Aurora:'<path d="M50 7 L58 42 L93 50 L58 58 L50 93 L42 58 L7 50 L42 42 Z" fill="currentColor"/><path d="M50 7 L58 42 L50 50 L42 42 Z" fill="#fff" opacity="0.3"/><circle cx="78" cy="26" r="2.4" fill="#fff" opacity="0.7"/><circle cx="24" cy="74" r="2" fill="#fff" opacity="0.6"/>',
    Ascend:'<path d="M21 71 L25 37 L40 53 L50 27 L60 53 L75 37 L79 71 Z" fill="currentColor"/><rect x="21" y="71" width="58" height="9" rx="2.5" fill="currentColor"/><path d="M25 37 L40 53 L50 27 Z" fill="#fff" opacity="0.2"/><circle cx="50" cy="23" r="4" fill="#fff" opacity="0.7"/>',
    CORE:'<path d="M50 15 L71 41 L50 86 L29 41 Z" fill="currentColor"/><path d="M50 15 L71 41 L50 49 L29 41 Z" fill="#fff" opacity="0.34"/><path d="M50 49 L71 41 L50 86 Z" fill="#000" opacity="0.12"/><path d="M50 15 L50 86 M29 41 L71 41" stroke="#fff" stroke-width="1.3" opacity="0.3"/><ellipse cx="50" cy="50" rx="44" ry="15" fill="none" stroke="#fff" stroke-width="2" opacity="0.45" transform="rotate(-22 50 50)"/>',
  };

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
      stats: { lungs: 0, brain: 0, wallet: 0, willpower: 0, body: 0, social: 0 },
      statLedger: [],       // { ts, stat, delta, reason }[] — drives stat.html / profile "recent gains"
      lastStatTickAt: null, // last day the passive decay tick ran (see applyStatTick)
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
      // ── RPG layer (real-life quest loop: 08-rank-reveal → 09-first-chest → 20-dashboard) ──
      class: null,          // chosen class slug, e.g. 'sentinel' — set at onboarding/rank-reveal
      inventory: [],        // { id, name, type:'armour'|'item'|'badge', rarity, slot, icon, ts }
      equipped: {},         // slot -> item id — drives the dashboard armour preview
      chests: { starterOpened: false, opened: [], progress: 0 }, // progress 0..1 to next chest
      quests: { dateKey: null, daily: [] },                       // daily { id, title, xp, done }[]
      shards: 0,            // premium currency (chests / future) — spent on upgrades
      upgrades: [],         // owned upgrade ids — permanent progression boosts
      bestStreak: 0,        // best streak ever reached (dashboard streak card)
    };
  }

  // Write the OLD demo defaults so previews look alive without breaking the fresh-user flow.
  function seedDemo() {
    write({
      stats: { lungs: 64, brain: 78, wallet: 58, willpower: 81, body: 67, social: 52 },
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
      shards: 60,
      upgrades: [],
      bestStreak: 21,
      // recent stat-raising activity so the profile stat-detail sheet has history to show
      statLedger: [
        { ts: Date.now() - 2 * 3600000,  stat: 'body',      delta: 4, reason: 'quest:morning-workout' },
        { ts: Date.now() - 5 * 3600000,  stat: 'brain',     delta: 6, reason: 'quest:deep-work-90' },
        { ts: Date.now() - 26 * 3600000, stat: 'willpower', delta: 3, reason: 'streak:day-13' },
        { ts: Date.now() - 28 * 3600000, stat: 'wallet',    delta: 5, reason: 'quest:no-spend-day' },
        { ts: Date.now() - 50 * 3600000, stat: 'lungs',     delta: 4, reason: 'quest:8h-sleep' },
        { ts: Date.now() - 52 * 3600000, stat: 'social',    delta: 5, reason: 'quest:call-a-friend' },
        { ts: Date.now() - 74 * 3600000, stat: 'brain',     delta: 3, reason: 'quest:read-20m' },
        { ts: Date.now() - 80 * 3600000, stat: 'body',      delta: 5, reason: 'quest:10k-steps' },
      ],
    });
    // Seed matching streak history so the 14-day demo streak is consistent everywhere
    // (the streak page self-heals days from real history; without backing entries it would
    // correctly clamp the demo to 0). Real users with an inflated counter still get corrected.
    try {
      const _dk = (d) => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const _hist = [];
      for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); _hist.push(_dk(d)); }
      localStorage.setItem('coreStreakHistory', JSON.stringify(_hist));
      localStorage.setItem('coreLastActiveDate', _dk(new Date()));
      localStorage.setItem('coreTodayActive', '1');
      localStorage.setItem('coreStreak', '14');
      localStorage.setItem('coreBestStreak', '21');
      localStorage.setItem('corePerfectDaysCount', '14');
    } catch (e) {}
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
      // Backfill RPG-layer fields for blobs saved before the RPG update (additive, non-destructive)
      if (s.class === undefined) s.class = null;
      if (!Array.isArray(s.inventory)) s.inventory = [];
      if (!s.equipped || typeof s.equipped !== 'object') s.equipped = {};
      if (!s.chests || typeof s.chests !== 'object') s.chests = { starterOpened: false, opened: [], progress: 0 };
      if (!s.quests || typeof s.quests !== 'object') s.quests = { dateKey: null, daily: [] };
      if (typeof s.shards !== 'number') s.shards = 0;
      if (!Array.isArray(s.upgrades)) s.upgrades = [];
      if (typeof s.bestStreak !== 'number') s.bestStreak = (s.streak && s.streak.days) || 0;
      if (!s.stats || typeof s.stats !== 'object') s.stats = defaultState().stats;
      if (s.stats.social == null) s.stats.social = 0; // Social stat added with the Life Scores grid
      if (!Array.isArray(s.statLedger)) s.statLedger = [];
      if (typeof s.lastStatTickAt !== 'number') s.lastStatTickAt = null;
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
    const w = { lungs: 1, brain: 1, wallet: 1, willpower: 1.2, body: 1, social: 1 };
    const total = w.lungs + w.brain + w.wallet + w.willpower + w.body + w.social;
    return Math.round(((v.lungs||0) * w.lungs + (v.brain||0) * w.brain + (v.wallet||0) * w.wallet + (v.willpower||0) * w.willpower + (v.body||0) * w.body + (v.social||0) * w.social) / total);
  }

  // ── Life Scores: the 6 player stats shown on the dashboard (display key → model key) ──
  // `sub` = the underlying body-stat identity (the vape-quit model) shown as a dual-label
  // alongside the RPG-6 `name` — keeps lungs/brain/etc. visible. '' = no body heritage (social).
  const STAT_DEFS = [
    { key: 'strength', model: 'body',      name: 'Strength', sub: 'Body',      color: '#FF6B6B', blurb: 'Train your body and push your physical limits.' },
    { key: 'focus',    model: 'brain',     name: 'Focus',    sub: 'Brain',     color: '#4A8FFF', blurb: 'Deep work, learning and sharp attention.' },
    { key: 'wealth',   model: 'wallet',    name: 'Wealth',   sub: 'Wallet',    color: '#FFCB3D', blurb: 'Earn, save and build your resources.' },
    { key: 'health',   model: 'lungs',     name: 'Health',   sub: 'Lungs',     color: '#34D399', blurb: 'Recovery, sleep, nutrition and breath.' },
    { key: 'social',   model: 'social',    name: 'Social',   sub: '',          color: '#B388FF', blurb: 'Connection, relationships and community.' },
    { key: 'purpose',  model: 'willpower', name: 'Purpose',  sub: 'Willpower', color: '#5EEAD4', blurb: 'Discipline, meaning and direction.' },
  ];
  function _statModel(key) { const d = STAT_DEFS.find((x) => x.key === key || x.model === key); return d ? d.model : key; }
  function statDef(key) { return STAT_DEFS.find((x) => x.key === key || x.model === key) || null; }
  function statValue(key) { const s = read(); return clamp((s.stats && s.stats[_statModel(key)]) || 0, STAT_MIN, STAT_MAX); }
  function addStat(key, amount, reason) {
    const model = _statModel(key);
    const r = update((s) => {
      if (!s.stats) s.stats = {};
      s.stats[model] = clamp((s.stats[model] || 0) + (amount || 0), STAT_MIN, STAT_MAX);
      s.statLedger = s.statLedger || [];
      s.statLedger.unshift({ ts: Date.now(), stat: model, delta: amount || 0, reason: reason || '' });
      if (s.statLedger.length > 200) s.statLedger.length = 200;
      return s;
    });
    try { window.dispatchEvent(new CustomEvent('core:progress-updated', { detail: { source: 'stat', stat: model } })); } catch (e) {}
    return r;
  }

  // Passive daily stat tick: stats listed in STAT_DECAY drift DOWN for each idle
  // calendar day (capped at 7 so a long absence can't gut your scores), with a
  // 24h grace per stat (a stat raised in the last day won't decay). Idempotent
  // within a day — safe to call on every page load. Most stats decay 0 by design
  // (only `body` currently has a non-zero rate); rates live in STAT_DECAY.
  function applyStatTick() {
    return update((s) => {
      const now = Date.now();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const last = s.lastStatTickAt || now;
      const lastStart = new Date(last); lastStart.setHours(0, 0, 0, 0);
      let days = Math.floor((todayStart.getTime() - lastStart.getTime()) / 86400000);
      if (days <= 0) { if (!s.lastStatTickAt) s.lastStatTickAt = now; return s; }
      // Active streak freeze pauses decay — forgive this run entirely (no drift while frozen).
      if (s.streak && s.streak.frozenUntil && s.streak.frozenUntil > now) { s.lastStatTickAt = now; return s; }
      days = Math.min(days, 7);
      if (!s.stats) s.stats = {};
      Object.keys(STAT_DECAY).forEach((k) => {
        const dec = STAT_DECAY[k] || 0; if (dec <= 0) return;
        const raisedRecently = (s.statLedger || []).some((e) => e.stat === k && e.delta > 0 && (now - e.ts) < 86400000);
        if (raisedRecently) return;
        const before = s.stats[k] || 0;
        const after = clamp(before - dec * days, STAT_MIN, STAT_MAX);
        if (after !== before) {
          s.statLedger = s.statLedger || [];
          s.statLedger.unshift({ ts: now, stat: k, delta: Math.round((after - before) * 10) / 10, reason: 'decay' });
          if (s.statLedger.length > 200) s.statLedger.length = 200;
        }
        s.stats[k] = after;
      });
      s.lastStatTickAt = now;
      return s;
    });
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
    const s = update((st) => { _xpDelta(st, amount, reason); return st; });
    syncProgress();
    return s;
  }

  // ─── Coins economy ────────────────────────────────────────────────────────
  // Phase D: separate currency, NOT XP. Used for Shop items and peer-to-peer gifts.
  // All spends should be confirmation-gated at the UI layer (see ai_safety rule).
  const RESTORE_COIN_COST = 25;  // cost of streak restore AFTER the first free one
  function earnCoins(amount, reason) {
    if (!amount || amount <= 0) return read();
    if (corePlusActive()) amount = amount * 2;   // CORE Plus: 2× coins
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
  const DAILY_SPEND_CAP = 20000; // headroom for chest purchases (Mythic = 15000)
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
      // ...and pauses passive stat decay through the end of today (see applyStatTick).
      var eod = new Date(); eod.setHours(23, 59, 59, 999); s.streak.frozenUntil = eod.getTime();
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

  // ── RPG layer helpers (shared by 08-rank-reveal, 09-first-chest, 20-dashboard) ──
  // Set the user's class once (slug, e.g. 'sentinel'). Called at rank-reveal/onboarding.
  function setClass(slug) {
    return update((s) => { s.class = slug; return s; });
  }

  // Add an item/armour/badge to the inventory. Returns the stored item (with id + ts).
  function addItem(item) {
    const it = { id: item.id || ('it_' + Date.now()), ts: Date.now(), type: 'item', rarity: 'common', ...item };
    update((s) => { s.inventory.unshift(it); return s; });
    return it;
  }

  // Equip an item into its slot — drives the dashboard armour preview.
  function equipItem(itemId, slot) {
    return update((s) => { if (slot) s.equipped[slot] = itemId; return s; });
  }

  // Open the one-time starter chest: store the reward + mark it opened. Idempotent.
  function openStarterChest(item) {
    if (read().chests.starterOpened) return read().inventory[0] || null;
    const it = addItem(item);
    update((s) => { s.chests.starterOpened = true; s.chests.opened.unshift('starter'); return s; });
    return it;
  }

  // Ensure today's daily quests exist. `seed` is a fn returning [{ id, title, xp }],
  // called only when the set is stale. Returns the active daily list.
  function ensureDailyQuests(seed) {
    const today = new Date().toDateString();
    return update((s) => {
      if (s.quests.dateKey === today && s.quests.daily.length) return s;
      const list = (typeof seed === 'function' ? seed() : []) || [];
      s.quests.dateKey = today;
      s.quests.daily = list.map((q) => ({ done: false, xp: 10, ...q }));
      return s;
    }).quests.daily;
  }

  // ─── CORE Plus (subscription) — dev toggle until real billing is wired ──────
  // Perks: 2× XP + 2× coins, and a weekly Epic chest. Enabled from the paywall's
  // dev toggle; stored as a flat flag so every page picks it up instantly.
  function corePlusActive() { try { return localStorage.getItem('corePlusActive') === '1'; } catch (e) { return false; } }
  function setCorePlus(on) {
    try {
      localStorage.setItem('corePlusActive', on ? '1' : '0');
      if (on) grantPlusWeekly(true); // drop the first weekly chest immediately
    } catch (e) {}
    return corePlusActive();
  }
  // Grant the weekly Epic chest if due (or force one on activation). Adds a
  // chest_epic to coreOwnedChests so it opens through the normal opener.
  function grantPlusWeekly(force) {
    if (!corePlusActive()) return false;
    try {
      const due = parseInt(localStorage.getItem('corePlusNextChestAt') || '0', 10) || 0;
      if (!force && Date.now() < due) return false;
      const owned = JSON.parse(localStorage.getItem('coreOwnedChests') || '[]');
      const arr = Array.isArray(owned) ? owned : [];
      arr.push('chest_epic'); localStorage.setItem('coreOwnedChests', JSON.stringify(arr));
      localStorage.setItem('corePlusNextChestAt', String(Date.now() + 7 * 86400000));
      return true;
    } catch (e) { return false; }
  }

  // XP multiplier from owned upgrades (XP Boost I/II stack additively) ×CORE Plus.
  function xpMultiplier(s) {
    s = s || read();
    const u = s.upgrades || [];
    const base = 1 + (u.indexOf('xpboost1') >= 0 ? 0.05 : 0) + (u.indexOf('xpboost2') >= 0 ? 0.10 : 0);
    return base * (corePlusActive() ? 2 : 1);
  }

  function hasUpgrade(id) { return (read().upgrades || []).indexOf(id) >= 0; }

  // Buy a permanent upgrade with coins or shards. Returns {ok, balance, reason}.
  function buyUpgrade(id, cost, currency) {
    const cur = (currency === 'shards') ? 'shards' : 'coins';
    const s = read();
    if ((s.upgrades || []).indexOf(id) >= 0) return { ok: false, reason: 'owned' };
    const have = s[cur] || 0;
    if (have < cost) return { ok: false, reason: 'insufficient', balance: have, needed: cost };
    update((st) => { st[cur] = (st[cur] || 0) - cost; st.upgrades = st.upgrades || []; st.upgrades.push(id); return st; });
    return { ok: true, balance: read()[cur] };
  }

  // Complete a daily quest: mark done + award its (boosted) XP once + nudge chest progress.
  function completeQuest(id) {
    const r = update((s) => {
      const q = (s.quests.daily || []).find((x) => x.id === id);
      if (!q || q.done) return s;
      q.done = true;
      const award = Math.round((q.xp || 10) * xpMultiplier(s));
      _xpDelta(s, award, 'quest:' + id);
      // Life Score gain — completing a quest raises its matching stat
      if (q.stat) {
        const m = _statModel(q.stat), gain = q.statGain || 2;
        if (!s.stats) s.stats = {};
        s.stats[m] = clamp((s.stats[m] || 0) + gain, STAT_MIN, STAT_MAX);
        s.statLedger = s.statLedger || [];
        s.statLedger.unshift({ ts: Date.now(), stat: m, delta: gain, reason: 'quest:' + id });
        if (s.statLedger.length > 200) s.statLedger.length = 200;
      }
      s.chests.progress = clamp((s.chests.progress || 0) + 0.25, 0, 1);
      if ((s.streak && s.streak.days || 0) > (s.bestStreak || 0)) s.bestStreak = s.streak.days;
      return s;
    });
    syncProgress();
    return r;
  }

  // Count of unlocked achievements — shared by profile + dashboard so CORE Power matches.
  function achievementsUnlocked() {
    const s = read();
    const xp = s.xp || 0, streak = (s.streak && s.streak.days) || 0;
    let friends = 0; try { friends = (JSON.parse(localStorage.getItem('coreFriends') || '[]') || []).length; } catch (e) {}
    const questsDone = (s.xpLedger || []).filter((e) => (e.reason || '').indexOf('quest:') === 0).length;
    const rankIdx = rankFor(xp).idx;
    let n = 2; // First Login + First Rank are always unlocked here
    if (localStorage.getItem('coreOnboardComplete') === '1' || s.class) n++;
    if (s.chests && s.chests.starterOpened) n++;
    if (questsDone > 0) n++;
    if (streak >= 7) n++;
    if (xp >= 1000) n++;
    if (rankIdx >= 5) n++;
    if (friends >= 10) n++;
    return n;
  }

  // CORE Power — the single flex stat. ONE formula, both pages call it (live sync).
  function corePower() {
    const s = read();
    const xp = s.xp || 0, level = Math.floor(xp / 300) + 1, streak = (s.streak && s.streak.days) || 0;
    const items = (s.inventory || []).length;
    let friends = 0; try { friends = (JSON.parse(localStorage.getItem('coreFriends') || '[]') || []).length; } catch (e) {}
    const powerUp = (s.upgrades || []).indexOf('powercore') >= 0 ? 100 : 0;
    return level * 100 + xp + streak * 25 + items * 50 + achievementsUnlocked() * 75 + friends * 30 + powerUp;
  }

  // ── Shared progression: one source of truth across every page ──
  function levelFor(xp) { return Math.floor((xp || 0) / 300) + 1; }

  // All perks unlocked at the current rank (cumulative across ranks ≤ current).
  function unlockedPerks(xp) {
    if (typeof xp !== 'number') xp = read().xp || 0;
    const idx = rankFor(xp).idx;
    let out = [];
    for (let i = 0; i <= idx; i++) out = out.concat(RANKS[i].unlocks || []);
    return out;
  }

  // Sub-tier (I/II/III) for every rank EXCEPT the apex (CORE), which has no numeral
  // and resets each season. Shared so every page shows the same label/progress.
  function rankTier(xp) {
    if (typeof xp !== 'number') xp = read().xp || 0;
    const r = rankFor(xp), idx = r.idx, ROMAN = ['I', 'II', 'III'];
    const nextRank = RANKS[idx + 1] || null;
    if (!nextRank) { // apex (CORE) — no sub-tier
      return { name: r.name, idx: idx, roman: '', full: r.name, sub: 0, isMax: true,
        next: 'MAX', nextRank: null, bandPct: 100, subPct: 100, color: r.color, glow: r.glow, c1: r.c1, c2: r.c2, toNext: 0 };
    }
    const lo = r.min, hi = xp + r.toNext, third = Math.max(1, (hi - lo) / 3);
    const sub = Math.max(0, Math.min(2, Math.floor((xp - lo) / third)));
    const subInto = ((xp - lo) - sub * third) / third;
    const full = r.name + ' ' + ROMAN[sub];
    const next = sub < 2 ? (r.name + ' ' + ROMAN[sub + 1]) : (nextRank.name + ' I');
    const bandPct = Math.round(((xp - lo) / Math.max(1, hi - lo)) * 100);
    return { name: r.name, idx: idx, roman: ROMAN[sub], full: full, sub: sub, isMax: false,
      next: next, nextRank: nextRank, bandPct: bandPct, subPct: Math.round(Math.max(0, Math.min(1, subInto)) * 100),
      color: r.color, glow: r.glow, c1: r.c1, c2: r.c2, toNext: r.toNext };
  }

  // Recalculate rank/level/power, mirror to the shared localStorage keys the spec
  // defines, detect rank-up (stash a pending overlay payload), and broadcast.
  // Safe to call on any page load and after any XP change. Does NOT call write(),
  // so it can't recurse with coreStateChange listeners.
  function syncProgress() {
    try { grantPlusWeekly(); } catch (e) {}   // CORE Plus weekly Epic chest, if due
    const s = read();
    const xp = s.xp || 0;
    const r = rankFor(xp), idx = r.idx, level = levelFor(xp), power = corePower(), perks = unlockedPerks(xp);
    let prevIdx;
    try { const v = localStorage.getItem('coreLastRankIndex'); prevIdx = (v === null) ? idx : parseInt(v, 10); } catch (e) { prevIdx = idx; }
    if (idx > prevIdx) {
      try {
        localStorage.setItem('corePendingRankUp', 'true');
        localStorage.setItem('corePendingRankUpData', JSON.stringify({
          oldIndex: prevIdx, newIndex: idx,
          oldRank: (RANKS[prevIdx] || RANKS[0]).name, newRank: r.name, perks: r.unlocks || [],
        }));
      } catch (e) {}
    }
    try {
      localStorage.setItem('coreRank', r.name);
      localStorage.setItem('coreRankIndex', String(idx));
      localStorage.setItem('coreLevel', String(level));
      localStorage.setItem('coreTotalXP', String(xp));
      localStorage.setItem('coreCorePower', String(power));
      localStorage.setItem('coreStreak', String((s.streak && s.streak.days) || 0));
      localStorage.setItem('coreUnlockedPerks', JSON.stringify(perks));
      localStorage.setItem('coreLastRankIndex', String(idx));
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('core:progress-updated', { detail: { rank: r.name, rankIndex: idx, level: level, xp: xp, power: power, perks: perks } })); } catch (e) {}
    return { rankIndex: idx, prevIndex: prevIdx, leveledUp: idx > prevIdx, level: level, power: power };
  }

  function pendingRankUp() {
    try { if (localStorage.getItem('corePendingRankUp') !== 'true') return null; return JSON.parse(localStorage.getItem('corePendingRankUpData') || 'null'); } catch (e) { return null; }
  }
  function clearPendingRankUp() { try { localStorage.setItem('corePendingRankUp', 'false'); } catch (e) {} }

  // ── Chest engine ──────────────────────────────────────────────────────────
  // One source of truth for the drop table, used by the dedicated opener
  // (28-chest.html) the Shop and Dashboard route to. Mirrors the original shop
  // logic so odds stay identical: a chest of floor-rarity rolls UP (never below
  // its tier); `noUp` keeps the small free/daily chest at floor. Chest Hunter
  // upgrade nudges the up-roll odds.
  const CHEST_RAR_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const CHEST_ITEMS = {
    common:    { name: 'Iron Trinket',  type: 'item',   slot: null,    ic: '<circle cx="12" cy="12" r="7"/>' },
    rare:      { name: 'Azure Border',  type: 'border', slot: 'frame', ic: '<rect x="4" y="4" width="16" height="16" rx="3"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>' },
    epic:      { name: 'Aurora Effect', type: 'effect', slot: 'aura',  ic: '<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>' },
    legendary: { name: 'Golden Aura',   type: 'effect', slot: 'aura',  ic: '<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' },
    mythic:    { name: 'CORE Sigil',    type: 'effect', slot: 'aura',  ic: '<path d="M12 3l7 6-3 11H8L5 9z"/><path d="M12 3v18"/>' },
  };
  const CHEST_RAR_COLOR = { common: '#9AA1B7', rare: '#4A8FFF', epic: '#B388FF', legendary: '#FFD98A', mythic: '#FF5C8A' };
  function chestRarColor(r) { return CHEST_RAR_COLOR[String(r || '').toLowerCase()] || '#FFD98A'; }

  function rollChest(floorRar, noUp) {
    const floor = Math.max(0, CHEST_RAR_ORDER.indexOf(String(floorRar || 'common').toLowerCase()));
    const bonus = hasUpgrade('chesthunter') ? 0.04 : 0;
    const r = Math.random();
    let up = 0;
    if (!noUp) { if (r > 0.92 - bonus) up = 2; else if (r > 0.62 - bonus) up = 1; }
    const tier = Math.min(4, floor + up);
    const rar = CHEST_RAR_ORDER[tier];
    const item = CHEST_ITEMS[rar];
    const xp = Math.round((60 + tier * 25) * xpMultiplier());
    const coinsR = 40 + tier * 30;
    const shards = tier >= 1 ? tier * 2 : 1;
    const reveals = [
      { kind: 'xp',     n: '+' + xp + ' XP',         r: 'rare',   ic: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z"/>' },
      { kind: 'coins',  n: '+' + coinsR + ' Coins',  r: 'common', ic: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/>' },
      { kind: 'shards', n: '+' + shards + ' Shards', r: 'epic',   ic: '<path d="M12 2l4 7-4 13-4-13z"/>' },
      { kind: 'item',   n: item.name, r: rar, ic: item.ic, hi: true },
    ];
    return { rar: rar, tier: tier, floor: floor, item: item, rid: 'chest_' + rar + '_' + Date.now(), xp: xp, coins: coinsR, shards: shards, reveals: reveals };
  }

  // Apply a rolled chest to state: XP + coins + shards + inventory item, record the
  // open, broadcast. `source` tags the ledger entries ('shop' / 'daily' / 'rank').
  function grantChest(roll, source) {
    if (!roll) return null;
    source = source || 'chest';
    try { addXp(roll.xp, 'chest:' + source); } catch (e) {}
    try { earnCoins(roll.coins, 'chest:' + source); } catch (e) {}
    if (roll.shards > 0) update((s) => { s.shards = (s.shards || 0) + roll.shards; return s; });
    let it = null;
    try {
      it = addItem({ id: roll.rid || ('chest_' + roll.rar + '_' + Date.now()), name: roll.item.name,
        type: roll.item.type, rarity: roll.rar, slot: roll.item.slot || undefined, source: source });
    } catch (e) {}
    update((s) => { s.chests = s.chests || { opened: [] }; s.chests.opened = s.chests.opened || []; s.chests.opened.unshift(source + '_' + Date.now()); return s; });
    syncProgress();
    return it;
  }

  window.coreState = {
    read, write, update,
    lifeScore, rankFor, corePower, achievementsUnlocked,
    STAT_DEFS, statDef, statValue, addStat, applyStatTick,
    levelFor, unlockedPerks, rankTier, syncProgress, pendingRankUp, clearPendingRankUp,
    streakLost, isStreakRecoverable, trialDay,
    logSlip, restoreStreak, useFreeze,
    earnCoins, spendCoins, restoreCost, earnCoinsCapped, earnedTodayCount,
    addXp,
    setClass, addItem, equipItem, openStarterChest, ensureDailyQuests, completeQuest,
    buyUpgrade, hasUpgrade, xpMultiplier,
    rollChest, grantChest, chestRarColor,
    corePlusActive, setCorePlus, grantPlusWeekly,
    resetAll, bind, seedDemo,
    RANKS, RANK_ICONS, RESTORE_COIN_COST, CHEST_ITEMS, CHEST_RAR_ORDER,
  };
})();
