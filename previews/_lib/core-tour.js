/* core-tour.js
 *
 * First-login tour overlay. Detects which page the user is on, checks
 * coreTourSeen.{key} in localStorage, and on first visit shows a small
 * coach-mark tooltip + dimmed backdrop with "Got it" + "Skip tour".
 *
 * Only fires once onboarding is complete (coreOnboardComplete === '1')
 * and only on pages that have a tour entry. Adding a new tab automatically
 * triggers a tour the first time the user opens that tab.
 *
 * Pages handled: dashboard (home), feed, coach, ranks, you,
 * gym, streak-board, shop, find-friends, goal-set, pick-habits, activity.
 */
(function() {
  if (typeof window === 'undefined') return;
  if (window._coreTour) return;
  window._coreTour = true;

  // ── Tour content keyed by page filename ──────────────────────────────
  const TOURS = {
    'dashboard.html':    { key: 'home',    title: 'Welcome to CORE',              body: 'Tap a row to mark it done · big button locks your daily streak · long-press the tab bar to customize it · Settings → Layout → Edit page reorders widgets · Theme toggles light/dark.' },
    'feed.html':         { key: 'feed',    title: 'Your friends\' wins',          body: 'See what people you follow finished today. Tap ⚡ to cheer them on.' },
    'coach.html':        { key: 'coach',   title: 'Your AI coach',                body: 'Ask anything — habits, routine tweaks, motivation. Your coach knows your data.' },
    'ranks.html':        { key: 'ranks',   title: 'Climb the ranks',              body: 'Each rank unlocks new perks. Tap any rank to see exactly what you get when you hit it.' },
    'profile.html':      { key: 'you',     title: 'Your profile',                 body: 'Stats, streak, achievements, friends — all in one place. Long-press the tab bar to customize it.' },
    'gym.html':          { key: 'gym',     title: 'Today\'s workout',             body: 'Reps, rest, form. Tap any exercise to see a video of correct form.' },
    'streak-board.html': { key: 'streak',  title: 'Your streak board',            body: 'Every check-in is a green tile. Freezes save you on a bad day — use them wisely.' },
    'shop.html':         { key: 'shop',    title: 'Spend your coins',             body: 'Cosmetics, freezes, perks. Earn coins from check-ins, daily wins, and rank-ups.' },
    'find-friends.html': { key: 'friends', title: 'Find your people',             body: 'Search by username or invite friends from contacts. Friends keep you accountable.' },
    'goal-set.html':     { key: 'goals',   title: 'Set your goals',               body: 'One big goal at a time. Your coach will work backwards from this to shape your routine.' },
    'pick-habits.html':  { key: 'habits',  title: 'Your habits',                  body: 'Pick the small actions you\'ll repeat daily. These show up on your dashboard tomorrow.' },
    'activity.html':     { key: 'activity',title: 'What happened today',          body: 'Every check-in, XP gain, friend action — all logged here. Scroll back through your run.' }
  };

  // ── Storage helpers ──────────────────────────────────────────────────
  function seenKey(k) { return 'coreTourSeen.' + k; }
  function isSeen(k) {
    try { return localStorage.getItem(seenKey(k)) === '1'; } catch (e) { return true; }
  }
  function markSeen(k) {
    try { localStorage.setItem(seenKey(k), '1'); } catch (e) {}
  }
  function isSkipped() {
    try { return localStorage.getItem('coreTourSkipped') === '1'; } catch (e) { return false; }
  }
  function markSkipped() {
    try { localStorage.setItem('coreTourSkipped', '1'); } catch (e) {}
  }
  function isOnboarded() {
    try { return localStorage.getItem('coreOnboardComplete') === '1'; } catch (e) { return false; }
  }

  // ── Styles ───────────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('core-tour-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-tour-styles';
    s.textContent = `
      .core-tour-back {
        position: fixed; inset: 0; background: rgba(2,2,10,0.66);
        backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
        z-index: 9970; opacity: 0;
        transition: opacity 0.32s cubic-bezier(0.22,1,0.36,1);
      }
      .core-tour-back.on { opacity: 1; }
      .core-tour-card {
        position: fixed; left: 50%; transform: translateX(-50%) translateY(20px);
        bottom: 110px; width: 320px; max-width: calc(100vw - 32px);
        background: linear-gradient(180deg, #0a0a14, #02020A);
        border: 1px solid rgba(74,143,255,0.32);
        border-radius: 18px; padding: 18px 18px 14px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 32px rgba(74,143,255,0.16);
        font-family: 'Chakra Petch', -apple-system, sans-serif;
        z-index: 9971; opacity: 0;
        transition: opacity 0.32s cubic-bezier(0.22,1,0.36,1), transform 0.32s cubic-bezier(0.22,1,0.36,1);
      }
      .core-tour-card.on { opacity: 1; transform: translateX(-50%) translateY(0); }
      .core-tour-card .ct-kicker {
        font-size: 10px; letter-spacing: 0.18em; color: #6BA9FF;
        font-weight: 700; text-transform: uppercase; margin-bottom: 6px;
      }
      .core-tour-card .ct-title {
        font-size: 17px; font-weight: 700; color: #fff;
        letter-spacing: -0.3px; margin-bottom: 6px;
      }
      .core-tour-card .ct-body {
        font-size: 13px; color: #9AA1B7; line-height: 1.4;
        margin-bottom: 14px;
      }
      .core-tour-card .ct-actions {
        display: flex; gap: 8px; align-items: center;
      }
      .core-tour-card .ct-skip {
        flex: 1; background: transparent; border: none;
        color: #6B7090; font-family: inherit; font-size: 12px;
        font-weight: 600; cursor: pointer; padding: 8px 4px;
        text-align: left;
      }
      .core-tour-card .ct-ok {
        background: linear-gradient(180deg, #fff, #e8ecf4);
        color: #050510; border: none; border-radius: 999px;
        padding: 9px 18px; font-family: inherit;
        font-size: 13px; font-weight: 700; cursor: pointer;
        box-shadow: 0 8px 20px rgba(255,255,255,0.10);
      }
      .core-tour-card .ct-ok:active { transform: scale(0.97); }
      .core-tour-card .ct-arrow {
        position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%) rotate(45deg);
        width: 14px; height: 14px;
        background: #02020A;
        border-right: 1px solid rgba(74,143,255,0.32);
        border-bottom: 1px solid rgba(74,143,255,0.32);
      }
    `;
    document.head.appendChild(s);
  }

  function show(tour) {
    ensureStyles();
    const back = document.createElement('div');
    back.className = 'core-tour-back';
    document.body.appendChild(back);

    const card = document.createElement('div');
    card.className = 'core-tour-card';
    card.innerHTML = `
      <div class="ct-kicker">Quick tip</div>
      <div class="ct-title">${tour.title}</div>
      <div class="ct-body">${tour.body}</div>
      <div class="ct-actions">
        <button class="ct-skip" id="ctSkip">Skip tour</button>
        <button class="ct-ok" id="ctOk">Got it</button>
      </div>
      <div class="ct-arrow"></div>
    `;
    document.body.appendChild(card);
    requestAnimationFrame(() => { back.classList.add('on'); card.classList.add('on'); });

    function close() {
      back.classList.remove('on'); card.classList.remove('on');
      setTimeout(() => { back.remove(); card.remove(); }, 340);
    }
    card.querySelector('#ctOk').addEventListener('click', () => { markSeen(tour.key); close(); });
    card.querySelector('#ctSkip').addEventListener('click', () => { markSkipped(); close(); });
    back.addEventListener('click', () => { markSeen(tour.key); close(); });
  }

  function maybeRun() {
    if (!isOnboarded()) return;
    if (isSkipped()) return;
    const path = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
    const tour = TOURS[path];
    if (!tour) return;
    if (isSeen(tour.key)) return;
    // Wait for the user's first real interaction (scroll, tap, key) before
    // surfacing the coach-mark — less interrupt-y than firing on page load.
    let fired = false;
    function fire() {
      if (fired) return; fired = true;
      cleanup();
      // Short settle so the user's tap completes first
      setTimeout(() => show(tour), 300);
    }
    function cleanup() {
      window.removeEventListener('scroll', fire, true);
      window.removeEventListener('click', fire, true);
      window.removeEventListener('keydown', fire, true);
      window.removeEventListener('touchstart', fire, true);
    }
    window.addEventListener('scroll',     fire, { capture: true, passive: true });
    window.addEventListener('click',      fire, { capture: true });
    window.addEventListener('keydown',    fire, { capture: true });
    window.addEventListener('touchstart', fire, { capture: true, passive: true });
    // Safety net: still fire after 15s of total inactivity
    setTimeout(fire, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeRun);
  } else {
    maybeRun();
  }
  window.coreTour = { show, markSeen, markSkipped, TOURS };
})();
