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
  // Per-idle-day passive drift (pts/day, ×days capped 7, 24h grace after a raise). Pre-launch-gentle:
  // recovery/resource stats stay sticky (lung recovery + money don't evaporate); maintenance-heavy
  // stats (willpower/social/body) fade faster. Tunable — flagged to Stone 2026-06-04.
  const STAT_DECAY = { lungs: 0.15, brain: 0.25, wallet: 0.1, willpower: 0.35, body: 0.3, social: 0.4 };
  // Rebound multiplier: returning to a recently-decayed stat gains EXTRA (rate-1)
  // on quest-driven gains, so neglected stats bounce back faster. All > 1 so every
  // stat rewards a comeback (brain/social rebound hardest). Used by addStat().
  const STAT_RECOVER = { lungs: 1.3, brain: 1.4, wallet: 1.2, willpower: 1.25, body: 1.15, social: 1.35 };
  const DECAY_START_XP = 600; // passive stat decay is paused until this XP (~Level 3) — onboarding grace

  // Rank ladder — 11 tiers, Stone -> CORE. XP threshold -> rank name.
  // Each rank carries c1/c2/glow for badge rendering + `unlocks` (2 perks) the
  // profile/rank pages surface to drive progression desire. CORE is the apex.
  // ── NEW LADDER (2026-06-07) — 11 ranks × 3 tiers (I/II/III) = 33 steps.
  // Material progression: matte (Sand/Clay) → metallic (Stone→Gold) → strong-identity
  // gems (Emerald→Obsidian) → radiant apex (Solar→Celestial). Tiers are derived from
  // each rank's [min,max] band by rankTier(); Celestial has a FINITE max so it tiers too.
  const RANKS = [
    { name: 'Sand',      min: 0,     max: 249,   color: '#D9C7A0', c1: '#efe3c4', c2: '#5b513a', glow: '#D9C7A0', tagline: 'The first grain.',      unlocks: ['Profile Unlocked', 'Daily Quests Unlocked'] },
    { name: 'Clay',      min: 250,   max: 649,   color: '#C26B4A', c1: '#dd8a66', c2: '#4a2719', glow: '#C26B4A', tagline: 'Molded by effort.',                 unlocks: ['Inventory Unlocked', '+2% Chest Luck'] },
    { name: 'Stone',     min: 650,   max: 1249,  color: '#9BA3AE', c1: '#c4cad3', c2: '#3c4047', glow: '#9BA3AE', tagline: 'Solid and steady.',             unlocks: ['Weekly Quests Unlocked', 'Streak Shield Unlocked'] },
    { name: 'Copper',    min: 1250,  max: 2149,  color: '#CC7A3F', c1: '#ec9a5d', c2: '#54290f', glow: '#D9894F', tagline: 'Forged by commitment.',         unlocks: ['Badge Slot Unlocked', '+5% XP From Habit Quests'] },
    { name: 'Silver',    min: 2150,  max: 3449,  color: '#C7D0DC', c1: '#f0f4fa', c2: '#4c535f', glow: '#D7DEE8', tagline: 'Strength in motion.',               unlocks: ['Leaderboard Unlocked', 'Silver Profile Frame'] },
    { name: 'Gold',      min: 3450,  max: 5299,  color: '#F5C518', c1: '#ffe488', c2: '#6b4a00', glow: '#FFD23D', tagline: 'Excellence in action.',             unlocks: ['Boss Quests Unlocked', 'Gold Profile Frame'] },
    { name: 'Emerald',   min: 5300,  max: 7899,  color: '#22D17E', c1: '#74f2b4', c2: '#0a5836', glow: '#2EE08C', tagline: 'Growth unstoppable.',              unlocks: ['Rare Chest Chance +5%', 'Custom Titles Unlocked'] },
    { name: 'Sapphire',  min: 7900,  max: 11499, color: '#3D74F0', c1: '#86abff', c2: '#142c66', glow: '#4D84FF', tagline: 'Focus. Discipline. Power.',          unlocks: ['Aura Slot Unlocked', 'Epic Chest Chance +5%'] },
    { name: 'Obsidian',  min: 11500, max: 16499, color: '#9B6CF0', c1: '#c6a3ff', c2: '#241247', glow: '#A87CFF', tagline: 'Darkness mastered.',               unlocks: ['Guild Access Unlocked', 'Advanced Stats Unlocked'] },
    { name: 'Solar',     min: 16500, max: 23499, color: '#FF9A2E', c1: '#ffd486', c2: '#6e3200', glow: '#FFAE47', tagline: 'Radiate your strength.',          unlocks: ['Elite Card Effects', 'Legendary Chest Chance +8%'] },
    { name: 'Celestial', min: 23500, max: 33400, color: '#C7B6FF', c1: '#ffffff', c2: '#272c63', glow: '#CFC0FF', tagline: 'Beyond limits.',     unlocks: ['Animated Celestial Card', 'Prestige · Seasonal Endgame Rewards'] },
  ];

  // Gem-style rank emblems (viewBox 0 0 100 100). Use currentColor (rank colour);
  // facet layers (#fff / #000 at low opacity) give the gem sheen. Shared so the
  // profile, ranks page and rank-up overlay all render identical icons.
  // Gem-style rank emblems (viewBox 0 0 100 100), keyed by rank name. Use currentColor
  // (the rank colour, set via `.gem{color:var(--c)}`) plus #fff/#000 opacity facets — NO
  // gradient <defs> ids (many gems render at once on the ladder; shared ids would collide).
  // Material progression: matte pebble/clay → metallic polygons → cut gems → shard/star.
  // Rendered by _lib/core-gems.js (coreGems.svg) across the profile, ranks page & overlays.
  const RANK_ICONS = {
    Sand:'<path d="M24 58 Q21 41 39 37 Q50 27 63 37 Q80 43 76 60 Q69 73 50 71 Q31 73 24 58Z" fill="currentColor"/><path d="M39 37 Q50 27 63 37 Q72 41 74 51 Q58 45 39 37Z" fill="#fff" opacity="0.16"/><path d="M50 71 Q31 73 24 58 Q40 64 50 61 Q64 65 76 60 Q69 73 50 71Z" fill="#000" opacity="0.16"/><circle cx="41" cy="53" r="1.4" fill="#000" opacity="0.12"/><circle cx="57" cy="57" r="1.6" fill="#000" opacity="0.1"/><circle cx="50" cy="47" r="1.2" fill="#fff" opacity="0.18"/>',
    Clay:'<path d="M30 41 Q30 32 50 32 Q70 32 70 41 L66 66 Q64 74 50 74 Q36 74 34 66Z" fill="currentColor"/><path d="M30 41 Q30 32 50 32 Q70 32 70 41 L67 48 Q50 42 33 48Z" fill="#fff" opacity="0.18"/><path d="M34 66 Q36 74 50 74 Q64 74 66 66 L67 48 Q50 54 33 48Z" fill="#000" opacity="0.18"/><path d="M33 42 Q50 48 67 42" stroke="#000" stroke-width="1.4" opacity="0.16" fill="none"/>',
    Stone:'<path d="M28 44 L40 30 L60 28 L74 42 L70 64 L54 74 L34 68 L24 54Z" fill="currentColor"/><path d="M40 30 L60 28 L74 42 L52 50Z" fill="#fff" opacity="0.2"/><path d="M52 50 L70 64 L54 74 L34 68 L24 54 L28 44Z" fill="#000" opacity="0.2"/><path d="M52 50 L28 44 M52 50 L70 64 M52 50 L42 31" stroke="#fff" stroke-width="1" opacity="0.12" fill="none"/>',
    Copper:'<path d="M50 16 L78 32 L78 64 L50 80 L22 64 L22 32Z" fill="currentColor"/><path d="M50 16 L78 32 L50 44 L22 32Z" fill="#fff" opacity="0.3"/><path d="M50 44 L22 32 L22 64 L50 80Z" fill="#000" opacity="0.26"/><path d="M50 44 L78 32 L78 64 L50 80Z" fill="#000" opacity="0.14"/><path d="M50 16 L58 20 L34 33 L26 29Z" fill="#fff" opacity="0.2"/>',
    Silver:'<path d="M38 18 L62 18 L82 38 L82 62 L62 82 L38 82 L18 62 L18 38Z" fill="currentColor"/><path d="M38 18 L62 18 L82 38 L50 50 L18 38Z" fill="#fff" opacity="0.34"/><path d="M50 50 L82 38 L82 62 L62 82 L38 82 L18 62 L18 38Z" fill="#000" opacity="0.18"/><path d="M38 18 L46 22 L26 38 L20 34Z" fill="#fff" opacity="0.42"/><circle cx="50" cy="50" r="2.4" fill="#fff" opacity="0.5"/>',
    Gold:'<path d="M50 20 L74 38 L62 80 L38 80 L26 38Z" fill="currentColor"/><path d="M50 20 L74 38 L50 46 L26 38Z" fill="#fff" opacity="0.34"/><path d="M50 46 L74 38 L62 80 L50 80Z" fill="#000" opacity="0.14"/><path d="M50 46 L26 38 L38 80 L50 80Z" fill="#000" opacity="0.22"/><path d="M50 20 L50 46 M26 38 L74 38" stroke="#fff" stroke-width="1.1" opacity="0.25" fill="none"/>',
    Emerald:'<path d="M34 24 L66 24 L76 34 L76 66 L66 76 L34 76 L24 66 L24 34Z" fill="currentColor"/><path d="M34 24 L66 24 L76 34 L62 38 L38 38 L24 34Z" fill="#fff" opacity="0.28"/><path d="M24 66 L34 76 L66 76 L76 66 L62 62 L38 62Z" fill="#000" opacity="0.22"/><path d="M24 34 L38 38 L38 62 L24 66Z" fill="#000" opacity="0.12"/><path d="M76 34 L62 38 L62 62 L76 66Z" fill="#000" opacity="0.12"/><rect x="38" y="38" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.1" opacity="0.2"/>',
    Sapphire:'<path d="M50 16 L72 40 L50 84 L28 40Z" fill="currentColor"/><path d="M50 16 L72 40 L50 48 L28 40Z" fill="#fff" opacity="0.32"/><path d="M28 40 L50 48 L50 84Z" fill="#000" opacity="0.24"/><path d="M72 40 L50 48 L50 84Z" fill="#000" opacity="0.12"/><path d="M50 16 L50 48 M28 40 L72 40 M50 48 L34 56 M50 48 L66 56" stroke="#fff" stroke-width="1" opacity="0.22" fill="none"/><path d="M67 25 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6Z" fill="#fff" opacity="0.75"/>',
    Obsidian:'<path d="M36 46 L24 40 L30 70 L44 84Z" fill="currentColor" opacity="0.88"/><path d="M64 46 L76 40 L70 70 L56 84Z" fill="currentColor" opacity="0.8"/><path d="M50 14 L64 46 L56 84 L44 84 L36 46Z" fill="currentColor"/><path d="M50 14 L64 46 L50 52Z" fill="#000" opacity="0.3"/><path d="M50 52 L56 84 L44 84Z" fill="#000" opacity="0.36"/><path d="M50 14 L36 46 L44 49Z" fill="#fff" opacity="0.3"/><path d="M50 18 L50 80" stroke="#fff" stroke-width="1" opacity="0.16" fill="none"/><circle cx="44" cy="40" r="1.6" fill="#fff" opacity="0.5"/>',
    Solar:'<path d="M50 8 L56 30 L78 22 L66 42 L90 50 L66 58 L78 78 L56 70 L50 92 L44 70 L22 78 L34 58 L10 50 L34 42 L22 22 L44 30Z" fill="currentColor"/><circle cx="50" cy="50" r="16" fill="currentColor"/><circle cx="50" cy="50" r="16" fill="#fff" opacity="0.22"/><circle cx="45" cy="45" r="6" fill="#fff" opacity="0.5"/><circle cx="78" cy="30" r="1.8" fill="#fff" opacity="0.75"/><circle cx="24" cy="70" r="1.5" fill="#fff" opacity="0.6"/><circle cx="74" cy="72" r="1.4" fill="#fff" opacity="0.6"/>',
    Celestial:'<path d="M50 6 C53 36 64 47 94 50 C64 53 53 64 50 94 C47 64 36 53 6 50 C36 47 47 36 50 6Z" fill="currentColor"/><circle cx="50" cy="50" r="16" fill="#fff" opacity="0.16"/><circle cx="50" cy="50" r="9" fill="#fff" opacity="0.8"/><path d="M79 23 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#fff" opacity="0.85"/><path d="M23 75 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6Z" fill="#fff" opacity="0.7"/><circle cx="84" cy="60" r="1.6" fill="#fff" opacity="0.7"/><circle cx="18" cy="38" r="1.5" fill="#fff" opacity="0.6"/>',
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
      // ── RPG layer (real-life quest loop: 08-rank-reveal -> 09-first-chest -> 20-dashboard) ──
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
      lastStatTickAt: Date.now(), // anchor the decay clock — demo scores never drift on plain reload
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

  // ── Life Scores: the 6 player stats shown on the dashboard (display key -> model key) ──
  // `sub` = the underlying body-stat identity (the vape-quit model) shown as a dual-label
  // alongside the RPG-6 `name` — keeps lungs/brain/etc. visible. '' = no body heritage (social).
  // Single source of truth for the 6 stats. `emoji`/`icon`(SVG inner paths)/`tip` live here so
  // profile, dashboard, stat.html and friends all render identical stat identity — no per-page copies.
  const STAT_DEFS = [
    { key: 'strength', page: 'gym.html',      model: 'body',      name: 'Strength', sub: 'Body',      color: '#FF6B6B', emoji: '', blurb: 'Train your body and push your physical limits.', tip: 'Log workouts and physical quests to build Strength.', icon: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>' },
    { key: 'focus',    page: 'focus.html',    model: 'brain',     name: 'Focus',    sub: 'Brain',     color: '#4A8FFF', emoji: '', blurb: 'Deep work, learning and sharp attention.', tip: 'Deep work and learning quests sharpen your Focus.', icon: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 1.5v3M12 19.5v3M22.5 12h-3M4.5 12h-3"/>' },
    { key: 'wealth',   page: 'wealth.html',   model: 'wallet',    name: 'Wealth',   sub: 'Wallet',    color: '#FFCB3D', emoji: '', blurb: 'Earn, save and build your resources.', tip: 'Save, earn and clear money quests to grow Wealth.', icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.6 10h4a1.6 1.6 0 0 1 0 3.2h-3.2a1.6 1.6 0 0 0 0 3.2h4.2"/>' },
    { key: 'health',   model: 'lungs',     name: 'Health',   sub: 'Lungs',     color: '#34D399', emoji: '', blurb: 'Recovery, sleep, nutrition and breath.', tip: 'Sleep, breathe and recover — health quests raise this.', icon: '<path d="M12 20.5s-7.2-4.6-7.2-9.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 7.2 3.7c0 5.2-7.2 9.8-7.2 9.8Z"/>' },
    { key: 'social',   model: 'social',    name: 'Social',   sub: '',          color: '#B388FF', emoji: '', blurb: 'Connection, relationships and community.', tip: 'Add friends and finish social quests to level up.', icon: '<circle cx="9" cy="8" r="3.2"/><path d="M3.4 20a5.6 5.6 0 0 1 11.2 0M16 5.2a3.2 3.2 0 0 1 0 6M18.7 20a5.6 5.6 0 0 0-3.1-5"/>' },
    { key: 'purpose',  model: 'willpower', name: 'Purpose',  sub: 'Willpower', color: '#5EEAD4', emoji: '', blurb: 'Discipline, meaning and direction.', tip: 'Hold your streak and complete daily quests for Purpose.', icon: '<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>' },
  ];
  function _statModel(key) { const d = STAT_DEFS.find((x) => x.key === key || x.model === key); return d ? d.model : key; }
  function statDef(key) { return STAT_DEFS.find((x) => x.key === key || x.model === key) || null; }
  function statValue(key) { const s = read(); return clamp((s.stats && s.stats[_statModel(key)]) || 0, STAT_MIN, STAT_MAX); }
  // Projected recovery rebound for a would-be quest gain (extra (rate-1)*amount if the
  // stat decayed in the last 7 days). Shared by addStat (grant) + rewardBundle (preview).
  function recoverBonus(key, amount) {
    if ((amount || 0) <= 0) return 0;
    const model = _statModel(key);
    const since = Date.now() - 7 * 86400000;
    const decayed = (read().statLedger || []).some((e) => e.stat === model && e.reason === 'decay' && e.delta < 0 && e.ts >= since);
    return decayed ? Math.min(3, Math.ceil(amount * Math.max(0, (STAT_RECOVER[model] || 1) - 1))) : 0;
  }
  function addStat(key, amount, reason) {
    const model = _statModel(key);
    // Recovery rebound — a quest gain to a stat that decayed in the last 7 days
    // rebounds faster (×STAT_RECOVER), logged separately as 'recover'.
    let bonus = 0;
    if ((amount || 0) > 0 && reason && reason.indexOf('quest:') === 0) {
      const since = Date.now() - 7 * 86400000;
      const decayed = (read().statLedger || []).some((e) => e.stat === model && e.reason === 'decay' && e.delta < 0 && e.ts >= since);
      if (decayed) bonus = Math.round(amount * Math.max(0, (STAT_RECOVER[model] || 1) - 1));
    }
    const r = update((s) => {
      if (!s.stats) s.stats = {};
      s.stats[model] = clamp((s.stats[model] || 0) + (amount || 0) + bonus, STAT_MIN, STAT_MAX);
      s.statLedger = s.statLedger || [];
      s.statLedger.unshift({ ts: Date.now(), stat: model, delta: amount || 0, reason: reason || '' });
      if (bonus > 0) s.statLedger.unshift({ ts: Date.now(), stat: model, delta: bonus, reason: 'recover' });
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
    const s = read();
    const now = Date.now();
    // Pause passive decay during onboarding — no drift until ~Level 3 (xp >= 600). Anchor the
    // tick clock once (so decay later starts fresh, not retroactively), then no-op.
    if ((s.xp || 0) < DECAY_START_XP) {
      if (s.lastStatTickAt == null) { s.lastStatTickAt = now; write(s); }
      return s;
    }
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const last = s.lastStatTickAt || now;
    const lastStart = new Date(last); lastStart.setHours(0, 0, 0, 0);
    let days = Math.floor((todayStart.getTime() - lastStart.getTime()) / 86400000);
    // Same calendar day (the common reload/nav case) -> TRUE no-op: no write, no coreStateChange,
    // so scores never move on a plain reload. Only persist if the anchor was missing.
    if (days <= 0) {
      if (s.lastStatTickAt == null) { s.lastStatTickAt = now; write(s); }
      return s;
    }
    // Active streak freeze pauses decay — forgive this run entirely (no drift while frozen).
    if (s.streak && s.streak.frozenUntil && s.streak.frozenUntil > now) { s.lastStatTickAt = now; write(s); return s; }
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
        s.stats[k] = after;
      }
    });
    // A genuine day boundary was crossed — persist the advanced anchor (+ any decay) once.
    s.lastStatTickAt = now;
    write(s);
    return s;
  }

  function rankFor(xp) {
    let r = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].min) r = RANKS[i];
    }
    const idx = RANKS.indexOf(r);
    const tier = idx + 1;
    // Iron -> Legend: name is enough — no numeral suffix
    const nextR = RANKS[idx + 1];
    // Apex (Celestial) has a finite max so "XP to go" still counts down to completion.
    const toNext = nextR ? Math.max(0, nextR.min - xp) : (isFinite(r.max) ? Math.max(0, (r.max + 1) - xp) : 0);
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

  // Free/daily chest floor rarity — rises with rank so loyal players get better
  // free drops. Shared by the Shop free chest + Dashboard daily chest so both
  // scale identically. Returns a lowercase rarity ('common'..'legendary').
  function freeChestFloor(xp) {
    const i = rankFor(xp == null ? (read().xp || 0) : xp).idx;
    return i >= 9 ? 'legendary' : i >= 6 ? 'epic' : i >= 3 ? 'rare' : 'common';
  }

  // ─── CORE Plus (subscription) — dev toggle until real billing is wired ──────
  // Perks: 2× XP + 2× coins, and a weekly Epic chest. Enabled from the paywall's
  // dev toggle; stored as a flat flag so every page picks it up instantly.
  // Active only while flagged AND not past the expiry (simulates a real sub period).
  function corePlusActive() {
    try {
      if (localStorage.getItem('corePlusActive') !== '1') return false;
      const until = parseInt(localStorage.getItem('corePlusUntil') || '0', 10) || 0;
      if (until && Date.now() >= until) {            // lapsed -> auto-cancel
        localStorage.setItem('corePlusActive', '0');
        return false;
      }
      return true;
    } catch (e) { return false; }
  }
  // Days remaining on the current CORE Plus period (0 if inactive/none).
  function corePlusDaysLeft() {
    try {
      if (!corePlusActive()) return 0;
      const until = parseInt(localStorage.getItem('corePlusUntil') || '0', 10) || 0;
      return until ? Math.max(0, Math.ceil((until - Date.now()) / 86400000)) : 0;
    } catch (e) { return 0; }
  }
  function setCorePlus(on) {
    try {
      localStorage.setItem('corePlusActive', on ? '1' : '0');
      if (on) {
        localStorage.setItem('corePlusUntil', String(Date.now() + 30 * 86400000)); // 30-day period
        grantPlusWeekly(true); // drop the first weekly chest immediately
      } else {
        localStorage.removeItem('corePlusUntil');
      }
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
        const reb = recoverBonus(m, gain); // rebound if this stat decayed recently
        if (!s.stats) s.stats = {};
        s.stats[m] = clamp((s.stats[m] || 0) + gain + reb, STAT_MIN, STAT_MAX);
        s.statLedger = s.statLedger || [];
        s.statLedger.unshift({ ts: Date.now(), stat: m, delta: gain, reason: 'quest:' + id });
        if (reb > 0) s.statLedger.unshift({ ts: Date.now(), stat: m, delta: reb, reason: 'recover' });
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
    // Band high-water: the next rank's floor, or — for the apex — this rank's own
    // finite ceiling so Celestial still splits into I/II/III (true 33 steps).
    let hi;
    if (nextRank) hi = nextRank.min;
    else if (isFinite(r.max)) hi = r.max + 1;
    else { // truly open-ended apex (legacy safety) — single capstone, no sub-tier
      return { name: r.name, idx: idx, roman: '', full: r.name, sub: 0, isMax: true,
        next: 'MAX', nextRank: null, bandPct: 100, subPct: 100, color: r.color, glow: r.glow, c1: r.c1, c2: r.c2, toNext: 0 };
    }
    const lo = r.min, third = Math.max(1, (hi - lo) / 3);
    const sub = Math.max(0, Math.min(2, Math.floor((xp - lo) / third)));
    const subInto = ((xp - lo) - sub * third) / third;
    const isMax = !nextRank && sub >= 2; // Celestial III == top of the ladder
    const full = isMax ? (r.name + ' ' + ROMAN[2]) : (r.name + ' ' + ROMAN[sub]);
    const next = isMax ? 'MAX' : (sub < 2 ? (r.name + ' ' + ROMAN[sub + 1]) : (nextRank.name + ' I'));
    const bandPct = Math.round(Math.max(0, Math.min(1, (xp - lo) / Math.max(1, hi - lo))) * 100);
    return { name: r.name, idx: idx, roman: ROMAN[sub], full: full, sub: sub, isMax: isMax,
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
  const CHEST_PITY = 8;       // guaranteed rare+ at least once every CHEST_PITY pulls
  const CHEST_EPIC_PITY = 30; // guaranteed epic+ at least once every CHEST_EPIC_PITY pulls
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
    let tier = Math.min(4, floor + up);
    // pity: force at least rare after CHEST_PITY-1 sub-rare pulls, and at least
    // epic after CHEST_EPIC_PITY-1 sub-epic pulls (the stronger guarantee wins).
    const st = read();
    if (!noUp && tier < 1 && (st.chestPity || 0) >= CHEST_PITY - 1) tier = 1;
    if (!noUp && tier < 2 && (st.chestEpicPity || 0) >= CHEST_EPIC_PITY - 1) tier = 2;
    const rar = CHEST_RAR_ORDER[tier];
    const item = CHEST_ITEMS[rar];
    // Rewards scale hard with chest rank so higher chests feel genuinely worth it.
    // Tickets (the loot currency) only drop from Epic+ chests — a small earned-only
    // faucet that still nets a sink vs the ticket cost of opening them.
    const COIN_TBL   = [90, 220, 500, 1100, 2500];
    const SHARD_TBL  = [1, 4, 12, 30, 75];
    const TICKET_TBL = [0, 0, 1, 2, 4];
    const xp = Math.round((60 + tier * 40) * xpMultiplier());
    const coinsR = COIN_TBL[tier];
    const shards = SHARD_TBL[tier];
    const ticketsR = TICKET_TBL[tier];
    const reveals = [
      { kind: 'xp',     n: '+' + xp + ' XP',         r: 'rare',   ic: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z"/>' },
      { kind: 'coins',  n: '+' + coinsR + ' Coins',  r: 'common', ic: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>' },
    ];
    if (shards > 0)   reveals.push({ kind: 'shards',  n: '+' + shards + ' Shards',   r: 'epic',      ic: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18"/>' });
    if (ticketsR > 0) reveals.push({ kind: 'tickets', n: '+' + ticketsR + ' Tickets', r: 'legendary', ic: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2.4"/>' });
    reveals.push({ kind: 'item', n: item.name, r: rar, ic: item.ic, hi: true });
    return { rar: rar, tier: tier, floor: floor, item: item, rid: 'chest_' + rar + '_' + Date.now(), xp: xp, coins: coinsR, shards: shards, tickets: ticketsR, reveals: reveals };
  }

  // Apply a rolled chest to state: XP + coins + shards + inventory item, record the
  // open, broadcast. `source` tags the ledger entries ('shop' / 'daily' / 'rank').
  function grantChest(roll, source) {
    if (!roll) return null;
    source = source || 'chest';
    try { addXp(roll.xp, 'chest:' + source); } catch (e) {}
    try { earnCoins(roll.coins, 'chest:' + source); } catch (e) {}
    if (roll.shards > 0) update((s) => { s.shards = (s.shards || 0) + roll.shards; return s; });
    // Tickets live in the flat `coreTickets` key (shared with Shop + Wallet).
    if (roll.tickets > 0) {
      try { const t = parseInt(localStorage.getItem('coreTickets') || '0', 10) || 0;
        localStorage.setItem('coreTickets', String(t + roll.tickets)); } catch (e) {}
    }
    let it = null;
    try {
      it = addItem({ id: roll.rid || ('chest_' + roll.rar + '_' + Date.now()), name: roll.item.name,
        type: roll.item.type, rarity: roll.rar, slot: roll.item.slot || undefined, source: source });
    } catch (e) {}
    update((s) => {
      s.chests = s.chests || { opened: [] }; s.chests.opened = s.chests.opened || [];
      s.chests.opened.unshift(source + '_' + Date.now());
      // pity counter: reset on a rare+ pull, otherwise increment
      // NOTE: free/daily (noUp) chests increment pity but are excluded from the forced
      // upgrade above — pity only PAYS OUT on a paid pull. Intentional (flagged 2026-06-04).
      s.chestPity = (roll.tier >= 1) ? 0 : (s.chestPity || 0) + 1;
      s.chestEpicPity = (roll.tier >= 2) ? 0 : (s.chestEpicPity || 0) + 1;
      return s;
    });
    syncProgress();
    return it;
  }

  window.coreState = {
    read, write, update,
    lifeScore, rankFor, corePower, achievementsUnlocked,
    STAT_DEFS, statDef, statValue, addStat, applyStatTick, recoverBonus,
    levelFor, unlockedPerks, rankTier, syncProgress, pendingRankUp, clearPendingRankUp,
    streakLost, isStreakRecoverable, trialDay,
    logSlip, restoreStreak, useFreeze,
    earnCoins, spendCoins, restoreCost, earnCoinsCapped, earnedTodayCount,
    addXp,
    setClass, addItem, equipItem, openStarterChest, ensureDailyQuests, completeQuest,
    buyUpgrade, hasUpgrade, xpMultiplier,
    rollChest, grantChest, chestRarColor,
    corePlusActive, setCorePlus, grantPlusWeekly, freeChestFloor, corePlusDaysLeft,
    resetAll, bind, seedDemo,
    RANKS, RANK_ICONS, RESTORE_COIN_COST, CHEST_ITEMS, CHEST_RAR_ORDER,
  };
})();
