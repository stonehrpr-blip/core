/* ============================================================================
   CORE — Stat Kit engine
   Renders a complete life-stat page from a small config and wires it to
   window.coreState. One codebase → six consistent pages.

   StatKit.mount(el, config) where config = {
     key, model, name, sub, color, greet,
     states: [{min, label}, ...]  (desc by min),
     actions: [{ id, name, unit, step, def, gain, icon }],
     scan: { label, unit, act }    // act = id of the action the scan feeds
   }

   Data model — a single localStorage log shared with the profile Totals:
     coreActivityLog : [{ ts, stat:model, act, name, amount, unit, gain }]
   Strength also mirrors to coreWorkoutLog (cat:'Fitness') so the existing
   profile "Totals" card keeps working unchanged.
   ============================================================================ */
(function () {
  if (typeof window === 'undefined') return;
  var S = window.coreState;
  var ALOG = 'coreActivityLog';

  function readLog() { try { return JSON.parse(localStorage.getItem(ALOG) || '[]') || []; } catch (e) { return []; } }
  function writeLog(a) { try { localStorage.setItem(ALOG, JSON.stringify(a.slice(0, 500))); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function ago(ts) {
    var d = Date.now() - ts, m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    var dd = Math.floor(h / 24); if (dd === 1) return 'yesterday';
    if (dd < 7) return dd + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  function mount(root, cfg) {
    root.classList.add('sk');
    root.style.setProperty('--stat', cfg.color);

    var act = function (id) { return cfg.actions.filter(function (a) { return a.id === id; })[0]; };
    var range = '1M';
    var RANGE_DAYS = { '1M': 30, '6M': 182, '1Y': 365 };

    // ── build static markup ────────────────────────────────────────────────
    var actsHtml = cfg.actions.map(function (a) {
      return '<button class="sk-act" data-act="' + a.id + '">'
        + '<span class="sk-act-ic"><svg viewBox="0 0 24 24">' + a.icon + '</svg></span>'
        + '<span class="sk-act-tx"><span class="sk-act-name">' + esc(a.name) + '</span>'
        + '<span class="sk-act-meta" data-meta="' + a.id + '">+' + a.gain + ' · ' + a.def + ' ' + a.unit + '</span></span></button>';
    }).join('');
    var scanHtml = cfg.scan ? '<button class="sk-act sk-scan" id="skScan">'
      + '<svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>'
      + '<span class="sk-act-name">' + esc(cfg.scan.label) + '</span></button>' : '';

    root.innerHTML =
      '<div class="sk-top">'
      + '<a class="sk-back" href="23-profile.html" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></a>'
      + '<div class="sk-titles"><div class="sk-title">' + esc(cfg.name) + '</div><div class="sk-sub">' + esc(cfg.sub || cfg.name) + '</div></div>'
      + '<div class="sk-xp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.3L21 9l-4.8 4.3L17.6 20 12 16.4 6.4 20l1.4-6.7L3 9l6.4-.7z"/></svg><span id="skXp">0</span></div>'
      + '</div>'

      + '<div class="sk-hero">'
      + '<div class="sk-greet" id="skGreet"></div>'
      + '<div class="sk-ringwrap">'
      + '<svg class="sk-ring" viewBox="0 0 208 208"><defs><linearGradient id="sk-grad" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="' + cfg.color + '"/><stop offset="1" stop-color="#fff" stop-opacity="0.9"/></linearGradient></defs>'
      + '<circle class="trk" cx="104" cy="104" r="92"/>'
      + '<circle class="arc" id="skArc" cx="104" cy="104" r="92"/></svg>'
      + '<div class="sk-ring-core"><div class="sk-score" id="skScore">0</div><div class="sk-score-of">/ 100</div>'
      + '<div class="sk-state" id="skState">—</div></div>'
      + '</div>'
      + '<div class="sk-delta" id="skDelta"></div>'
      + '</div>'

      + '<div class="sk-h"><div class="sk-h-t">Log activity</div></div>'
      + '<div class="sk-acts">' + actsHtml + scanHtml + '</div>'

      + '<div class="sk-h"><div class="sk-h-t">Totals</div>'
      + '<div class="sk-seg" id="skSeg"><button data-r="1M" class="on">1M</button><button data-r="6M">6M</button><button data-r="1Y">1Y</button></div></div>'
      + '<div class="sk-card sk-totals" id="skTotals"></div>'

      + '<div class="sk-h"><div class="sk-h-t">Recent</div></div>'
      + '<div class="sk-hist" id="skHist"></div>'

      // scanner overlay
      + (cfg.scan ? (
        '<div class="sk-scanner" id="skScanner">'
        + '<video id="skVid" playsinline muted></video><div class="sk-sc-cam-off">Camera off — tap to count</div><div class="veil"></div>'
        + '<div class="sk-sc-top"><button class="sk-sc-x" id="skScX"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'
        + '<div class="sk-sc-title">' + esc(cfg.scan.label) + '</div><div style="width:40px"></div></div>'
        + '<div class="sk-sc-mid"><div class="sk-sc-reticle"></div><div class="sk-sc-count" id="skCount">0</div><div class="sk-sc-unit">' + esc(cfg.scan.unit) + '</div>'
        + '<div class="sk-sc-hint">Tap the button each ' + (cfg.scan.unit === 'reps' ? 'rep' : 'count') + ' — or hold steady to auto-count</div></div>'
        + '<div class="sk-sc-bot"><button class="sk-sc-tap" id="skTap">+1</button><button class="sk-sc-save" id="skSave">Save</button></div>'
        + '</div>') : '')

      // stepper sheet
      + '<div class="sk-sheet-veil" id="skSheetVeil"><div class="sk-sheet">'
      + '<div class="sk-sheet-grip"></div>'
      + '<div class="sk-sheet-title" id="skSheetTitle"></div><div class="sk-sheet-sub" id="skSheetSub"></div>'
      + '<div class="sk-step"><button id="skMinus">–</button><div class="sk-step-val"><div class="sk-step-num" id="skStepNum">0</div><div class="sk-step-unit" id="skStepUnit"></div></div><button id="skPlus">+</button></div>'
      + '<button class="sk-sheet-go" id="skSheetGo">Log it</button>'
      + '</div></div>';

    // ── ring geometry ──────────────────────────────────────────────────────
    var C = 2 * Math.PI * 92;
    var arc = root.querySelector('#skArc');
    arc.style.strokeDasharray = C;
    arc.style.strokeDashoffset = C;

    // ── greeting by time of day ────────────────────────────────────────────
    (function () {
      var h = new Date().getHours();
      var part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      root.querySelector('#skGreet').innerHTML = part + '. ' + esc(cfg.greet || '');
    })();

    function stateFor(v) {
      var st = (cfg.states || []).filter(function (s) { return v >= s.min; })[0];
      return st ? st.label : '—';
    }

    // ── render score / ring / xp / delta ───────────────────────────────────
    function renderScore() {
      var v = (S && S.statValue) ? S.statValue(cfg.key) : 0;
      root.querySelector('#skScore').textContent = Math.round(v);
      root.querySelector('#skState').textContent = stateFor(v);
      requestAnimationFrame(function () { arc.style.strokeDashoffset = C * (1 - Math.max(0, Math.min(100, v)) / 100); });
      var xp = 0; try { xp = (S.read().xp) || 0; } catch (e) {}
      root.querySelector('#skXp').textContent = fmt(xp) + ' XP';
      // 7-day delta from the ledger
      var since = Date.now() - 7 * 86400000, d = 0;
      try {
        (S.read().statLedger || []).forEach(function (e) {
          if ((e.stat === cfg.model) && e.ts >= since) d += (e.delta || 0);
        });
      } catch (e) {}
      var de = root.querySelector('#skDelta');
      d = Math.round(d * 10) / 10;
      de.className = 'sk-delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : '');
      de.innerHTML = d === 0 ? 'No change this week — log something to move it.'
        : 'This week <b>' + (d > 0 ? '+' : '') + d + '</b> points';
    }

    // ── totals ─────────────────────────────────────────────────────────────
    function renderTotals() {
      var since = Date.now() - RANGE_DAYS[range] * 86400000;
      var log = readLog().filter(function (e) { return e.stat === cfg.model && e.ts >= since; });
      var by = {};
      log.forEach(function (e) {
        var k = e.act || e.name;
        if (!by[k]) by[k] = { name: e.name, unit: e.unit, sum: 0 };
        by[k].sum += (e.amount || 0);
      });
      var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.sum - a.sum; });
      var box = root.querySelector('#skTotals');
      if (!rows.length) {
        box.innerHTML = '<div class="sk-empty">Nothing logged in this range yet.<br>Tap an activity above to start tracking.</div>';
        return;
      }
      var max = rows[0].sum || 1;
      box.innerHTML = rows.map(function (r) {
        return '<div class="sk-tot"><div class="sk-tot-name">' + esc(r.name) + '</div>'
          + '<div class="sk-tot-val">' + fmt(r.sum) + '<span class="sk-tot-unit">' + esc(r.unit) + '</span></div>'
          + '<div class="sk-tot-bar"><i style="width:' + Math.max(6, Math.round(r.sum / max * 100)) + '%"></i></div></div>';
      }).join('');
    }

    // ── history ────────────────────────────────────────────────────────────
    function renderHist() {
      var log = readLog().filter(function (e) { return e.stat === cfg.model; }).slice(0, 8);
      var box = root.querySelector('#skHist');
      if (!log.length) { box.innerHTML = '<div class="sk-empty">No activity yet.</div>'; return; }
      box.innerHTML = log.map(function (e) {
        var a = act(e.act) || {};
        return '<div class="sk-row"><span class="sk-row-ic"><svg viewBox="0 0 24 24">' + (a.icon || '<circle cx="12" cy="12" r="8"/>') + '</svg></span>'
          + '<div class="sk-row-tx"><div class="sk-row-name">' + esc(e.name) + '</div><div class="sk-row-time">' + ago(e.ts) + '</div></div>'
          + '<div class="sk-row-amt">' + fmt(e.amount) + ' ' + esc(e.unit) + '</div>'
          + (e.gain ? '<div class="sk-row-gain">+' + e.gain + '</div>' : '') + '</div>';
      }).join('');
    }

    function renderMetas() {
      // refresh per-action "logged today" hints
      var today = new Date().toDateString();
      var log = readLog();
      cfg.actions.forEach(function (a) {
        var el = root.querySelector('[data-meta="' + a.id + '"]');
        if (!el) return;
        var t = log.filter(function (e) { return e.act === a.id && new Date(e.ts).toDateString() === today; })
          .reduce(function (s, e) { return s + (e.amount || 0); }, 0);
        el.innerHTML = t > 0 ? '<span class="done">✓ ' + fmt(t) + ' ' + a.unit + ' today</span>' : '+' + a.gain + ' · ' + a.def + ' ' + a.unit;
      });
    }

    function renderAll() { renderScore(); renderTotals(); renderHist(); renderMetas(); }

    // ── logging ────────────────────────────────────────────────────────────
    function logActivity(a, amount) {
      amount = Math.max(0, Math.round(amount));
      if (!amount) return;
      var log = readLog();
      log.unshift({ ts: Date.now(), stat: cfg.model, act: a.id, name: a.name, amount: amount, unit: a.unit, gain: a.gain });
      writeLog(log);
      // strength mirrors to the legacy workout log the profile Totals reads
      if (cfg.model === 'body') {
        try {
          var wl = JSON.parse(localStorage.getItem('coreWorkoutLog') || '[]');
          wl.push({ ts: Date.now(), ex: a.id, name: a.name, count: amount, unit: a.unit, cat: 'Fitness' });
          localStorage.setItem('coreWorkoutLog', JSON.stringify(wl));
        } catch (e) {}
      }
      try { if (S && S.addStat) S.addStat(cfg.key, a.gain, 'log:' + a.id); } catch (e) {}
      try { if (S && S.addXp) S.addXp(a.gain * 2, 'log:' + a.id); } catch (e) {}
      floatGain(a.gain);
      haptic([0, 30, 18, 40]);
      renderAll();
    }

    function floatGain(g) {
      var f = document.createElement('div');
      f.className = 'sk-float'; f.textContent = '+' + g;
      f.style.top = '40%';
      document.body.appendChild(f);
      setTimeout(function () { f.remove(); }, 1100);
    }

    // ── stepper sheet ──────────────────────────────────────────────────────
    var sheetAct = null, stepVal = 0;
    var veil = root.querySelector('#skSheetVeil');
    function openSheet(a) {
      sheetAct = a; stepVal = a.def;
      root.querySelector('#skSheetTitle').textContent = a.name;
      root.querySelector('#skSheetSub').textContent = '+' + a.gain + ' ' + cfg.name + ' · adjust the amount';
      root.querySelector('#skStepUnit').textContent = a.unit;
      root.querySelector('#skStepNum').textContent = stepVal;
      veil.classList.add('open');
    }
    function closeSheet() { veil.classList.remove('open'); }
    root.querySelector('#skMinus').onclick = function () { stepVal = Math.max(0, stepVal - (sheetAct.step || 1)); root.querySelector('#skStepNum').textContent = stepVal; haptic(8); };
    root.querySelector('#skPlus').onclick = function () { stepVal += (sheetAct.step || 1); root.querySelector('#skStepNum').textContent = stepVal; haptic(8); };
    root.querySelector('#skSheetGo').onclick = function () { var a = sheetAct, v = stepVal; closeSheet(); if (a) logActivity(a, v); };
    veil.addEventListener('click', function (e) { if (e.target === veil) closeSheet(); });

    // tap = quick-log default; the ▾ is implicit (open sheet on long-press)
    root.querySelectorAll('.sk-act[data-act]').forEach(function (btn) {
      var a = act(btn.getAttribute('data-act'));
      var lp = null, longed = false;
      btn.addEventListener('pointerdown', function () { longed = false; lp = setTimeout(function () { longed = true; haptic(20); openSheet(a); }, 380); });
      var cancel = function () { clearTimeout(lp); };
      btn.addEventListener('pointerup', function () { clearTimeout(lp); if (!longed) { btn.classList.add('flash'); setTimeout(function () { btn.classList.remove('flash'); }, 360); logActivity(a, a.def); } });
      btn.addEventListener('pointerleave', cancel);
      btn.addEventListener('pointercancel', cancel);
    });

    // ── scanner ────────────────────────────────────────────────────────────
    if (cfg.scan) {
      var scanner = root.querySelector('#skScanner');
      var vid = root.querySelector('#skVid');
      var countEl = root.querySelector('#skCount');
      var count = 0, stream = null;
      function bump() { count++; countEl.textContent = count; countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); haptic(22); }
      root.querySelector('#skScan').onclick = function () {
        count = 0; countEl.textContent = '0'; scanner.classList.add('open');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function (s) { stream = s; vid.srcObject = s; scanner.classList.add('live'); vid.play().catch(function () {}); })
            .catch(function () {});
        }
      };
      function closeScan() {
        scanner.classList.remove('open'); scanner.classList.remove('live');
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      }
      root.querySelector('#skScX').onclick = closeScan;
      root.querySelector('#skTap').onclick = bump;
      root.querySelector('#skSave').onclick = function () {
        var a = act(cfg.scan.act) || cfg.actions[0];
        closeScan();
        if (count > 0) logActivity(a, count);
      };
    }

    // ── range segmented ────────────────────────────────────────────────────
    root.querySelector('#skSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      range = b.getAttribute('data-r');
      root.querySelectorAll('#skSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderTotals();
    });

    // ── init ───────────────────────────────────────────────────────────────
    try { if (S && S.applyStatTick) S.applyStatTick(); } catch (e) {}
    renderAll();
    window.addEventListener('coreStateChange', renderScore);
  }

  window.StatKit = { mount: mount };
})();
