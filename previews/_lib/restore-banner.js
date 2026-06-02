/**
 * Drop-in restore-streak banner.
 *
 * Usage:
 *   <div id="coreRestoreBanner"></div>
 *   <script src="restore-banner.js"></script>
 *
 * The banner renders itself when `coreState.isStreakRecoverable()` returns true,
 * pulls minutes-since-slip from `coreState.streak.lostAt`, and reads
 * `coreOnboardTrial.tone` to pick the Coach reassurance line.
 */
(function() {
  if (typeof window === 'undefined') return;

  const TONE_LINES = {
    gentle:   "Don't be hard on yourself — this is what the 48hr window is for.",
    balanced: "Slips happen. Restore now, log the trigger, move on.",
    direct:   "Don't lose the work. Restore the streak and tell me what happened.",
    drill:    "Pay the dollar. Lock it back in. Tell me the trigger. Move."
  };

  function minutesSince(ts) {
    if (!ts) return 0;
    return Math.max(1, Math.round((Date.now() - ts) / 60000));
  }
  function fmtMinsAgo(m) {
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h + 'h ' + mm + 'm ago';
  }

  function build() {
    if (!window.coreState) return;
    const s = coreState.read();
    const slot = document.getElementById('coreRestoreBanner');
    if (!slot) return;
    const recoverable = coreState.isStreakRecoverable(s);
    if (!recoverable) { slot.style.display = 'none'; return; }

    let tone = 'balanced';
    try {
      const t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}');
      if (t.tone && TONE_LINES[t.tone]) tone = t.tone;
    } catch(e){}

    const prev = s.streak.previousDays || 0;
    const ago = fmtMinsAgo(minutesSince(s.streak.lostAt));
    slot.style.display = 'block';
    slot.style.cssText = 'display:block; margin: 0 0 14px; text-decoration:none; color:inherit;';
    slot.innerHTML = '' +
      '<a href="52-restore-streak.html" style="display:block; text-decoration:none; color:inherit; padding:14px 16px; border-radius:16px; background: linear-gradient(135deg, rgba(255,79,107,0.10), rgba(255,122,69,0.12)); border:1px solid rgba(255,79,107,0.40); position:relative; overflow:hidden;">' +
        '<div style="display:flex; align-items:center; gap:12px;">' +
          '<div style="flex-shrink:0; width:38px; height:38px; border-radius:50%; background: radial-gradient(circle at 32% 28%, #FF7A45, #832D17); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 18px rgba(255,122,69,0.5);">' +
            '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<div style="flex:1; min-width:0;">' +
            '<div style="font-size:13px; font-weight:700; color:#fff; letter-spacing:-0.1px;">You lost your ' + prev + '-day streak <span style="color:#9AA1B7; font-weight:500;">· ' + ago + '</span></div>' +
            '<div style="font-size:11px; color:#FF7A45; letter-spacing:0.04em; margin-top:2px;">Restore for $0.99 · 48h window</div>' +
          '</div>' +
          '<div style="color:#FF7A45; font-size:18px; font-weight:600;">›</div>' +
        '</div>' +
        '<div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,79,107,0.20); display:flex; align-items:flex-start; gap:10px;">' +
          '<div style="flex-shrink:0; width:22px; height:22px; border-radius:50%; background: radial-gradient(circle at 35% 28%, #DCEBFF, #2F8FFF 55%, #1856B8); box-shadow: 0 0 12px rgba(47,143,255,0.4);"></div>' +
          '<div style="font-size:12px; color:rgba(255,255,255,0.85); line-height:17px; letter-spacing:-0.05px; font-style:italic;">"' + TONE_LINES[tone] + '" <span style="color:#5BB1FF; font-weight:600; font-style:normal;">— Coach</span></div>' +
        '</div>' +
      '</a>';
  }

  function init() {
    build();
    window.addEventListener('coreStateChange', build);
    // Refresh "X min ago" every minute. Pause when the tab is hidden so we
    // don't keep redrawing in the background (also lets the next visible
    // tab pick up a fresh render without N minutes of catch-up).
    let timer = setInterval(build, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
      } else if (!timer) {
        build();
        timer = setInterval(build, 60000);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.coreRestoreBanner = { build };
})();
