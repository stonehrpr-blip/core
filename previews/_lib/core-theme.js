/* core-theme.js
 *
 * Companion to core-theme.css. Auto-injects the ranks-style atmosphere
 * into every page that already presents itself as a phone frame:
 *   - .bg gradient layer (if missing)
 *   - .aurora drift veil (if missing)
 *   - .core-mesh tech grid (if missing)
 *   - iOS statusbar (clock + signal/wifi/battery)
 *   - .scan-line sweep flourish
 *
 * Detects "phone-frame pages" via the presence of a .notch element — that's
 * the canonical signal that a page is rendering inside the simulated iPhone
 * frame. Asset / dev / marketing pages without a .notch are left alone.
 */
(function() {
  if (typeof window === 'undefined') return;

  function applyAtmosphere() {
    document.querySelectorAll('.phone').forEach(phone => {
      // Only treat as phone-frame if it has a .notch — skip asset/marketing pages
      if (!phone.querySelector(':scope > .notch')) return;

      // .bg gradient layer
      if (!phone.querySelector(':scope > .bg')) {
        const bg = document.createElement('div');
        bg.className = 'bg';
        phone.insertBefore(bg, phone.firstChild);
      }
      // .aurora drift veil
      if (!phone.querySelector(':scope > .aurora')) {
        const aurora = document.createElement('div');
        aurora.className = 'aurora';
        const bg = phone.querySelector(':scope > .bg');
        bg ? bg.after(aurora) : phone.insertBefore(aurora, phone.firstChild);
      }
      // .core-mesh tech grid
      if (!phone.querySelector(':scope > .core-mesh')) {
        const mesh = document.createElement('div');
        mesh.className = 'core-mesh';
        const aurora = phone.querySelector(':scope > .aurora');
        aurora ? aurora.after(mesh) : phone.insertBefore(mesh, phone.firstChild);
      }
      // No simulated statusbar — the real iPhone draws its own status chrome
      // (clock + signal + battery) on top of the app. Faking it here just
      // collides with the real OS layer. We leave the top notch zone clean.
      // Scan-line flourish — only on pages that have a hero/scroll area
      if (!phone.querySelector(':scope > .core-scan-line')) {
        const sl = document.createElement('div');
        sl.className = 'core-scan-line';
        phone.appendChild(sl);
      }
    });
  }

  // ─── Coach tone wiring ─────────────────────────────────────────────────
  // Read the user's chosen coach tone from coreOnboardTrial and set it on
  // the body so [data-tone="…"] CSS rules in core-theme.css recolor the
  // .coach-orb instances per tone (Direct red, Drill orange, Gentle green,
  // Balanced blue). Free personality signal with zero per-page edits.
  function applyCoachTone() {
    try {
      const t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}');
      const tone = (t.tone || 'balanced').toLowerCase();
      document.body.setAttribute('data-tone', tone);
    } catch (e) { document.body.setAttribute('data-tone', 'balanced'); }
  }

  // ─── State-driven aurora ───────────────────────────────────────────────
  // When the user's streak is at risk (lost or within 24h of break) shift
  // the aurora veil to a red wash so the app *feels* the situation.
  function applyStreakAura() {
    try {
      const s = JSON.parse(localStorage.getItem('coreState.v1') || '{}');
      const streak = s && s.streak;
      if (!streak) return;
      const lost = streak.days === 0 && streak.lostAt;
      const atRisk = streak.lastCleanAt && (Date.now() - streak.lastCleanAt) > 20 * 3600 * 1000;
      if (lost || atRisk) document.body.setAttribute('data-streak', 'at-risk');
    } catch (e) {}
  }

  // ─── Avatar pattern ────────────────────────────────────────────────────
  // Replace blank avatar circles (.avatar, .av, .friend-av, .who-av) with
  // a hash-derived radial gradient + initial. Skip if the element already
  // contains content (img, svg, text) — only fills empty rings.
  function applyAvatarPatterns() {
    const selectors = '.avatar:empty, .av:empty, .friend-av:empty, .who-av:empty, .hero-avatar:empty, .strip-cell .ring-wrap:empty';
    document.querySelectorAll(selectors).forEach(el => {
      // Skip if the element has an inline background already (preserves designer art)
      if (el.style.background || el.style.backgroundImage) return;
      const seed = (el.dataset.user || el.getAttribute('aria-label') || el.textContent || Math.random().toString(36));
      const h1 = hash(seed), h2 = hash(seed + 'x');
      const c1 = `hsl(${h1 % 360}, 65%, 62%)`;
      const c2 = `hsl(${h2 % 360}, 65%, 35%)`;
      el.style.background = `radial-gradient(circle at 32% 28%, ${c1} 0%, ${c2} 100%)`;
      el.style.boxShadow = `0 0 18px ${c1}55`;
    });
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }

  // ─── Logo injection ────────────────────────────────────────────────────
  // Swap the existing colored brand-dot (`.dot` inside `.brand/.topbrand/.brand-mark`)
  // with the wing logo image. We don't touch the "CORE" wordmark next to it,
  // so the lockup becomes [LOGO] CORE on every header.
  function applyLogo() {
    // Detect the right path prefix (some pages live in subdirs like /u/ /dev/)
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const src = prefix + 'assets/logo.png';

    document.querySelectorAll('.brand .dot, .brand-mark .brand-dot, .topbrand .dot, .brand-dot').forEach(el => {
      if (el.dataset.coreLogo) return; // already replaced
      // Turn the original dot into a logo image without disrupting flex layout
      el.style.background = `center/contain no-repeat url("${src}")`;
      el.style.boxShadow = 'none';
      el.style.borderRadius = '4px';
      // Keep width/height as the original site set them — the brand-dot is
      // usually 7-8px, which is tiny. Bump to 18px so the logo reads.
      const w = parseInt(getComputedStyle(el).width) || 0;
      if (w < 14) {
        el.style.width = '18px';
        el.style.height = '18px';
      }
      el.dataset.coreLogo = '1';
      el.classList.add('core-logo-dot');
    });
  }

  // Lazy-load core-settings-menu.js the first time we detect a settings cog.
  // Saves a request on pages that don't have one.
  function ensureSettingsMenu() {
    if (window._coreSettingsMenu) return;
    if (!document.querySelector('[aria-label="Settings"], [data-core-settings]')) return;
    if (document.querySelector('script[src*="core-settings-menu.js"]')) return;
    // Compute the prefix the same way as the favicon injection
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const s = document.createElement('script');
    s.src = prefix + 'core-settings-menu.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  // Always load core-edit-mode.js so saved layouts apply on every page
  // and the Settings menu's "Edit page" action has something to call.
  function ensureEditMode() {
    if (window._coreEditMode) return;
    if (document.querySelector('script[src*="core-edit-mode.js"]')) return;
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const s = document.createElement('script');
    s.src = prefix + 'core-edit-mode.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  // Always load the AI / tasks / proof / life-OS stack on phone-frame pages
  // so any page that wants to fire events or invoke AI just works.
  function ensureLifeOS() {
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    [
      ['coreAI', 'core-ai.js'],
      ['coreTasks', 'core-tasks.js'],
      ['coreProof', 'core-proof.js'],
      ['_coreLifeOS', 'core-life-os.js'],
      ['coreHabitEngine', 'core-habit-engine.js'],
      ['_coreCommandCenter', 'core-command-center.js']
    ].forEach(([flag, file]) => {
      if (window[flag]) return;
      if (document.querySelector('script[src*="' + file + '"]')) return;
      const s = document.createElement('script');
      s.src = prefix + file; s.defer = true;
      document.head.appendChild(s);
    });
  }

  // Always load core-moderation.js on phone-frame pages so a ban is
  // enforced as soon as the page paints. Cheap (~2 KB), runs once.
  function ensureModeration() {
    if (window._coreModeration) return;
    if (document.querySelector('script[src*="core-moderation.js"]')) return;
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const s = document.createElement('script');
    s.src = prefix + 'core-moderation.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  // Lazy-load the pricing A/B engine on the three price-bearing pages.
  // Engine assigns sticky variant + swaps copy if variant B is picked.
  // Also loads core-invite-discount.js to halve prices when ?ref= was used.
  function ensurePricingAB() {
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!['trial.html','pricing.html','paywall.html'].includes(path)) return;
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    if (!document.querySelector('script[src*="core-pricing-ab.js"]')) {
      const eng = document.createElement('script');
      eng.src = prefix + 'core-experiments.js';
      document.head.appendChild(eng);
      const ab = document.createElement('script');
      ab.src = prefix + 'core-pricing-ab.js';
      ab.defer = true;
      document.head.appendChild(ab);
    }
    if (!document.querySelector('script[src*="core-invite-discount.js"]')) {
      const d = document.createElement('script');
      d.src = prefix + 'core-invite-discount.js';
      d.defer = true;
      document.head.appendChild(d);
    }
  }

  // Capture ?ref= on ANY page so the discount sticks even if the user
  // lands on the landing page first and walks to pricing later.
  function captureRefAnywhere() {
    try {
      const sp = new URLSearchParams(location.search);
      const ref = sp.get('ref');
      if (!ref) return;
      const existing = JSON.parse(localStorage.getItem('coreInviteDiscount') || 'null');
      if (existing && existing.ref === ref) return;
      localStorage.setItem('coreInviteDiscount', JSON.stringify({ pct: 50, ref, ts: Date.now() }));
    } catch (e) {}
  }
  captureRefAnywhere();

  // Lazy-load core-tour.js on post-onboarding pages so first-visit
  // coach-marks can fire. Skipped on landing/onboarding/marketing pages.
  function ensureTour() {
    if (window._coreTour) return;
    try { if (localStorage.getItem('coreOnboardComplete') !== '1') return; } catch (e) { return; }
    if (document.querySelector('script[src*="core-tour.js"]')) return;
    const depth = (location.pathname.match(/\/[^/]+\//g) || []).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const s = document.createElement('script');
    s.src = prefix + 'core-tour.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  // ─── Apple Settings-list opt-in ───────────────────────────────────────
  // Default: every phone-frame page (has .phone + .notch) gets the Apple look.
  // Pages opt OUT via body[data-apple="0"] (marketing, dev tooling, gallery,
  // landing surfaces that need the Jarvis identity instead).
  const APPLE_OPTOUT = new Set([
    '64-u-profile.html', 'landing.html', 'gallery.html', 'admin.html', 'moderation.html',
    'coach-dashboard.html', 'press-kit.html', 'producthunt.html', 'waitlist.html',
    'testflight-email.html', 'tiktok-feed.html', 'app-icon.html',
    'app-store-screenshots.html', 'bank-flow-plan.html', 'icon-system.html',
    'splash.html', 'rank-reveal.html', 'streak-celebration.html', 'rank-up.html'
  ]);
  function applyAppleFlag() {
    const path = (location.pathname.split('/').pop() || '64-u-profile.html').toLowerCase();
    if (APPLE_OPTOUT.has(path)) return;
    if (document.body.getAttribute('data-apple') === '0') return; // explicit opt-out
    // Only if there's an actual phone-frame on the page (skips marketing layouts)
    if (!document.querySelector('.phone .notch')) return;
    document.body.setAttribute('data-apple', '1');
  }

  // ─── Light/dark theme ─────────────────────────────────────────────────
  // Force dark theme everywhere. Light theme CSS exists but isn't fully
  // designed — leaves white-screen blank pages on a lot of surfaces. Until
  // it's properly audited, ignore any stored preference and clear the key.
  function applyTheme() {
    try { localStorage.removeItem('coreTheme'); } catch (e) {}
    document.body.setAttribute('data-theme', 'dark');
  }

  function runAll() {
    applyAtmosphere();
    applyAppleFlag();
    applyTheme();
    applyCoachTone();
    applyStreakAura();
    applyAvatarPatterns();
    applyLogo();
    ensureSettingsMenu();
    ensureEditMode();
    ensureLifeOS();
    ensureModeration();
    ensurePricingAB();
    ensureTour();
    // Apply tier perks if the engine is loaded — keeps coreState's unlocks
    // panel in sync with the user's rank on every page load.
    if (window.coreRankPerks && window.coreRankPerks.applyAll) {
      try { window.coreRankPerks.applyAll(); } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }
  // Re-apply on state change so theme stays in sync with user actions
  window.addEventListener('coreStateChange', () => {
    applyCoachTone();
    applyStreakAura();
  });
})();
