/* ──────────────────────────────────────────────────────────────────────────
 * core-gems.js — shared rank-gem renderer.
 *
 * Single source of gem art is coreState.RANK_ICONS (keyed by rank name). This
 * module wraps that inner markup in a <svg viewBox="0 0 100 100"> so every page
 * renders the SAME gem from one place, replacing the old assets/ranks/*.png art.
 *
 * Colour comes from the host element (`.gem{ color:var(--c) }`) via currentColor —
 * the gems use #fff/#000 opacity facets only and define NO gradient <defs> ids,
 * so any number can render on one page (e.g. the 11-up ladder) without id clashes.
 *
 * Usage:  el.innerHTML = coreGems.svg(rankName, { tier: 1|2|3, cls, title });
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  function icons() {
    try { return (window.coreState && window.coreState.RANK_ICONS) || {}; }
    catch (e) { return {}; }
  }

  // Inner gem markup for a rank (falls back to the first rank if unknown).
  function inner(name) {
    var I = icons();
    return I[name] || I.Sand || '';
  }

  // A subtle within-rank "tier step": a couple of extra twinkles for II/III so a
  // higher tier of the same rank reads as a notch brighter. Fixed positions, no ids.
  function tierSpark(tier) {
    if (!tier || tier < 2) return '';
    var pts = [[81, 21], [19, 81], [85, 64]];
    var n = tier >= 3 ? 3 : 1, r = tier >= 3 ? 1.7 : 1.4, op = tier >= 3 ? 0.85 : 0.55, out = '';
    for (var i = 0; i < n; i++) {
      out += '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="' + r + '" fill="#fff" opacity="' + op + '"/>';
    }
    return out;
  }

  // Full <svg> string for a rank gem.
  function svg(name, opts) {
    opts = opts || {};
    var tier = opts.tier || 0;
    var cls = opts.cls ? (' class="' + opts.cls + '"') : '';
    var title = (opts.title != null ? opts.title : (name || 'Rank'));
    return '<svg viewBox="0 0 100 100"' + cls + ' role="img" aria-label="' + title + '">'
      + inner(name) + tierSpark(tier) + '</svg>';
  }

  // ── Gem with real per-tier PNG art (SVG-first, PNG-upgrade) ────────────────
  // Strategy: render the inline SVG gem IMMEDIATELY (always visible — no broken
  // images, no reliance on inline onerror that a CSP could block), then quietly
  // preload assets/ranks/<rank>-<tier>.png (tier 1/2/3 = I/II/III) and, if it
  // exists, swap the SVG for the real <img>. Auto-runs via hydrate() below, so
  // pages don't need to do anything — drop the PNGs in and they appear.
  var GEM_DIR = 'assets/ranks/';
  var GEM_VER = '?v=10';   // bump when the emblem art changes so browsers refetch
  function path(name, tier) {
    var t = (tier >= 1 && tier <= 3) ? tier : 3;
    return GEM_DIR + String(name).toLowerCase() + '-' + t + '.png' + GEM_VER;
  }
  // tier-agnostic emblem (one art per rank), used when no per-tier file exists
  function basePath(name) {
    return GEM_DIR + String(name).toLowerCase() + '.png' + GEM_VER;
  }
  // winged tier badge art (I/II/III) — assets/ranks/<rank>-t<tier>.png
  function badgePath(name, tier) {
    var t = (tier >= 1 && tier <= 3) ? tier : 1;
    return GEM_DIR + String(name).toLowerCase() + '-t' + t + '.png' + GEM_VER;
  }
  function badge(name, tier, cls) {
    return '<img class="cg-badge' + (cls ? ' ' + cls : '') + '" src="' + badgePath(name, tier)
      + '" alt="Tier ' + tier + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  }
  // Returns an inline SVG marked for PNG upgrade (class `cg-png` + data attrs).
  function img(name, opts) {
    opts = opts || {};
    var t = (opts.tier >= 1 && opts.tier <= 3) ? opts.tier : 3;
    var cls = 'cg-png' + (opts.cls ? (' ' + opts.cls) : '');
    var title = (opts.title != null ? opts.title : (name || 'Rank'));
    return '<svg viewBox="0 0 100 100" class="' + cls + '" role="img" aria-label="' + title + '"'
      + ' data-rank="' + name + '" data-tier="' + t + '">' + inner(name) + tierSpark(t) + '</svg>';
  }
  // Scan for marked gems and upgrade each to its PNG if a file loads. Tries the
  // per-tier file first (<rank>-<tier>.png), then the per-rank emblem
  // (<rank>.png); if neither exists the inline SVG gem simply stays.
  function hydrate(root) {
    if (typeof document === 'undefined') return;
    root = root || document;
    var nodes = root.querySelectorAll ? root.querySelectorAll('svg.cg-png[data-rank]') : [];
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        if (el.__cg) return; el.__cg = 1;
        var n = el.getAttribute('data-rank'), t = +el.getAttribute('data-tier') || 3;
        function swap(src) {
          if (!el.parentNode) return;
          var keep = (el.getAttribute('class') || '').replace(/\bcg-png\b/, '').trim();
          var im = document.createElement('img');
          if (keep) im.className = keep;
          im.src = src; im.alt = n;
          el.parentNode.replaceChild(im, el);
        }
        var pre = new Image();
        pre.onload = function () { swap(path(n, t)); };
        pre.onerror = function () {
          var pre2 = new Image();
          pre2.onload = function () { swap(basePath(n)); };
          pre2.onerror = function () {};   // keep the SVG
          pre2.src = basePath(n);
        };
        pre.src = path(n, t);
      })(nodes[i]);
    }
  }

  window.coreGems = {
    svg: svg,
    img: img,
    inner: inner,
    path: path,
    basePath: basePath,
    badge: badge,
    badgePath: badgePath,
    hydrate: hydrate,
    dir: function (d) { if (d) GEM_DIR = d; return GEM_DIR; },
    has: function (n) { return !!icons()[n]; },
    names: function () { return Object.keys(icons()); }
  };

  // Auto-hydrate: initial scan + watch for dynamically-inserted gems (debounced).
  if (typeof document !== 'undefined') {
    var _scan = function () { try { hydrate(document); } catch (e) {} };
    if (document.readyState !== 'loading') _scan();
    else document.addEventListener('DOMContentLoaded', _scan);
    if (window.MutationObserver) {
      var _t = null;
      new MutationObserver(function () { clearTimeout(_t); _t = setTimeout(_scan, 60); })
        .observe(document.documentElement, { childList: true, subtree: true });
    }
  }
})();
