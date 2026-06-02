/**
 * Shared starfield + aurora helpers.
 * Each preview page used to ship its own ~30-line star-init loop — replaced with this.
 * Auto-runs at DOMContentLoaded if it finds the right hooks.
 *
 *   <div class="stars" id="stars" data-count="50"></div>
 *   <div class="aurora" data-tint-1="rgba(74,143,255,0.30)" data-tint-2="rgba(91,106,230,0.28)"></div>
 *
 * Or call manually:
 *   CoreAtmosphere.stars(el, count);
 *   CoreAtmosphere.aurora(el, opts);
 */
(function() {
  if (typeof window === 'undefined') return;

  function stars(el, count) {
    if (!el) return;
    if (el.__starsMounted) return;
    el.__starsMounted = true;
    const n = count || parseInt(el.dataset.count, 10) || 50;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      const r = Math.random();
      s.className = 'star ' + (r < 0.7 ? 's1' : 's2');
      s.style.left = (Math.random() * 100) + '%';
      s.style.top  = (Math.random() * 100) + '%';
      s.style.setProperty('--d',   (2.5 + Math.random() * 5) + 's');
      s.style.setProperty('--del', (Math.random() * 5) + 's');
      s.style.setProperty('--min', (0.08 + Math.random() * 0.15).toFixed(2));
      s.style.setProperty('--max', (0.40 + Math.random() * 0.30).toFixed(2));
      el.appendChild(s);
    }
  }

  function aurora(el, opts) {
    // The aurora node already has its CSS — this is just a marker for completeness.
    // Page-specific tints are set via the data attributes in HTML or CSS vars in the
    // page's stylesheet; nothing to inject at runtime.
    return;
  }

  function autoInit() {
    document.querySelectorAll('.stars[data-auto]').forEach(el => stars(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.CoreAtmosphere = { stars, aurora };
})();
