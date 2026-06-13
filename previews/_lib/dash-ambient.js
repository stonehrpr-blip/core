// dash-ambient.js — star-field canvas for CORE dashboard (no time-cycle)
(function () {
  if (typeof window === 'undefined') return;
  if (window.dashAmbient) return;

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
  var W = 390, H = 844, DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Static index-page gradient — no time-of-day changes
  var BASE_GRADIENT =
    'radial-gradient(60% 35% at 50% 30%,rgba(47,143,255,0.18) 0%,transparent 55%),' +
    'radial-gradient(50% 30% at 50% 100%,rgba(159,143,255,0.10) 0%,transparent 65%),' +
    'linear-gradient(180deg,#060B26 0%,#02020A 50%,#050510 100%)';

  var WMO = {
    0:'clear',1:'clear',2:'cloudy',3:'cloudy',
    45:'fog',48:'fog',
    51:'rain',53:'rain',55:'rain',61:'rain',63:'rain',65:'rain',
    71:'snow',73:'snow',75:'snow',77:'snow',80:'rain',81:'rain',82:'rain',85:'snow',86:'snow',
    95:'rain',96:'rain',99:'storm'
  };

  function getP(n) {
    try { var m = location.search.match(new RegExp('[?&]' + n + '=([^&]+)')); return m ? m[1] : null; } catch(e) { return null; }
  }

  var currentWeather = getP('weather') || 'clear';
  var bgEl, canvas, ctx, rafId, t = 0;
  var stars = [], shots = [], rain = [], snow = [], ripples = [];
  var lightningTTL = 0;

  // ── Init ──────────────────────────────────────────────────────────────────
  function initParticles() {
    stars = []; shots = []; rain = []; snow = []; ripples = []; lightningTTL = 0;

    // Always: a light star field — sparse, covering the whole screen top to bottom
    for (var i = 0; i < 30; i++) stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.28 + Math.random() * 1.6,
      ph: Math.random() * Math.PI * 2,
      spd: 0.25 + Math.random() * 1.0,
      blue: Math.random() < 0.20
    });

    if (currentWeather === 'rain' || currentWeather === 'storm') {
      var rc = currentWeather === 'storm' ? 140 : 100;
      for (var i = 0; i < rc; i++) rain.push({
        x: Math.random() * (W + 45), y: Math.random() * H,
        len: 9 + Math.random() * 18, spd: 6.5 + Math.random() * 9,
        op: 0.10 + Math.random() * 0.26
      });
    }

    if (currentWeather === 'snow') {
      for (var i = 0; i < 72; i++) snow.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 2.4, spd: 0.28 + Math.random() * 0.9,
        ph: Math.random() * Math.PI * 2, amp: 0.18 + Math.random() * 0.55
      });
    }
  }

  // ── Stars ─────────────────────────────────────────────────────────────────
  function drawStars() {
    stars.forEach(function (s) {
      var op = Math.max(0, Math.min(1, Math.sin(t * s.spd * 0.020 + s.ph) * 0.36 + 0.60));
      ctx.globalAlpha = op;
      ctx.fillStyle = s.blue ? '#BDD4FF' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.05 && op > 0.55) {
        ctx.globalAlpha = op * 0.22;
        ctx.strokeStyle = s.blue ? '#BDD4FF' : '#FFFFFF'; ctx.lineWidth = 0.5;
        var fl = s.r * 4.2;
        ctx.beginPath(); ctx.moveTo(s.x - fl, s.y); ctx.lineTo(s.x + fl, s.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x, s.y - fl); ctx.lineTo(s.x, s.y + fl); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function updateShots() {
    if (Math.random() < 0.0028 && shots.length < 2) {
      shots.push({
        x: Math.random() * 210 + 20, y: 8 + Math.random() * 120,
        vx: 3.4 + Math.random() * 5.0, vy: 1.0 + Math.random() * 2.3,
        len: 28 + Math.random() * 34, life: 0, max: 30 + Math.random() * 32
      });
    }
    shots = shots.filter(function (s) {
      s.x += s.vx; s.y += s.vy; s.life++;
      var p = s.life / s.max;
      var alpha = (p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75) * 0.90;
      var g = ctx.createLinearGradient(s.x - s.len, s.y - s.len * 0.38, s.x, s.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.6, 'rgba(255,255,255,' + (alpha * 0.36) + ')');
      g.addColorStop(1, 'rgba(255,255,255,' + alpha + ')');
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x - s.len, s.y - s.len * 0.38); ctx.lineTo(s.x, s.y); ctx.stroke();
      return s.life < s.max;
    });
  }

  // ── Weather ───────────────────────────────────────────────────────────────
  function drawRain() {
    var dx = 0.188, dy = 0.982;
    rain.forEach(function (d) {
      ctx.strokeStyle = 'rgba(168,213,255,' + d.op + ')'; ctx.lineWidth = 0.68;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + dx * d.len, d.y + dy * d.len); ctx.stroke();
      d.x += dx * d.spd * 0.33; d.y += dy * d.spd;
      if (d.y > H) {
        if (d.y > H - 55) ripples.push({ x: d.x, y: H - 26 + Math.random() * 12, r: 0, maxR: 3 + Math.random() * 4, life: 0, max: 22 });
        d.y = -d.len; d.x = Math.random() * (W + 45);
      }
      if (d.x > W + 22) d.x = -20;
    });
    ripples = ripples.filter(function (r) {
      r.r = r.maxR * (r.life / r.max); r.life++;
      ctx.strokeStyle = 'rgba(168,213,255,' + (1 - r.life / r.max) * 0.20 + ')'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.24, 0, 0, Math.PI * 2); ctx.stroke();
      return r.life < r.max;
    });
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g.addColorStop(0, 'rgba(4,6,20,0.42)'); g.addColorStop(1, 'rgba(4,6,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.5);
  }

  function maybeLightning() {
    if (lightningTTL > 0) {
      ctx.fillStyle = 'rgba(210,225,255,' + (lightningTTL / 9) * 0.18 + ')';
      ctx.fillRect(0, 0, W, H); lightningTTL--;
    } else if (Math.random() < 0.0013) { lightningTTL = 5 + Math.floor(Math.random() * 5); }
  }

  function drawSnow() {
    snow.forEach(function (f) {
      f.y += f.spd; f.x += Math.sin(t * 0.011 + f.ph) * f.amp;
      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      if (f.x < -4) f.x = W + 4; if (f.x > W + 4) f.x = -4;
      ctx.globalAlpha = 0.50 + Math.sin(t * 0.014 + f.ph) * 0.20;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawOvercast() {
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    g.addColorStop(0, 'rgba(10,10,22,0.45)'); g.addColorStop(1, 'rgba(10,10,22,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.55);
  }

  // ── Scrim (card legibility) ───────────────────────────────────────────────
  function drawScrim() {
    // Subtle vignette only — background is already dark enough
    var vg = ctx.createRadialGradient(W / 2, H * 0.50, W * 0.18, W / 2, H * 0.50, W * 0.88);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────
  function loop() {
    t++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(DPR, DPR);

    drawStars();
    if (!REDUCED) updateShots();

    if      (currentWeather === 'cloudy' || currentWeather === 'fog') drawOvercast();
    else if (currentWeather === 'rain' || currentWeather === 'storm') { drawRain(); if (!REDUCED) maybeLightning(); }
    else if (currentWeather === 'snow')  drawSnow();

    drawScrim();
    ctx.restore();
    rafId = requestAnimationFrame(loop);
  }

  function staticFrame() {
    ctx.save(); ctx.scale(DPR, DPR);
    drawStars(); drawScrim();
    ctx.restore();
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  function applyCSS() {
    if (bgEl) {
      bgEl.style.transition = 'none';
      bgEl.style.background = BASE_GRADIENT;
      requestAnimationFrame(function () { bgEl.style.transition = ''; });
    }
    var glyphEl = document.getElementById('dashWeatherGlyph');
    if (glyphEl) {
      var SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:block;">';
      var WEATHER_SVG = {
        clear:  SVG_OPEN + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
        cloudy: SVG_OPEN + '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18z"/></svg>',
        rain:   SVG_OPEN + '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 15z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>',
        snow:   SVG_OPEN + '<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"/></svg>',
        fog:    SVG_OPEN + '<path d="M7 13a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 13z"/><path d="M5 17h14M7 21h10"/></svg>',
        storm:  SVG_OPEN + '<path d="M7 14a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 14z"/><path d="M12 12l-2 4h3l-2 4"/></svg>'
      };
      glyphEl.innerHTML = WEATHER_SVG[currentWeather] || WEATHER_SVG.clear;
    }
    try { window.dispatchEvent(new CustomEvent('dashAmbientChange', { detail: { time: 'night', weather: currentWeather } })); } catch(e) {}
  }

  // ── Weather fetch ─────────────────────────────────────────────────────────
  function fetchWeather() {
    if (getP('weather')) return;
    if (!navigator.geolocation) return;
    try {
      navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
        if (r.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(function (pos) {
          var lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
          fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=weather_code')
            .then(function (r) { return r.json(); })
            .then(function (d) {
              var code = (d.current && d.current.weather_code) || 0;
              currentWeather = WMO[code] || 'clear';
              initParticles(); applyCSS();
            }).catch(function () {});
        }, function () {}, { timeout: 6000 });
      }).catch(function () {});
    } catch (e) {}
  }

  // ── Mount ─────────────────────────────────────────────────────────────────
  function init() {
    bgEl = document.getElementById('ambBg');
    ['ambStars', 'ambOverlay'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.innerHTML = '';
    });

    var host = document.getElementById('ambCelestial');
    if (!host) return;
    host.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    host.appendChild(canvas);
    ctx = canvas.getContext('2d');

    var fw = getP('weather');
    if (fw) currentWeather = fw;

    initParticles();
    applyCSS();

    if (rafId) cancelAnimationFrame(rafId);
    if (!REDUCED) { rafId = requestAnimationFrame(loop); } else { staticFrame(); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
      else if (!REDUCED && !rafId) { rafId = requestAnimationFrame(loop); }
    });

    fetchWeather();
  }

  window.dashAmbient = {
    init:       init,
    getTime:    function () { return 'night'; },
    getWeather: function () { return currentWeather; }
  };
})();
