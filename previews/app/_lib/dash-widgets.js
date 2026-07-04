// dash-widgets.js — self-contained widget registry for CORE dashboard
(function () {
  if (typeof window === 'undefined') return;
  if (window.dashWidgets) return;

  function S() { return window.coreState; }

  // ── Quotes ──────────────────────────────────────────────────────────────────
  var QUOTES = [
    "Discipline is choosing between what you want now and what you want most.",
    "The secret of getting ahead is getting started.",
    "Small actions compounded become extraordinary results.",
    "You don't rise to the level of your goals. You fall to the level of your systems.",
    "Do the hard work, especially when you don't feel like it.",
    "Every day is a new opportunity to improve yourself.",
    "The body achieves what the mind believes.",
    "Focus on progress, not perfection.",
    "Your future self is watching you right now.",
    "Consistency beats intensity every single time.",
    "Earn your confidence through action.",
    "The cost of discipline is always less than the pain of regret.",
    "Don't count the days. Make the days count.",
    "You are one decision away from a completely different life.",
    "Hard work beats talent when talent doesn't work hard.",
    "Dream big. Start small. Act now.",
    "Success is the sum of small efforts repeated day in and day out.",
    "The only limit is the one you set yourself.",
    "Push harder than yesterday if you want a different tomorrow.",
    "A year from now you'll wish you had started today.",
    "Growth begins at the end of your comfort zone.",
    "Make yourself proud.",
    "Motivation gets you started. Discipline keeps you going.",
    "You have exactly the life you're willing to put up with.",
    "Don't stop when you're tired. Stop when you're done.",
    "Every expert was once a beginner.",
    "Win the morning. Win the day.",
    "Change is hard at first, messy in the middle, gorgeous at the end.",
    "One percent better every single day.",
    "Believe you can. Then do the work.",
    "The difference between ordinary and extraordinary is that little extra.",
    "Tired is just a feeling. Quitting is a choice.",
    "What you allow is what will continue.",
    "Be so good they can't ignore you.",
    "Commit to the process. Trust the outcome.",
    "Every sunrise is a chance to rewrite the story.",
    "Your habits shape your future.",
    "Show up even when it's hard.",
    "Choose progress over perfection, always.",
    "The strongest version of you is being built right now.",
    "Action is the antidote to anxiety.",
    "Build the life you deserve. Brick by brick.",
    "Make today worth remembering.",
    "The version of you that succeeds already exists. Become them.",
    "Strength comes from overcoming what you thought you couldn't.",
    "Be the energy you want to attract.",
    "Clarity plus action equals unstoppable.",
    "You're not behind. You're exactly where you need to be.",
    "No shortcuts. No excuses. Just work.",
    "The grind never stops for those who love what they're building.",
  ];

  function dailyQuote() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var dayOfYear = Math.floor((now - start) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }

  function statLevel(v) { return Math.floor((v || 0) / 15) + 1; }

  function parseMinutes(str) {
    if (!str) return 0;
    var m = String(str).match(/(\d+)\s*(min|hr|h)/i);
    if (!m) return 0;
    return m[2].toLowerCase()[0] === 'h' ? parseInt(m[1], 10) * 60 : parseInt(m[1], 10);
  }

  // Count-up animation
  function animCount(el, to) {
    if (!el) return;
    var from = parseInt((el.textContent || '0').replace(/\D/g, ''), 10) || 0;
    if (from === to) { el.textContent = to; return; }
    var start = null, dur = 700;
    if (el._raf) cancelAnimationFrame(el._raf);
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._raf = requestAnimationFrame(step);
    }
    el._raf = requestAnimationFrame(step);
  }

  // Get the page a task routes to, using STAT_DEFS where available
  function getTaskPage(task) {
    var cs = S();
    if (!task.stat) return '21-quests.html';
    var defs = (cs && cs.STAT_DEFS) || [];
    for (var i = 0; i < defs.length; i++) {
      if (defs[i].key === task.stat) {
        return defs[i].page || ('stat.html?s=' + task.stat);
      }
    }
    return 'stat.html?s=' + task.stat;
  }

  var STAT_IC = {
    strength: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
    focus:    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 1.5v3M12 19.5v3M22.5 12h-3M4.5 12h-3"/>',
    wealth:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.6 10h4a1.6 1.6 0 0 1 0 3.2h-3.2a1.6 1.6 0 0 0 0 3.2h4.2"/>',
    health:   '<path d="M12 20.5s-7.2-4.6-7.2-9.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 7.2 3.7c0 5.2-7.2 9.8-7.2 9.8Z"/>',
    social:   '<circle cx="9" cy="8" r="3.2"/><path d="M3.4 20a5.6 5.6 0 0 1 11.2 0M16 5.2a3.2 3.2 0 0 1 0 6M18.7 20a5.6 5.6 0 0 0-3.1-5"/>',
    purpose:  '<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
  };

  // ── Shared 7d/30d range toggle (used by lifetrend + stattrend) ──
  function segHeadHTML(range) {
    return '<div class="dc-head"><div class="dc-seg" role="tablist">' +
      '<button class="dc-seg-btn' + (range === 7 ? ' on' : '') + '" data-r="7">7d</button>' +
      '<button class="dc-seg-btn' + (range === 30 ? ' on' : '') + '" data-r="30">30d</button>' +
      '</div></div>';
  }
  function wireSeg(host, onPick) {
    Array.prototype.forEach.call(host.querySelectorAll('.dc-seg-btn'), function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); onPick(+this.dataset.r); });
    });
  }

  // ── REGISTRY ─────────────────────────────────────────────────────────────────
  var REGISTRY = {

    quote: {
      id: 'quote', title: 'Daily Quote',
      icon: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
      render: function (host) {
        // Task 1a: rank chip removed — rank lives in the Life Score hero only.
        host.innerHTML =
          '<div class="w-quote">' +
          '<div class="w-quote-top">' +
          '<svg class="w-quote-mark" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>' +
          '</div>' +
          '<p class="w-quote-text">' + dailyQuote() + '</p>' +
          '</div>';
      }
    },

    // ── Life Score (DEFAULT) — slim hero: big number + progress bar only ──

    // Stat Breakdown removed — its per-stat page links now live on the
    // Stat Trends widget (strength→gym, focus→focus, wealth→wealth,
    // health/social/purpose→stat.html?s=<key>).

    tasks: {
      id: 'tasks', title: "Today's Tasks",
      icon: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
      render: function (host) {
        var cs = S();

        function getTasks() {
          var s = cs ? cs.read() : {};
          var daily = (s.quests && s.quests.daily) || [];
          return daily.map(function (q) {
            return {
              id: q.id, title: q.title,
              time: q.time || '10 min', deadline: q.deadline || null,
              xp: q.xp || 10, stat: q.stat, statGain: q.statGain || 2,
              done: !!q.done, diff: q.diff || 'medium'
            };
          });
        }

        function countdownStr(dl) {
          var left = dl - Date.now();
          if (left <= 0) return 'Due now';
          var m = Math.ceil(left / 60000);
          return m < 60 ? m + 'm left' : Math.ceil(m / 60) + 'h left';
        }

        var wasAllDone = false;
        function renderTasks(justDoneId) {
          host.innerHTML = '';
          var tasks = getTasks();
          var done = tasks.filter(function (t) { return t.done; }).length;
          var totalMin = tasks.filter(function (t) { return !t.done; })
            .reduce(function (a, t) { return a + parseMinutes(t.time); }, 0);
          var budgetStr = totalMin >= 60
            ? Math.floor(totalMin / 60) + 'h ' + (totalMin % 60 ? totalMin % 60 + 'm' : '')
            : totalMin + 'm';

          var header = document.createElement('div');
          header.className = 'w-tasks-header';
          header.innerHTML =
            '<span class="w-tasks-progress"><b>' + done + '</b> / ' + tasks.length + ' done</span>' +
            '<span class="w-tasks-budget">' + (totalMin > 0 ? budgetStr + ' left' : 'All done!') + '</span>' +
            '<a href="21-quests.html" class="w-tasks-viewall">All<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;vertical-align:-1px;margin-left:3px"><path d="M9 6l6 6-6 6"/></svg></a>';
          host.appendChild(header);

          if (!tasks.length) {
            var e = document.createElement('div');
            e.className = 'w-empty'; e.textContent = 'No quests today.';
            host.appendChild(e); wasAllDone = false; return;
          }

          // all-tasks-done celebratory moment
          var allDone = done === tasks.length;
          if (allDone) {
            var cel = document.createElement('div');
            cel.className = 'w-tasks-done';
            cel.innerHTML =
              '<div class="w-tasks-done-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-11"/></svg></div>' +
              '<div class="w-tasks-done-txt"><b>All quests complete</b><span>Nice work — come back tomorrow for more XP.</span></div>';
            host.appendChild(cel);
            if (!wasAllDone) { try { window.coreSfx && window.coreSfx('levelup'); } catch (er) {} }
          }
          wasAllDone = allDone;

          tasks.forEach(function (task) {
            var isDone = task.done;
            var timeDisplay = task.deadline ? countdownStr(task.deadline) : (task.time || '10 min');

            // The whole row is the tap target — click anywhere to complete.
            var row = document.createElement('button');
            row.type = 'button';
            row.className = 'w-task-row' + (isDone ? ' done' : '') + (justDoneId === task.id ? ' just-done' : '');
            row.setAttribute('aria-label', (isDone ? 'Completed: ' : 'Complete: ') + task.title);

            row.innerHTML =
              '<span class="w-task-check' + (isDone ? ' checked' : '') + '">' +
                '<svg class="w-task-check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-11"/></svg>' +
              '</span>' +
              '<div class="w-task-body">' +
                '<span class="w-task-title">' + task.title + '</span>' +
                '<div class="w-task-meta">' +
                  '<span class="w-task-chip">' + timeDisplay + '</span>' +
                '</div>' +
              '</div>' +
              '<span class="w-task-xp-badge">+' + task.xp + ' XP</span>';

            if (!isDone) {
              row.addEventListener('click', function () {
                if (cs) cs.completeQuest(task.id);
                try { window.coreSfx && window.coreSfx('xp'); } catch (err) {}
                try { if (navigator.vibrate) navigator.vibrate(22); } catch (err) {}
                renderTasks(task.id);   // re-render with this row's check popping
              });
            }

            host.appendChild(row);
          });
        }

        renderTasks();
        window.addEventListener('coreStateChange', renderTasks);
        host._cleanup = function () { window.removeEventListener('coreStateChange', renderTasks); };
      }
    },

    streak: {
      id: 'streak', title: 'Daily Streak',
      icon: '<path d="M12 2c1 3-1 4-1 6 0 1 1 2 1 2s2-1 2-3c2 2 3 4 3 7a5 5 0 0 1-10 0c0-3 2-5 3-7 1 2 2 2 2 2s0-3 0-7Z"/>',
      render: function (host) {
        var cs = S(), s = cs ? cs.read() : {};
        var days = (s.streak && s.streak.days) || 0;
        var best = Math.max(s.bestStreak || 0, days);
        var next = [3, 7, 14, 30, 90].filter(function (n) { return n > days; })[0] || 90;
        // Features 9 + 14: flame colour + size grows with streak length
        var fc = days >= 30 ? '#FF4D4D' : days >= 14 ? '#FF6B3D' : days >= 7 ? '#FF8A3D' : days >= 3 ? '#FF9F59' : days >= 1 ? '#FFC83D' : '#6B7280';
        var fsz = days >= 30 ? 30 : days >= 14 ? 28 : 26;
        host.innerHTML =
          '<div class="w-streak">' +
          '<a href="26-streak.html" class="w-streak-inner" style="text-decoration:none;color:inherit">' +
            '<div class="w-streak-fire" style="background:color-mix(in srgb,' + fc + ' 16%,transparent)"><svg viewBox="0 0 24 24" fill="currentColor" style="width:' + fsz + 'px;height:' + fsz + 'px;color:' + fc + (days >= 7 ? ';filter:drop-shadow(0 0 5px ' + fc + ')' : '') + '"><path d="M12 2c1 3-1 4-1 6 0 1 1 2 1 2s2-1 2-3c2 2 3 4 3 7a5 5 0 0 1-10 0c0-3 2-5 3-7 1 2 2 2 2 2s0-3 0-7Z"/></svg></div>' +
            '<div class="w-streak-body"><span class="w-streak-days">' + days + '<small> day streak</small></span><span class="w-streak-next">Next milestone: ' + next + ' days</span></div>' +
            '<div class="w-streak-best"><div class="w-streak-best-n">' + best + '</div><div class="w-streak-best-l">Best</div></div>' +
          '</a></div>';
      }
    },

    corepower: {
      id: 'corepower', title: 'CORE Power',
      icon: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z"/>',
      render: function (host) {
        var cs = S();
        var power = cs ? cs.corePower() : 0;
        var s = cs ? cs.read() : {};
        var xp = s.xp || 0;
        var level = cs && cs.levelFor ? cs.levelFor(xp) : (Math.floor(xp / 300) + 1);
        var rank = cs && cs.rankFor ? cs.rankFor(xp) : { name: 'Stone', color: '#AEB4BD' };
        host.innerHTML =
          '<div class="w-power">' +
          '<div class="w-power-top"><span class="w-power-label">CORE Power</span><span class="w-power-val">0</span></div>' +
          '<div class="w-power-meta">' +
            '<span class="w-power-pill">Lv ' + level + '</span>' +
            '<span class="w-power-pill" style="color:' + (rank.color || '#aaa') + '">' + rank.name + '</span>' +
          '</div></div>';
        setTimeout(function () { animCount(host.querySelector('.w-power-val'), power); }, 60);
      }
    },

    weather: {
      id: 'weather', title: 'Weather',
      icon: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
      render: function (host) {
        var SVG_HEAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
        var ICONS  = {
          clear:  SVG_HEAD + '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
          cloudy: SVG_HEAD + '<path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.8 9.3 3.6 3.6 0 0 0 7 18z"/></svg>',
          rain:   SVG_HEAD + '<path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.8 9.3 3.6 3.6 0 0 0 7 18z"/><path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"/></svg>',
          snow:   SVG_HEAD + '<path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.8 9.3 3.6 3.6 0 0 0 7 18z"/><path d="M8 20h.01M12 21h.01M16 20h.01"/></svg>',
          fog:    SVG_HEAD + '<path d="M3 10h18M5 14h14M4 18h16"/></svg>'
        };
        var LABELS = { clear: 'Clear skies', cloudy: 'Overcast', rain: 'Raining', snow: 'Snowing', fog: 'Foggy' };
        var amb = window.dashAmbient;
        var w = amb ? amb.getWeather() : 'clear';
        function rawTemp() { try { var t = localStorage.getItem('coreWeatherTemp'); return (t == null || t === '') ? null : parseFloat(t); } catch (e) { return null; } }
        function unit() { try { return localStorage.getItem('coreTempUnit') || 'C'; } catch (e) { return 'C'; } }
        function fmtTemp() {
          var t = rawTemp(); if (t == null) return '';
          return unit() === 'F' ? Math.round(t * 9 / 5 + 32) + '°F' : Math.round(t) + '°C';
        }
        // Tap toggles °C/°F — a small, useful interaction in place of a forecast page.
        host.innerHTML =
          '<div class="w-weather" id="wWeatherRow" role="button" tabindex="0" title="Tap to switch °C / °F">' +
          '<span class="w-weather-icon" id="wWIcon">' + (ICONS[w] || ICONS.clear) + '</span>' +
          '<span class="w-weather-label" id="wWLabel">' + (LABELS[w] || 'Clear') + '</span>' +
          '<span class="w-weather-temp" id="wWTemp">' + fmtTemp() + '</span>' +
          '</div>';
        function paint() {
          var ic = host.querySelector('#wWIcon'), lb = host.querySelector('#wWLabel'), tp = host.querySelector('#wWTemp');
          if (ic) ic.innerHTML = ICONS[w] || ICONS.clear;
          if (lb) lb.textContent = LABELS[w] || 'Clear';
          if (tp) tp.textContent = fmtTemp();
        }
        function onAmb(e) {
          if (e.detail && e.detail.weather) w = e.detail.weather;
          if (e.detail && typeof e.detail.temp === 'number') { try { localStorage.setItem('coreWeatherTemp', String(Math.round(e.detail.temp))); } catch (x) {} }
          paint();
        }
        var row = host.querySelector('#wWeatherRow');
        function toggleUnit() {
          try { localStorage.setItem('coreTempUnit', unit() === 'F' ? 'C' : 'F'); } catch (e) {}
          paint(); try { window.coreSfx && window.coreSfx('tick'); } catch (e) {}
        }
        if (row) {
          row.addEventListener('click', toggleUnit);
          row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleUnit(); } });
        }
        window.addEventListener('dashAmbientChange', onAmb);
        host._cleanup = function () { window.removeEventListener('dashAmbientChange', onAmb); };
      }
    },

    friends: {
      id: 'friends', title: 'Friends',
      icon: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>',
      render: function (host) {
        var social = window.coreSocial;
        var friends = (social && social.friends && social.friends()) || [];
        if (!friends.length) {
          host.innerHTML = '<div class="w-empty">No friends yet.<br><a href="23-profile.html" style="color:var(--blue);font-weight:700;text-decoration:none">Go to Profile<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;vertical-align:-1px;margin-left:3px"><path d="M9 6l6 6-6 6"/></svg></a></div>';
          return;
        }
        var html = '<a href="23-profile.html" class="w-friends-header">' +
          '<span class="w-friends-count">' + friends.length + ' ' + (friends.length === 1 ? 'friend' : 'friends') + '</span>' +
          '<span class="w-friends-seeall">Profile<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;vertical-align:-1px;margin-left:3px"><path d="M9 6l6 6-6 6"/></svg></span>' +
          '</a><div class="w-friends-list">';
        friends.slice(0, 4).forEach(function (f) {
          html += '<a href="23-profile.html" class="w-friend-item" style="text-decoration:none;color:inherit">' +
            '<div class="w-friend-avatar">' + ((f.name || '?').charAt(0).toUpperCase()) + '</div>' +
            '<div class="w-friend-info"><span class="w-friend-name">' + (f.name || 'Unknown') + '</span><span class="w-friend-rank">' + (f.rank || 'Stone') + '</span></div>' +
            '<span class="w-friend-power">' + (f.power || 0) + '</span></a>';
        });
        host.innerHTML = html + '</div>';
      }
    },

    recentactivity: {
      id: 'recentactivity', title: 'Recent Activity',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
      render: function (host) {
        var cs = S(), s = cs ? cs.read() : {};
        var all = (s.xpLedger || []).filter(function (e) { return e.delta > 0; }).slice(0, 20);
        var expanded = false;
        function row(e) {
          var ago = Math.round((Date.now() - e.ts) / 60000);
          var agoStr = ago < 2 ? 'just now' : ago < 60 ? ago + 'm ago' : Math.round(ago / 60) + 'h ago';
          return '<div class="w-activity-item">' +
            '<span class="w-activity-dot"></span>' +
            '<span class="w-activity-label">' + (e.reason || 'XP').replace('quest:', 'Quest: ').replace('routine:', 'Routine: ').replace('quicklog:', 'Logged: ') + '</span>' +
            '<span class="w-activity-xp">+' + (e.delta || 0) + ' XP</span>' +
            '<span class="w-activity-time">' + agoStr + '</span></div>';
        }
        function draw() {
          if (!all.length) { host.innerHTML = '<div class="w-empty">Complete quests to see activity here.</div>'; return; }
          var show = expanded ? all : all.slice(0, 3);
          var html = '<div class="w-activity-list">' + show.map(row).join('') + '</div>';
          if (all.length > 3) html += '<button class="w-act-more" type="button">' + (expanded ? 'See less' : 'See more (' + (all.length - 3) + ')') + '</button>';
          host.innerHTML = html;
          var mb = host.querySelector('.w-act-more');
          if (mb) mb.addEventListener('click', function () { expanded = !expanded; draw(); });
        }
        draw();
        function onUpdate() { var ns = cs ? cs.read() : {}; all = (ns.xpLedger || []).filter(function (e) { return e.delta > 0; }).slice(0, 20); draw(); }
        window.addEventListener('coreStateChange', onUpdate);
        host._cleanup = function () { window.removeEventListener('coreStateChange', onUpdate); };
      }
    },

    // ── Life Score trend (OPTIONAL chart) ──
    lifetrend: {
      id: 'lifetrend', title: 'Life Score Trend',
      icon: '<path d="M3 17l5-6 4 4 5-7M3 21h18"/>',
      render: function (host) {
        var DC = window.dashCharts;
        if (!DC) { host.innerHTML = '<div class="w-empty">Chart engine not loaded.</div>'; return; }
        var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
        var range = 7, painted = false;

        function draw() {
          var pts = DC.getHistory(range);
          host.innerHTML = segHeadHTML(range) + '<div class="dc-host"></div>';
          DC.lineChart(host.querySelector('.dc-host'), {
            values: DC.series(pts, 'score'),
            labels: DC.rangeLabels(pts),
            color: '#0A84FF',
            height: 60,
            reducedMotion: reduced,
            animate: !painted           // animate on first paint + range switch only
          });
          painted = true;
          wireSeg(host, function (r) { if (r !== range) { range = r; painted = false; } draw(); });
        }
        draw();
        function onUpdate() { draw(); }  // painted stays true → no re-animation on state change
        window.addEventListener('coreStateChange', onUpdate);
        host._cleanup = function () { window.removeEventListener('coreStateChange', onUpdate); };
      }
    },
    // Stat Trends moved to a fixed section on the main dashboard (see 20-dashboard.html).

  };

  // ── Layout ───────────────────────────────────────────────────────────────────
  // v4 — the 6 life scores + routine are dedicated sections now; the widget grid
  // defaults to Streak only (Stat Trends moved into the Life Scores section).
  var LAYOUT_KEY = 'coreDashboard.v4';
  // Clean, minimal default (Lock In style): rank/score hero first, then the
  // to-do list. Everything else is opt-in via the customize (gear) sheet.
  var DEFAULT_LAYOUT = ['streak'];

  function readLayout() {
    try {
      var raw = localStorage.getItem(LAYOUT_KEY);
      if (raw != null) {
        var s = JSON.parse(raw);
        // Honor an explicitly-saved array, INCLUDING empty — removing the last
        // widget should leave an empty dashboard (empty-state), not silently
        // restore defaults. Defaults are only for first run + Reset.
        // Drop ids for widgets that no longer exist (e.g. removed lifescore /
        // quickactions) so old saved layouts don't render blanks.
        if (Array.isArray(s)) return s.filter(function (id) { return !!REGISTRY[id]; });
      }
    } catch (e) {}
    return DEFAULT_LAYOUT.slice();
  }
  function saveLayout(ids) { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(ids)); } catch (e) {} }
  function getWidget(id) { return REGISTRY[id] || null; }
  function getAll() { return Object.keys(REGISTRY).map(function (k) { return REGISTRY[k]; }); }

  window.dashWidgets = { REGISTRY: REGISTRY, getWidget: getWidget, getAll: getAll, readLayout: readLayout, saveLayout: saveLayout, DEFAULT_LAYOUT: DEFAULT_LAYOUT, dailyQuote: dailyQuote };
})();
