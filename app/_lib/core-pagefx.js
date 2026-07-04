// core-pagefx.js — consistent "open" transition between CORE preview pages.
// On an internal link tap, the phone frame gently fades + scales out before
// navigating, so moving between the dashboard and the life-score pages feels
// intentional and uniform. Back buttons (core-back.js) and external/hash links
// are left untouched. Respects prefers-reduced-motion.
(function () {
  if (typeof window === 'undefined' || window.__corePagefx) return;
  window.__corePagefx = 1;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return; } catch (e) {}

  var leaving = false;

  document.addEventListener('click', function (e) {
    if (leaving || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    // opt-outs: back buttons (own handler), current page, explicit skips
    if (a.matches('.back, .back-btn, [data-back], [data-fallback], [data-no-fx], [aria-current="page"], [aria-label="Back"]')) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) return;

    leaving = true;
    e.preventDefault();
    var ph = document.querySelector('.phone') || document.documentElement;
    ph.style.transition = 'opacity .19s ease, transform .19s ease';
    ph.style.transformOrigin = '50% 46%';
    ph.style.opacity = '0';
    ph.style.transform = 'scale(.972)';
    setTimeout(function () { window.location.href = href; }, 165);
    // safety net: if navigation is somehow blocked, restore the frame
    setTimeout(function () {
      leaving = false;
      ph.style.transition = ''; ph.style.opacity = ''; ph.style.transform = ''; ph.style.transformOrigin = '';
    }, 1400);
  }, true);

  // restore on bfcache return (back/forward) so a faded-out frame isn't sticky
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted) return;
    leaving = false;
    var ph = document.querySelector('.phone') || document.documentElement;
    ph.style.transition = ''; ph.style.opacity = ''; ph.style.transform = '';
  });
})();
