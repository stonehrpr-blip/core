/**
 * CoreToast — a small global toast for coin earns / spends / status messages.
 *
 *   coreToast("+10 coins · honest log");
 *   coreToast("Saved", { kind: 'info' });
 *   coreToast("Not enough coins", { kind: 'warn' });
 *
 * Floats from the bottom and auto-dismisses after 2.4s. Stacks if multiple fire.
 */
(function() {
  if (typeof window === 'undefined') return;

  function ensureStyles() {
    if (document.getElementById('core-toast-styles')) return;
    const css = `
      .core-toast-root {
        position: fixed; left: 50%; bottom: 90px; transform: translateX(-50%);
        z-index: 9999; display: flex; flex-direction: column; align-items: center; gap: 6px;
        pointer-events: none;
      }
      /* On short phones the bottom:90 toast collides with bottom-CTA content.
         Flip it to top so it floats just below the top bar instead. */
      @media (max-height: 720px) {
        .core-toast-root {
          bottom: auto;
          top: calc(108px + env(safe-area-inset-top, 0px));
        }
      }
      .core-toast {
        pointer-events: auto;
        padding: 9px 14px 9px 11px;
        border-radius: 999px;
        background: rgba(20, 22, 36, 0.92);
        border: 1px solid rgba(74, 143, 255, 0.30);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif;
        font-size: 12.5px; font-weight: 700; letter-spacing: -0.1px;
        display: inline-flex; align-items: center; gap: 7px;
        backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 10px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04);
        opacity: 0; transform: translateY(12px) scale(0.96);
        animation: core-toast-in 220ms cubic-bezier(0.22,1,0.36,1) forwards;
      }
      .core-toast.out { animation: core-toast-out 200ms cubic-bezier(.4,0,1,1) forwards; }
      .core-toast .ico { width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 10px; }
      .core-toast.coin       { border-color: rgba(255,208,92,0.50); }
      .core-toast.coin .ico  { background: radial-gradient(circle at 32% 28%, #FFF1C2 0%, #FFD05C 60%, #876619 100%); color: #3D2A05; font-weight: 800; }
      .core-toast.info       { border-color: rgba(74,143,255,0.40); }
      .core-toast.info .ico  { background: #4A8FFF; color: #fff; }
      .core-toast.warn       { border-color: rgba(248,113,113,0.45); }
      .core-toast.warn .ico  { background: #F87171; color: #fff; }
      .core-toast.success    { border-color: rgba(52,211,153,0.45); }
      .core-toast.success .ico { background: #34D399; color: #050510; }
      @keyframes core-toast-in  { to { opacity:1; transform: translateY(0) scale(1); } }
      @keyframes core-toast-out { to { opacity:0; transform: translateY(8px) scale(0.96); } }
      @media (prefers-reduced-motion: reduce) {
        .core-toast { animation: none; opacity: 1; transform: none; }
        .core-toast.out { animation: none; opacity: 0; }
      }
    `;
    const s = document.createElement('style');
    s.id = 'core-toast-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }
  function ensureRoot() {
    let r = document.querySelector('.core-toast-root');
    if (!r) {
      r = document.createElement('div');
      r.className = 'core-toast-root';
      document.body.appendChild(r);
    }
    return r;
  }
  function iconFor(kind, message) {
    if (kind === 'coin') return 'C';
    if (kind === 'warn') return '!';
    if (kind === 'success') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;display:block;"><path d="M5 12l4 4 10-11"/></svg>';
    return 'i';
  }
  function toast(message, opts) {
    ensureStyles();
    const root = ensureRoot();
    opts = opts || {};
    let kind = opts.kind;
    if (!kind) {
      // Heuristic: starts with "+" or contains "coin" -> coin toast
      if (/^\s*[+]\d+/.test(message) || /coin/i.test(message)) kind = 'coin';
      else kind = 'info';
    }
    const el = document.createElement('div');
    el.className = 'core-toast ' + kind;
    el.innerHTML = '<span class="ico">' + iconFor(kind, message) + '</span><span>' + String(message) + '</span>';
    root.appendChild(el);
    const ttl = opts.ttl || 2400;
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => { try { root.removeChild(el); } catch(e){} }, 250);
    }, ttl);
    return el;
  }

  window.coreToast = toast;
  // Auto-fire a toast whenever coreState earns or spends coins (so every page benefits)
  function wireCoinEvents() {
    if (!window.coreState || window.__coreCoinToastWired) return;
    window.__coreCoinToastWired = true;
    let lastBalance = null;
    try { lastBalance = (coreState.read().coins || 0); } catch(e){}
    window.addEventListener('coreStateChange', function() {
      try {
        const cur = (coreState.read().coins || 0);
        if (lastBalance === null) { lastBalance = cur; return; }
        const delta = cur - lastBalance;
        lastBalance = cur;
        if (delta === 0) return;
        // Find the most recent ledger entry to derive a reason label
        let reason = '';
        try {
          const s = coreState.read();
          const last = (s.coinLedger && s.coinLedger[0]);
          if (last && Math.abs(last.delta) === Math.abs(delta)) reason = last.reason || '';
        } catch(e){}
        const label = reasonToLabel(reason);
        if (delta > 0) toast('+' + delta + ' coins' + (label ? ' · ' + label : ''), { kind: 'coin' });
        else toast(delta + ' coins' + (label ? ' · ' + label : ''), { kind: 'coin' });
      } catch(e){}
    });
  }
  function reasonToLabel(reason) {
    if (!reason) return '';
    if (reason === 'honest_slip') return 'honest log';
    if (reason === 'post_to_feed') return 'post';
    if (reason.startsWith('stat_quiz_')) return reason.slice(10) + ' quiz';
    if (reason.startsWith('milestone_')) return 'day ' + reason.slice(10) + ' milestone';
    if (reason === 'restore_streak') return 'streak restore';
    if (reason.startsWith('buy_')) return reason.slice(4).replace(/-/g, ' ');
    if (reason.startsWith('gift_')) return 'gift';
    if (reason.startsWith('transfer_to_')) return 'sent to ' + reason.slice(12);
    return reason.replace(/_/g, ' ');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireCoinEvents);
  } else {
    wireCoinEvents();
  }

  // #91 — Global error toast. Catches uncaught errors and unhandled promise rejections
  // and surfaces a short toast. Dev-only friendly: in local file:// it shows the message,
  // anywhere else it shows a generic line so users don't see stack traces.
  function isDev() {
    return location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }
  window.addEventListener('error', function(e) {
    if (!e || !e.message) return;
    // Ignore the noisy ResizeObserver loop warnings
    if (/ResizeObserver/.test(e.message)) return;
    const msg = isDev() ? 'Error: ' + e.message.slice(0, 80) : 'Something went wrong';
    try { toast(msg, { kind: 'warn', ttl: 4000 }); } catch(_){}
  });
  window.addEventListener('unhandledrejection', function(e) {
    const reason = (e && e.reason && (e.reason.message || String(e.reason))) || 'unknown';
    const msg = isDev() ? 'Promise: ' + reason.slice(0, 80) : 'Something went wrong';
    try { toast(msg, { kind: 'warn', ttl: 4000 }); } catch(_){}
  });
})();
