// dash-charts.js — clean minimal SVG line charts + local history store for CORE.
// Self-contained. Never edits core-state.js; it only READS via window.coreState
// and persists its own snapshot trail in localStorage('coreLifeHistory.v1').
(function () {
  if (typeof window === 'undefined') return;
  if (window.dashCharts) return;

  function S() { return window.coreState; }

  var HISTORY_KEY = 'coreLifeHistory.v2';

  // ── date helpers (local-day keys, no Date.now coupling beyond "today") ──
  function dayKey(d) {
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function shortLabel(d) {
    return String(d.getDate()); // day-of-month; light axis only
  }

  // ── storage ──
  function readHistory() {
    try {
      var h = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
      if (h && Array.isArray(h.points)) return h;
    } catch (e) {}
    return { points: [] };
  }
  function writeHistory(h) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) {}
  }

  // Snapshot today's life score + per-stat values. Idempotent per calendar day —
  // updates today's entry in place so reloads never inflate the trail.
  function recordSnapshot() {
    var cs = S(); if (!cs) return;
    var today = new Date();
    var key = dayKey(today);
    var stats = {};
    (cs.STAT_DEFS || []).forEach(function (d) { stats[d.key] = cs.statValue(d.key); });
    var entry = { date: key, score: cs.lifeScore(), stats: stats };

    var h = readHistory();
    var last = h.points[h.points.length - 1];
    if (last && last.date === key) { h.points[h.points.length - 1] = entry; }
    else { h.points.push(entry); }
    if (h.points.length > 120) h.points = h.points.slice(-120);
    writeHistory(h);
  }

  // Deterministic pseudo-noise from a seed (stable across reloads).
  function noise(seed) {
    var x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x); // 0..1
  }

  function clamp(v) { return v < 0 ? 0 : v > 100 ? 100 : v; }

  // Build a gentle back-trail that ENDS at the current value and drifts only a
  // little day-to-day — so a 7d/30d delta reads as a small, realistic number
  // (e.g. ▲ 1.20), never a fake ±27 swing. Values stay fractional so the change
  // badge can show 2 decimals; the displayed value is rounded.
  function ensureBackfill(days) {
    var cs = S(); if (!cs) return;

    var today = new Date();
    var curScore = cs.lifeScore();
    var curStats = {};
    (cs.STAT_DEFS || []).forEach(function (d) { curStats[d.key] = cs.statValue(d.key); });
    var keys = Object.keys(curStats);

    var h = readHistory();
    var last = h.points[h.points.length - 1];
    // Reuse the stored trail only when its end still matches the live values.
    // If state changed after the trail was built (e.g. the demo seed runs after
    // the widget's first paint, or the user earns XP), the old end is stale and
    // would produce a fake huge delta + end-spike — so rebuild ending at current.
    var fresh = last
      && Math.abs((last.score || 0) - curScore) < 0.75
      && keys.every(function (k) { return Math.abs(((last.stats && last.stats[k]) || 0) - curStats[k]) < 0.75; });
    if (h.points.length >= 2 && fresh) return;

    var n = Math.max(days, 30);
    function walk(end, seed) {
      var arr = new Array(n);
      arr[n - 1] = end;
      var v = end;
      for (var i = n - 2; i >= 0; i--) {
        v = clamp(v - (noise(i + seed * 31 + 1) - 0.46) * 0.42); // ~±0.18/day drift
        arr[i] = Math.round(v * 100) / 100;
      }
      return arr;
    }

    var scoreW = walk(curScore, 0);
    var statW = {};
    keys.forEach(function (k, ki) { statW[k] = walk(curStats[k], ki + 1); });

    var pts = [];
    for (var i = 0; i < n; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
      var stats = {};
      keys.forEach(function (k) { stats[k] = statW[k][i]; });
      pts.push({ date: dayKey(d), score: scoreW[i], stats: stats });
    }
    writeHistory({ points: pts });
  }

  // Return the last `days` points. Backfills on first use.
  function getHistory(days) {
    ensureBackfill(days);
    var h = readHistory();
    return h.points.slice(-days);
  }

  // Map a key ('score' or a stat key) to a numeric series.
  function series(points, key) {
    return points.map(function (p) {
      return key === 'score' ? (p.score || 0) : ((p.stats && p.stats[key]) || 0);
    });
  }

  // ── SVG line chart ──
  // opts: { values:[], labels:[], color:'#hex', height, reducedMotion, suffix, animate }
  // animate defaults to true; pass animate:false to redraw without the draw-in
  // (used on coreStateChange re-renders so the line doesn't replay every tick).
  function lineChart(host, opts) {
    opts = opts || {};
    var vals = opts.values || [];
    var color = opts.color || '#0A84FF';
    var W = 100, H = opts.height || 56;            // viewBox units (responsive width)
    var padX = 2, padY = 8;
    var reduced = opts.reducedMotion;
    var animate = (opts.animate !== false) && !reduced;

    if (!vals.length) { host.innerHTML = '<div class="w-empty">No data yet.</div>'; return; }
    if (vals.length === 1) { vals = [vals[0], vals[0]]; }  // single point → flat line (avoid /0)

    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    if (max === min) { max = min + 1; }          // avoid divide-by-zero flat line
    // pad the range a little so the line isn't glued to the edges
    var range = max - min;
    max += range * 0.12; min -= range * 0.12;
    if (min < 0) min = 0;

    var n = vals.length;
    function px(i) { return padX + (i / (n - 1)) * (W - padX * 2); }
    function py(v) { return padY + (1 - (v - min) / (max - min)) * (H - padY * 2); }

    var linePts = vals.map(function (v, i) { return px(i) + ',' + py(v); });
    var linePath = 'M' + linePts.join(' L');
    // area path (fill under the line)
    var areaPath = linePath + ' L' + px(n - 1) + ',' + H + ' L' + px(0) + ',' + H + ' Z';

    var gid = 'lg' + Math.abs(hashStr(color + n + vals[0] + vals[n - 1]));
    var last = vals[n - 1];
    var first = vals[0];
    var delta = last - first;

    var dotX = px(n - 1), dotY = py(last);

    var svg =
      '<svg class="dc-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>' +
            '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path class="dc-area" d="' + areaPath + '" fill="url(#' + gid + ')"' + (animate ? ' style="opacity:0"' : '') + '/>' +
        '<path class="dc-line" d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="1.6" ' +
          'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '</svg>';

    // value caption row + endpoint marker drawn in an overlay (non-stretched)
    host.innerHTML =
      '<div class="dc-wrap">' +
        '<div class="dc-cap">' +
          '<span class="dc-cap-val" style="color:' + color + '">' + Math.round(last) + (opts.suffix || '') + '</span>' +
          '<span class="dc-cap-delta ' + (delta >= 0 ? 'up' : 'dn') + '">' +
            (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta).toFixed(2) + (opts.suffix || '') +
          '</span>' +
        '</div>' +
        '<div class="dc-plot" style="height:' + H + 'px">' + svg +
          '<span class="dc-dot" style="left:' + (dotX) + '%;top:' + (dotY / H * 100) + '%;background:' + color + ';box-shadow:0 0 8px ' + color + '"></span>' +
        '</div>' +
        '<div class="dc-axis"><span>' + (opts.labels && opts.labels[0] || '') + '</span><span>' + (opts.labels && opts.labels[opts.labels.length - 1] || '') + '</span></div>' +
      '</div>';

    // animated draw-in (stroke dash) + area fade — reduced-motion safe
    if (animate) {
      var lineEl = host.querySelector('.dc-line');
      var areaEl = host.querySelector('.dc-area');
      try {
        var len = lineEl.getTotalLength();
        lineEl.style.strokeDasharray = len;
        lineEl.style.strokeDashoffset = len;
        // force layout then transition
        lineEl.getBoundingClientRect();
        lineEl.style.transition = 'stroke-dashoffset 1.05s cubic-bezier(.4,.8,.3,1)';
        lineEl.style.strokeDashoffset = '0';
        if (areaEl) {
          areaEl.style.transition = 'opacity .9s ease .25s';
          requestAnimationFrame(function () { areaEl.style.opacity = '1'; });
        }
      } catch (e) {
        if (areaEl) areaEl.style.opacity = '1';
      }
    }
  }

  function hashStr(s) {
    var h = 0; s = String(s);
    for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return h;
  }

  // Labels for the first/last point of a series window.
  function rangeLabels(points) {
    if (!points.length) return ['', ''];
    function lbl(p) { var parts = p.date.split('-'); return parts[2] + '/' + parts[1]; }
    return [lbl(points[0]), lbl(points[points.length - 1])];
  }

  window.dashCharts = {
    recordSnapshot: recordSnapshot,
    getHistory: getHistory,
    series: series,
    lineChart: lineChart,
    rangeLabels: rangeLabels,
    HISTORY_KEY: HISTORY_KEY
  };
})();
