/**
 * Universal back-button + link safety net.
 *
 * Auto-binds to any element matching .back / .back-btn / [data-back] / .top-back / .icon-back
 * Intercepts the click and uses history.back() when there's a real referrer,
 * falls back to `data-fallback` attribute or `64-u-profile.html`.
 *
 * Also exposes `window.coreBack(fallback)` for inline use.
 *
 * Drop in once per page via:
 *   <script src="core-back.js"></script>
 */
(function() {
  if (typeof window === 'undefined') return;

  function sameOrigin(url) {
    try {
      const u = new URL(url, location.href);
      return u.origin === location.origin;
    } catch (e) { return false; }
  }

  function go(fallback) {
    // Better than naive history.back() — confirm we came from same origin.
    // Direct-link visits often have history.length > 1 (from chrome://newtab
    // etc) but no real parent to go back to. Referrer is more reliable.
    var sameRef = document.referrer && document.referrer.indexOf(location.origin) === 0;
    if (sameRef && history.length > 1) {
      try { history.back(); return; } catch (e) {}
    }
    // No real history -> use the page's declared parent / fallback
    location.href = fallback || '01-index.html';
  }
  // Expose for inline onclick=coreBack('NN-prev.html')
  window.coreBack = function(fallback) { go(fallback); };

  // Intercept clicks on common back-button selectors. Capture-phase so we beat inline onclick.
  // Elements with [data-back-local] opt out — their own onclick/handler runs (e.g. step-aware prev()).
  function bind() {
    const sel = '.back, .back-btn, [data-back], .top-back, .icon-back, .nav-back, [aria-label="Back"]';
    document.querySelectorAll(sel).forEach(function(el) {
      if (el.__coreBackBound) return;
      // Opt-out for multi-step flows that need their own back handler
      if (el.hasAttribute('data-back-local')) { el.__coreBackBound = true; return; }
      // Opt-out for elements with their own inline onclick — let them run.
      // Without this, the capture-phase listener below blocks the inline
      // handler via stopImmediatePropagation().
      if (el.hasAttribute('onclick')) { el.__coreBackBound = true; return; }
      el.__coreBackBound = true;
      el.addEventListener('click', function(e) {
        // Prefer history.back(); fall back to data-fallback / href / 64-u-profile.html
        const fb = el.getAttribute('data-fallback') || el.getAttribute('href') || '';
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        if (window.coreTrack) {
          try { coreTrack('back_pressed', { from: location.pathname.split('/').pop() }); } catch (er) {}
        }
        go(fb);
      }, true);
    }, this);
  }

  // Catch any href="#" link that does nothing — and any button with no handler — by warning in dev.
  function audit() {
    if (location.protocol !== 'file:') return;
    document.querySelectorAll('button:not([onclick]):not([type=submit])').forEach(function(b) {
      // Skip if it's a wrapper for a labeled child handler
      if (b.closest('[onclick]')) return;
      if (b.dataset.noHandler) return;
      // Heuristic: only flag visible buttons with text
      if (!b.textContent.trim()) return;
      // Quiet, just attach a hint
      b.title = (b.title ? b.title + ' · ' : '') + '[dev: no onclick handler]';
    });
  }

  function init() { bind(); audit(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-scan when new DOM is added (e.g. modal/back-sheets)
  if (window.MutationObserver) {
    new MutationObserver(bind).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.coreBack = go;
})();
