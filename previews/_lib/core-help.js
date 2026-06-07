// core-help.js — shared "?" help sheet for CORE preview pages
// Usage:
//   <script src="_lib/core-help.js"></script>
//   window.coreHelp.attach('helpBtnId', { title: '…', bullets: ['…', '…'] });
//
// The sheet is dismissible, remembers "seen" in localStorage so the dot
// badge auto-clears after first open. Safe to call on any preview page.
(function () {
  if (typeof window === 'undefined') return;
  if (window.coreHelp) return;

  var SEEN_KEY = 'coreHelp.seen.';
  var _overlay = null;

  // ── Inject styles once ────────────────────────────────────────────────────
  var STYLE = [
    '.ch-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;',
      'background:rgba(0,0,0,0);transition:background .28s;pointer-events:none;}',
    '.ch-overlay.ch-open{background:rgba(0,0,0,0.52);pointer-events:auto;}',
    '.ch-sheet{',
      'background:linear-gradient(180deg,#0e1020,#080910);',
      'border-top:1px solid rgba(255,255,255,0.10);',
      'border-radius:24px 24px 0 0;',
      'padding:12px 20px 40px;',
      'width:100%;max-width:390px;margin:0 auto;',
      'transform:translateY(102%);transition:transform .32s cubic-bezier(.2,.8,.2,1);',
      'color:#F8FAFE;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;}',
    '.ch-overlay.ch-open .ch-sheet{transform:translateY(0);}',
    '.ch-grip{width:36px;height:4px;border-radius:999px;background:rgba(255,255,255,0.18);',
      'margin:0 auto 18px;}',
    '.ch-title{font-size:16px;font-weight:800;margin-bottom:14px;}',
    '.ch-bullets{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:11px;}',
    '.ch-bullets li{display:flex;gap:10px;font-size:13.5px;font-weight:400;',
      'line-height:1.55;color:rgba(248,250,254,0.82);}',
    '.ch-bullet-dot{width:6px;height:6px;border-radius:50%;background:#0A84FF;',
      'flex:none;margin-top:7px;}',
    '.ch-close{width:100%;margin-top:22px;padding:13px;border-radius:14px;border:none;',
      'font:inherit;font-size:15px;font-weight:700;cursor:pointer;color:#fff;',
      'background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.10);}',
    '.ch-close:active{background:rgba(255,255,255,0.12);}',
    // Badge dot on the "?" button
    '.ch-badge{position:absolute;top:-2px;right:-2px;width:7px;height:7px;',
      'border-radius:50%;background:#0A84FF;pointer-events:none;',
      'box-shadow:0 0 6px #0A84FF;}',
  ].join('');

  (function () {
    var s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
  })();

  // ── Build / show sheet ────────────────────────────────────────────────────
  function show(cfg) {
    if (_overlay) return;

    var overlay = document.createElement('div');
    overlay.className = 'ch-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', cfg.title || 'Help');

    var bullets = (cfg.bullets || []).map(function (b) {
      return '<li><span class="ch-bullet-dot"></span><span>' + b + '</span></li>';
    }).join('');

    overlay.innerHTML =
      '<div class="ch-sheet">' +
        '<div class="ch-grip"></div>' +
        '<div class="ch-title">' + (cfg.title || 'Help') + '</div>' +
        '<ul class="ch-bullets">' + bullets + '</ul>' +
        '<button class="ch-close" aria-label="Close help">Got it</button>' +
      '</div>';

    document.body.appendChild(overlay);
    _overlay = overlay;

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('ch-open'); });
    });

    function close() {
      overlay.classList.remove('ch-open');
      overlay.addEventListener('transitionend', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        _overlay = null;
      }, { once: true });
    }

    overlay.querySelector('.ch-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  // attach(btnId, cfg) — wires a button by id; cfg = { title, bullets[] }
  // Adds a blue dot badge until the sheet has been opened at least once.
  function attach(btnId, cfg) {
    var btn = document.getElementById(btnId);
    if (!btn) return;

    var seenKey = SEEN_KEY + (btnId || 'default');
    var seen = false;
    try { seen = localStorage.getItem(seenKey) === '1'; } catch(e) {}

    // Add badge dot if not yet seen
    if (!seen) {
      btn.style.position = 'relative';
      var badge = document.createElement('span');
      badge.className = 'ch-badge';
      btn.appendChild(badge);
    }

    btn.addEventListener('click', function () {
      show(cfg);
      // Mark seen + remove badge
      try { localStorage.setItem(seenKey, '1'); } catch(e) {}
      var b = btn.querySelector('.ch-badge');
      if (b) b.parentNode.removeChild(b);
    });
  }

  window.coreHelp = { attach: attach, show: show };
})();
