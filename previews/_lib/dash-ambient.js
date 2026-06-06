// dash-ambient.js — time+weather adaptive living background for CORE dashboard
(function () {
  if (typeof window === 'undefined') return;
  if (window.dashAmbient) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  var TIME_STATES = {
    sunrise:   { bg: 'linear-gradient(180deg,#1a0602 0%,#3d1508 28%,#7a3010 50%,#02020A 100%)', sky: '#FF8C42', accent: '#FFB067', starOpacity: 0.3 },
    day:       { bg: 'linear-gradient(180deg,#020712 0%,#021428 32%,#021020 62%,#02020A 100%)', sky: '#0A84FF', accent: '#2F8FFF', starOpacity: 0 },
    afternoon: { bg: 'linear-gradient(180deg,#08040a 0%,#1e0b04 28%,#301408 52%,#02020A 100%)', sky: '#FF7A45', accent: '#FFC857', starOpacity: 0.08 },
    sunset:    { bg: 'linear-gradient(180deg,#0a0208 0%,#200520 28%,#400a1a 52%,#02020A 100%)', sky: '#FF6B7E', accent: '#9F8FFF', starOpacity: 0.45 },
    night:     { bg: 'linear-gradient(180deg,#000008 0%,#02020e 40%,#02020A 100%)',             sky: '#7BC4FF', accent: '#0A84FF', starOpacity: 1.0 },
  };

  var WMO_MAP = {
    0:'clear',1:'clear',2:'cloudy',3:'cloudy',
    45:'fog',48:'fog',
    51:'rain',53:'rain',55:'rain',61:'rain',63:'rain',65:'rain',
    71:'snow',73:'snow',75:'snow',77:'snow',
    80:'rain',81:'rain',82:'rain',
    85:'snow',86:'snow',
    95:'rain',96:'rain',99:'rain'
  };

  function wmoToWeather(code) { return WMO_MAP[code] || 'clear'; }

  function getTimeState(h) {
    if (h >= 5  && h < 8)  return 'sunrise';
    if (h >= 8  && h < 16) return 'day';
    if (h >= 16 && h < 18) return 'afternoon';
    if (h >= 18 && h < 20) return 'sunset';
    return 'night';
  }

  function getParam(n) {
    try { var m = location.search.match(new RegExp('[?&]' + n + '=([^&]+)')); return m ? m[1] : null; } catch(e) { return null; }
  }

  var currentTime    = getParam('time')    || getTimeState(new Date().getHours());
  var currentWeather = getParam('weather') || 'clear';

  var bgEl, overlayEl, celestialEl, starsEl;

  // ── star field ──
  function buildStars(host, opacity) {
    if (REDUCED || opacity < 0.05) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 55; i++) {
      var s = document.createElement('span');
      var sz = (i%7===0) ? 2.2 : (i%3===0) ? 1.6 : 1.0;
      s.className = 'amb-star';
      s.style.cssText = 'position:absolute;border-radius:50%;background:#fff;pointer-events:none;' +
        'width:'+sz+'px;height:'+sz+'px;' +
        'left:'+((i*37+13)%100)+'%;top:'+((i*53+7)%100)+'%;' +
        'animation:ambTwinkle '+(3+(i%5))+'s ease-in-out '+((i%9)*0.4)+'s infinite;';
      if (i%11===0) s.style.boxShadow = '0 0 5px rgba(150,195,255,0.7)';
      frag.appendChild(s);
    }
    host.appendChild(frag);
    host.style.opacity = opacity;
  }

  // ── celestial ──
  function buildCelestial() {
    if (celestialEl) celestialEl.innerHTML = '';
    if (!celestialEl) return;
    if (currentTime === 'day') return;
    var isNight = currentTime === 'night' || currentTime === 'sunset';
    var el = document.createElement('div');
    if (isNight && currentTime === 'night') {
      el.style.cssText = 'position:absolute;right:22%;top:8%;width:28px;height:28px;border-radius:50%;' +
        'background:radial-gradient(circle at 38% 42%,#fff 35%,#d8e8ff 60%,transparent 100%);' +
        'box-shadow:0 0 18px rgba(190,220,255,0.55),0 0 40px rgba(130,180,255,0.2);pointer-events:none;';
    } else {
      var c = currentTime === 'sunset' ? '#ff9060' : (currentTime === 'afternoon' ? '#ffb067' : '#fff9e6');
      el.style.cssText = 'position:absolute;left:50%;top:'+(currentTime==='sunrise'?'18':'12')+'%;transform:translateX(-50%);' +
        'width:22px;height:22px;border-radius:50%;background:'+c+';' +
        'box-shadow:0 0 28px '+c+',0 0 60px rgba(255,160,80,0.22);pointer-events:none;';
    }
    celestialEl.appendChild(el);
  }

  // ── rain canvas ──
  function buildRain() {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0.5;';
    canvas.width = 390; canvas.height = 844;
    var ctx = canvas.getContext('2d');
    var drops = [];
    for (var i = 0; i < 80; i++) drops.push({ x: Math.random()*390, y: Math.random()*844, speed: 4+Math.random()*6, len: 10+Math.random()*14 });
    var raf;
    function draw() {
      ctx.clearRect(0,0,390,844);
      ctx.strokeStyle = 'rgba(160,210,255,0.55)'; ctx.lineWidth = 0.8;
      drops.forEach(function(d) {
        ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-2,d.y+d.len); ctx.stroke();
        d.y += d.speed; d.x -= 1;
        if (d.y > 844) { d.y = -20; d.x = Math.random()*390; }
      });
      raf = requestAnimationFrame(draw);
    }
    if (!REDUCED) draw();
    canvas._stop = function() { cancelAnimationFrame(raf); };
    return canvas;
  }

  // ── snow canvas ──
  function buildSnow() {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0.7;';
    canvas.width = 390; canvas.height = 844;
    var ctx = canvas.getContext('2d');
    var flakes = [];
    for (var i = 0; i < 60; i++) flakes.push({ x: Math.random()*390, y: Math.random()*844, r: 1+Math.random()*2.5, speed: 0.5+Math.random()*1.5, drift: (Math.random()-0.5)*0.5 });
    var raf;
    function draw() {
      ctx.clearRect(0,0,390,844);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      flakes.forEach(function(f) {
        ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
        f.y += f.speed; f.x += f.drift;
        if (f.y > 844) { f.y = -6; f.x = Math.random()*390; }
        if (f.x < 0) f.x = 390; if (f.x > 390) f.x = 0;
      });
      raf = requestAnimationFrame(draw);
    }
    if (!REDUCED) draw();
    canvas._stop = function() { cancelAnimationFrame(raf); };
    return canvas;
  }

  // ── clouds ──
  function buildClouds() {
    var div = document.createElement('div');
    div.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    [[-5,8,120,0.35],[30,5,160,0.25],[60,12,100,0.3],[10,22,90,0.2],[50,28,130,0.18]].forEach(function(c,i) {
      var cl = document.createElement('div');
      cl.style.cssText = 'position:absolute;left:'+c[0]+'%;top:'+c[1]+'%;width:'+c[2]+'px;height:'+(c[2]*0.45)+'px;' +
        'background:rgba(200,220,255,'+c[3]+');border-radius:50px;filter:blur(18px);pointer-events:none;' +
        (REDUCED ? '' : 'animation:ambCloudDrift '+(22+i*6)+'s ease-in-out '+(i*4)+'s infinite;');
      div.appendChild(cl);
    });
    return div;
  }

  function applyState() {
    var ts = TIME_STATES[currentTime] || TIME_STATES.night;

    // Background
    if (bgEl) {
      bgEl.style.background = ts.bg;
      bgEl.style.setProperty('--amb-sky', ts.sky);
      bgEl.style.setProperty('--amb-accent', ts.accent);
    }

    // Aurora colours
    var aurora = document.getElementById('ambAurora');
    if (aurora) {
      aurora.style.setProperty('--aurora-a', ts.sky);
      aurora.style.setProperty('--aurora-b', ts.accent);
    }

    // Stars
    if (starsEl) { starsEl.innerHTML = ''; buildStars(starsEl, ts.starOpacity); }

    // Celestial
    buildCelestial();

    // Weather overlay
    if (overlayEl) {
      if (overlayEl._stopFn) { overlayEl._stopFn(); overlayEl._stopFn = null; }
      overlayEl.innerHTML = '';
      overlayEl.style.background = '';
      if (currentWeather === 'rain') {
        var rl = buildRain(); overlayEl.appendChild(rl); overlayEl._stopFn = rl._stop;
      } else if (currentWeather === 'snow') {
        var sl = buildSnow(); overlayEl.appendChild(sl); overlayEl._stopFn = sl._stop;
      } else if (currentWeather === 'cloudy') {
        overlayEl.appendChild(buildClouds());
      } else if (currentWeather === 'fog') {
        overlayEl.style.background = 'rgba(200,210,230,0.10)';
      }
    }

    try { window.dispatchEvent(new CustomEvent('dashAmbientChange', { detail: { time: currentTime, weather: currentWeather, sky: ts.sky, accent: ts.accent } })); } catch(e) {}
  }

  function fetchWeather() {
    var forced = getParam('weather');
    if (forced) { currentWeather = forced; applyState(); return; }
    if (!navigator.geolocation) { applyState(); return; }
    navigator.geolocation.getCurrentPosition(function(pos) {
      var lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
      fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=weather_code')
        .then(function(r) { return r.json(); })
        .then(function(data) { currentWeather = wmoToWeather((data.current && data.current.weather_code) || 0); applyState(); })
        .catch(function() { applyState(); });
    }, function() { applyState(); }, { timeout: 6000 });
  }

  function init(options) {
    options = options || {};
    bgEl        = options.bg        || document.getElementById('ambBg');
    overlayEl   = options.overlay   || document.getElementById('ambOverlay');
    celestialEl = options.celestial || document.getElementById('ambCelestial');
    starsEl     = options.stars     || document.getElementById('ambStars');
    if (!bgEl) return;

    if (!document.getElementById('ambStyles')) {
      var style = document.createElement('style');
      style.id = 'ambStyles';
      style.textContent =
        '@keyframes ambTwinkle{0%,100%{opacity:0.15;transform:scale(0.7);}50%{opacity:0.85;transform:scale(1.15);}}' +
        '@keyframes ambCloudDrift{0%,100%{transform:translateX(0);}50%{transform:translateX(28px);}}' +
        '@media(prefers-reduced-motion:reduce){.amb-star{animation:none!important;}}';
      document.head.appendChild(style);
    }

    var forcedTime = getParam('time');
    if (forcedTime && TIME_STATES[forcedTime]) currentTime = forcedTime;

    applyState();
    fetchWeather();
    setInterval(function() {
      if (!getParam('time')) currentTime = getTimeState(new Date().getHours());
      applyState();
    }, 60000);
  }

  window.dashAmbient = { init: init, getTime: function() { return currentTime; }, getWeather: function() { return currentWeather; } };
})();
