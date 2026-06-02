/* core-rank-perks.js
 *
 * Rank-up perks engine. Each tier in coreState.RANKS has a list of perks
 * with two purposes:
 *   1. UI listing — rank-detail.html renders these as the "What you unlock" rows
 *   2. Runtime effect — when the user reaches a tier we call apply(state)
 *      to actually grant the perk (extra streak freezes, shop discount,
 *      dashboard insight panel enabled, etc.)
 *
 * Runs on every page load. Idempotent — applying a perk twice is a no-op.
 *
 * Access:
 *   window.coreRankPerks.perksFor('Silver')      // [{ icon, title, sub, key, status }, …]
 *   window.coreRankPerks.applyAll()              // sync coreState to current rank
 *   window.coreRankPerks.has('shop_discount_50') // boolean
 */
(function() {
  if (typeof window === 'undefined') return;

  // ─── Catalog ────────────────────────────────────────────────────────────
  // icon = SVG path inside <svg viewBox="0 0 24 24"> (lucide-style line icons,
  // matching every other page in the app)
  // key  = a stable string used to mark the perk as granted in localStorage
  // apply(state) = mutate state to actually deliver the perk; safe to call N times
  const TIERS = {
    Iron: [
      { key: 'honest_logging', icon: 'check',  title: 'Honest logging',
        sub: 'Tap-to-log slips + first stat baseline.',
        apply: (s) => { /* always on */ } },
      { key: 'streak_counter', icon: 'flame',  title: 'Streak counter',
        sub: 'Track every clean day on your dashboard.',
        apply: (s) => { /* always on */ } },
    ],
    Bronze: [
      { key: 'freeze_1pw', icon: 'shield', title: '+1 streak freeze / week',
        sub: 'Skip a day without losing your streak.',
        apply: (s) => {
          s.streak = s.streak || {};
          s.streak.freezes = s.streak.freezes || {};
          if ((s.streak.freezes.maxPerWeek || 1) < 2) s.streak.freezes.maxPerWeek = 2;
        } },
      { key: 'avatar_colors', icon: 'palette', title: 'Custom avatar colors',
        sub: 'Pick from 6 palettes for your profile.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.avatarPalettes = true; } },
    ],
    Silver: [
      { key: 'coach_insights', icon: 'brain', title: 'Coach insights',
        sub: 'Pattern callouts at the top of your day.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.coachInsights = true; } },
      { key: 'silver_crest', icon: 'badge', title: 'Silver crest in feed',
        sub: 'Show your tier next to every post.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.feedCrest = 'silver'; } },
    ],
    Gold: [
      { key: 'shop_discount_50', icon: 'tag', title: '50% off Shop items',
        sub: 'Profile icons, themes, boost cards.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.shopDiscount = 0.5; } },
      { key: 'leaderboard_top25', icon: 'trophy', title: 'Top-25 weekly leaderboard',
        sub: 'Compete with the most consistent users.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.leaderboardTier = 'top25'; } },
    ],
    Emerald: [
      { key: 'recovery_priority', icon: 'spark', title: 'Recovery quest priority',
        sub: 'Quests refresh 2× faster after slips.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.recoveryQuestSpeed = 2; } },
      { key: 'freeze_2pw', icon: 'shield', title: '+2 streak freezes / week',
        sub: 'Doubled protection for elite streaks.',
        apply: (s) => {
          s.streak = s.streak || {};
          s.streak.freezes = s.streak.freezes || {};
          if ((s.streak.freezes.maxPerWeek || 1) < 3) s.streak.freezes.maxPerWeek = 3;
        } },
    ],
    Platinum: [
      { key: 'platinum_frame', icon: 'frame', title: 'Animated profile frame',
        sub: 'Electric border on your card.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.profileFrame = 'platinum'; } },
      { key: 'coach_copilot', icon: 'brain', title: 'Coach co-pilot mode',
        sub: 'Live craving co-handling — beta.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.coachCopilot = true; } },
    ],
    Diamond: [
      { key: 'shop_unlock_monthly', icon: 'gift', title: 'Free shop unlock / month',
        sub: '1 paid item per month, no coin spend.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.shopFreeMonthly = true; } },
      { key: 'leaderboard_pin', icon: 'pin', title: 'Top-10 leaderboard pin',
        sub: 'Permanent slot on your friends list.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.leaderboardTier = 'top10'; } },
    ],
    Master: [
      { key: 'master_animation', icon: 'sparkle', title: 'Master crest animation',
        sub: 'Particles trail behind your avatar.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.avatarParticles = true; } },
      { key: 'featured_discover', icon: 'badge', title: 'Featured in Discover',
        sub: 'Your tone-tested posts amplified.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.featuredDiscover = true; } },
    ],
    Grandmaster: [
      { key: 'founder_lounge', icon: 'flame', title: 'Founder access lounge',
        sub: 'Direct line to the Core team.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.founderLounge = true; } },
      { key: 'early_stats', icon: 'brain', title: 'Early access — new stats',
        sub: 'Sleep · Recovery · Focus before release.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.earlyStats = true; } },
    ],
    Legend: [
      { key: 'legend_status', icon: 'star', title: 'Legendary — forever',
        sub: 'Never demote. Permanent rank.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.neverDemote = true; } },
      { key: 'hall_of_fame', icon: 'crown', title: 'Hall of Fame entry',
        sub: 'Your name on the Core wall.',
        apply: (s) => { s.unlocks = s.unlocks || {}; s.unlocks.hallOfFame = true; } },
    ],
  };

  // ─── Icon library ───────────────────────────────────────────────────────
  // Same line-icon language used everywhere else in the app (1.8 stroke).
  const ICONS = {
    check:   '<path d="M5 13l4 4L19 7"/>',
    flame:   '<path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3"/><path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5"/>',
    shield:  '<path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z"/>',
    palette: '<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 22a10 10 0 1 1 0-20c5.5 0 10 4 10 9 0 1.7-1.3 3-3 3h-1.5a3 3 0 0 0-2.6 4.5l.4.7c.6 1 0 2.8-1.3 2.8z"/>',
    brain:   '<path d="M9 3a4 4 0 0 0-4 4v3a3 3 0 0 0-1 5.7V18a3 3 0 0 0 5 2.2A3 3 0 0 0 14 18v-2.3a3 3 0 0 0-1-5.7V7a4 4 0 0 0-4-4z"/>',
    badge:   '<circle cx="12" cy="9" r="7"/><path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5"/>',
    tag:     '<path d="M20.6 13.4L13 21a2 2 0 0 1-2.8 0L3 13.8V3h10.8z"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/>',
    trophy:  '<path d="M6 9V4h12v5a6 6 0 0 1-12 0z"/><path d="M6 4H3v3a3 3 0 0 0 3 3"/><path d="M18 4h3v3a3 3 0 0 1-3 3"/><path d="M9 19h6"/><path d="M12 15v4"/>',
    spark:   '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.8 2.8M15.2 15.2L18 18M18 6l-2.8 2.8M8.8 15.2L6 18"/>',
    frame:   '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/>',
    gift:    '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18"/><path d="M12 8v13"/><path d="M8 8a2.5 2.5 0 0 1 0-5c2.5 0 4 5 4 5M16 8a2.5 2.5 0 0 0 0-5c-2.5 0-4 5-4 5"/>',
    pin:     '<path d="M12 17v5"/><path d="M9 11V3h6v8l3 3v3H6v-3l3-3z"/>',
    sparkle: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2"/>',
    star:    '<path d="M12 3l3 6 6 .9-4.5 4.3 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3 9.9 9 9z"/>',
    crown:   '<path d="M3 18h18l-1.5-9-5 4-3.5-8-3.5 8-5-4z"/>',
  };

  // ─── Public API ─────────────────────────────────────────────────────────
  function rankIdx(name) {
    const RANKS = (window.coreState && coreState.RANKS) || [];
    return RANKS.findIndex(r => r.name.toLowerCase() === (name || '').toLowerCase());
  }

  function perksFor(name, userXp) {
    const RANKS = (window.coreState && coreState.RANKS) || [];
    const xp = (typeof userXp === 'number') ? userXp
      : (window.coreState ? (coreState.read().xp || 0) : 0);
    const userIdx = RANKS.findIndex(r => xp >= r.min && (r.max === Infinity || xp <= r.max));
    const i = rankIdx(name);
    const unlocked = i <= userIdx;
    const list = TIERS[name] || [];
    return list.map(p => ({
      key: p.key, icon: p.icon, iconSvg: ICONS[p.icon] || ICONS.sparkle,
      title: p.title, sub: p.sub, unlocked,
    }));
  }

  function applyAll() {
    if (!window.coreState) return;
    const RANKS = coreState.RANKS || [];
    const state = coreState.read();
    const xp = state.xp || 0;
    const userIdx = RANKS.findIndex(r => xp >= r.min && (r.max === Infinity || xp <= r.max));
    if (userIdx < 0) return;
    const granted = state.perksGranted = state.perksGranted || {};

    let mutated = false;
    const newlyGrantedTiers = [];   // tiers whose perks were just applied for the first time

    for (let i = 0; i <= userIdx; i++) {
      const tierName = RANKS[i].name;
      const list = TIERS[tierName] || [];
      let anyGrantedThisRun = false;
      for (const p of list) {
        if (granted[p.key]) continue;          // already applied (idempotent)
        try {
          p.apply(state);
          granted[p.key] = Date.now();
          mutated = true;
          anyGrantedThisRun = true;
        } catch (e) { /* don't let one perk crash the rest */ }
      }
      if (anyGrantedThisRun) newlyGrantedTiers.push(tierName);
    }

    if (mutated && coreState.write) {
      coreState.write(state);
    }

    // If a NEW tier just had its perks granted (rank-up moment), queue the
    // celebration page. We use the highest tier crossed so multi-tier jumps
    // still feel like one event.
    if (newlyGrantedTiers.length > 0 && !isFirstEverApply(state)) {
      const highest = newlyGrantedTiers[newlyGrantedTiers.length - 1];
      try { localStorage.setItem('coreRankUpPending', highest); } catch (e) {}
      maybeCelebrate();
    } else if (newlyGrantedTiers.length > 0) {
      // First-ever apply: silently mark everything as the user's existing
      // baseline so they don't get spammed with celebrations on first visit.
      // (They saw rank-reveal during onboarding instead.)
    }
  }

  // First-ever apply heuristic: if state already has a high XP but ZERO perks
  // granted before this run, we're bootstrapping an existing user — don't
  // celebrate, just sync state. Real rank-ups happen incrementally.
  let _seenInit = false;
  function isFirstEverApply(state) {
    if (_seenInit) return false;
    _seenInit = true;
    return true;
  }

  // Pages where the rank-up celebration would be disruptive (mid-flow, etc.)
  const CELEBRATION_SKIP = new Set([
    '64-u-profile.html', 'splash.html', 'sign-in.html', 'sign-in-email.html', 'sign-in-otp.html',
    'trial.html', 'quiz.html', 'rank-reveal.html', '47-rank-up.html', 'rank-detail.html',
    'permissions.html', 'social-proof.html', 'walkthrough.html', 'welcome-back.html',
  ]);

  function maybeCelebrate() {
    try {
      const pending = localStorage.getItem('coreRankUpPending');
      if (!pending) return;
      const path = (location.pathname.split('/').pop() || '').toLowerCase();
      if (CELEBRATION_SKIP.has(path)) return;
      // Defer the redirect so the user sees the action that caused the rank-up
      // (e.g. log slip → +XP toast → 700ms later, celebration fires)
      setTimeout(() => {
        location.href = '47-rank-up.html?tier=' + encodeURIComponent(pending);
      }, 700);
    } catch (e) {}
  }

  function has(perkKey) {
    if (!window.coreState) return false;
    const state = coreState.read();
    return !!(state.perksGranted && state.perksGranted[perkKey]);
  }

  window.coreRankPerks = { perksFor, applyAll, has, TIERS, ICONS };

  // Auto-apply on every page load — once coreState is ready
  function init() { try { applyAll(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // Re-apply when XP changes (rank-up moment)
  window.addEventListener('coreStateChange', init);
})();
