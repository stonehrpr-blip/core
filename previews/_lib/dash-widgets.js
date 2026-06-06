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

  // ── REGISTRY ─────────────────────────────────────────────────────────────────
  var REGISTRY = {

    quote: {
      id: 'quote', title: 'Daily Quote',
      icon: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
      render: function (host) {
        var cs = S(), s = cs ? cs.read() : {}, xp = (s && s.xp) || 0;
        var rank = cs && cs.rankFor ? cs.rankFor(xp) : { name: 'Stone', color: '#AEB4BD' };
        var lvl  = cs && cs.levelFor ? cs.levelFor(xp) : 1;
        host.innerHTML =
          '<div class="w-quote">' +
          '<div class="w-quote-top">' +
          '<svg class="w-quote-mark" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>' +
          '<a href="24-ranks.html" class="w-quote-rank" style="color:' + (rank.color || '#AEB4BD') + '">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="9" height="9"><path d="M12 2L2 8l10 14L22 8z"/></svg>' +
          'Lv ' + lvl + ' \xb7 ' + (rank.name || 'Stone') +
          '</a>' +
          '</div>' +
          '<p class="w-quote-text">' + dailyQuote() + '</p>' +
          '</div>';
      }
    },

    lifescore: {
      id: 'lifescore', title: 'Life Score',
      icon: '<path d="M12 20.5s-7.2-4.6-7.2-9.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 7.2 3.7c0 5.2-7.2 9.8-7.2 9.8Z"/>',
      render: function (host) {
        var cs = S();
        if (!cs) { host.innerHTML = '<div class="w-empty">Loading…</div>'; return; }
        var defs = cs.STAT_DEFS || [];

        function xpForLevel(lvl) { return lvl * 300; }

        function buildHTML() {
          var s    = cs.read();
          var xp   = s.xp || 0;
          var lvl  = cs.levelFor ? cs.levelFor(xp) : (Math.floor(xp / 300) + 1);
          var rank = cs.rankFor  ? cs.rankFor(xp)  : { name: 'Stone', color: '#AEB4BD' };
          var xpPrev = xpForLevel(lvl - 1);
          var xpNext = xpForLevel(lvl);
          var pct  = xpNext > xpPrev ? Math.min(100, Math.round((xp - xpPrev) / (xpNext - xpPrev) * 100)) : 100;

          var DAY_LABELS = ['S','M','T','W','T','F','S'];
          var todayIdx = new Date().getDay();
          var daysHtml = '<div class="w-ls-days">';
          DAY_LABELS.forEach(function(dn, i) {
            daysHtml += '<span class="w-ls-day' + (i === todayIdx ? ' today' : '') + '">' + dn + '</span>';
          });
          daysHtml += '</div>';

          var html = daysHtml +
            '<div class="w-ls-hero">' +
            '<div class="w-ls-score-num" id="wLsNum">0</div>' +
            '<div class="w-ls-score-label">Life Score</div>' +
            '<a href="24-ranks.html" class="w-ls-rank-badge" style="color:' + (rank.color || '#AEB4BD') + '">' +
              '<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M12 2L2 8l10 14L22 8z"/></svg>' +
              rank.name +
            '</a>' +
            '<div class="w-ls-xp">' +
              '<div class="w-ls-xp-head">' +
                '<span class="w-ls-xp-rank" style="color:' + (rank.color || '#aaa') + '">Lv ' + lvl + '</span>' +
                '<span class="w-ls-xp-num">' + xp + ' XP</span>' +
              '</div>' +
              '<div class="w-ls-xp-bar"><div class="w-ls-xp-fill" id="wLsXpFill" style="width:0%"></div></div>' +
            '</div>' +
            '</div><div class="w-ls-grid">';

          defs.forEach(function (d) {
            var href = d.page || ('stat.html?s=' + d.key);
            html +=
              '<a href="' + href + '" class="w-ls-card" style="--sc:' + d.color + '" aria-label="' + d.name + '">' +
              '<div class="w-ls-card-head">' +
                '<div class="w-ls-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (d.icon || STAT_IC[d.key] || '') + '</svg></div>' +
                '<span class="w-ls-name">' + d.name + '</span>' +
              '</div>' +
              '<span class="w-ls-val" data-sk="' + d.key + '">0</span>' +
              '<div class="w-ls-bar" style="margin-top:8px"><div class="w-ls-fill" data-skf="' + d.key + '" style="width:0%"></div></div>' +
              '<div class="w-ls-lvl" data-skl="' + d.key + '">Lv 1</div>' +
              '</a>';
          });
          return html + '</div>';
        }

        host.innerHTML = buildHTML();

        function animateIn() {
          var s    = cs.read();
          var xp   = s.xp || 0;
          var lvl  = cs.levelFor ? cs.levelFor(xp) : (Math.floor(xp / 300) + 1);
          var xpPrev = lvl > 1 ? (lvl - 1) * 300 : 0;
          var xpNext = lvl * 300;
          var pct  = xpNext > xpPrev ? Math.min(100, Math.round((xp - xpPrev) / (xpNext - xpPrev) * 100)) : 100;
          var fill = host.querySelector('#wLsXpFill');
          if (fill) requestAnimationFrame(function () { fill.style.width = pct + '%'; });

          animCount(host.querySelector('#wLsNum'), cs.lifeScore());
          defs.forEach(function (d) {
            var v   = cs.statValue(d.key);
            var lvl = statLevel(v);
            animCount(host.querySelector('[data-sk="' + d.key + '"]'), v);
            var fe  = host.querySelector('[data-skf="' + d.key + '"]');
            var le  = host.querySelector('[data-skl="' + d.key + '"]');
            if (fe) requestAnimationFrame(function () { fe.style.width = v + '%'; });
            if (le) le.textContent = 'Lv ' + lvl;
          });
        }
        setTimeout(animateIn, 80);

        function onUpdate() { animateIn(); }
        window.addEventListener('coreStateChange', onUpdate);
        host._cleanup = function () { window.removeEventListener('coreStateChange', onUpdate); };
      }
    },

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

        function renderTasks() {
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
            host.appendChild(e); return;
          }

          tasks.forEach(function (task) {
            var isDone = task.done;
            var timeDisplay = task.deadline ? countdownStr(task.deadline) : (task.time || '10 min');
            var page = getTaskPage(task);

            // Row is a link — tapping the row navigates; checking stops propagation
            var row = document.createElement('a');
            row.href = isDone ? '#' : page;
            row.className = 'w-task-row' + (isDone ? ' done' : '');
            row.style.textDecoration = 'none';
            row.setAttribute('aria-label', task.title);

            row.innerHTML =
              '<button class="w-task-check' + (isDone ? ' checked' : '') + '" aria-label="' + (isDone ? 'Done' : 'Complete') + '">' +
                (isDone
                  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l4 4 10-11"/></svg>'
                  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/></svg>') +
              '</button>' +
              '<div class="w-task-body">' +
                '<span class="w-task-title">' + task.title + '</span>' +
                '<div class="w-task-meta">' +
                  '<span class="w-task-chip">' + timeDisplay + '</span>' +
                '</div>' +
              '</div>' +
              '<span class="w-task-xp-badge">+' + task.xp + ' XP</span>';

            if (!isDone) {
              var btn = row.querySelector('.w-task-check');
              btn.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                if (cs) cs.completeQuest(task.id);
                try { window.coreSfx && window.coreSfx('xp'); } catch (err) {}
                renderTasks();
              });
            } else {
              row.addEventListener('click', function (e) { e.preventDefault(); });
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
        host.innerHTML =
          '<div class="w-streak">' +
          '<a href="26-streak.html" class="w-streak-inner" style="text-decoration:none;color:inherit">' +
            '<div class="w-streak-fire"><svg viewBox="0 0 24 24" fill="currentColor" style="width:26px;height:26px;color:#FF8A3D"><path d="M12 2c1 3-1 4-1 6 0 1 1 2 1 2s2-1 2-3c2 2 3 4 3 7a5 5 0 0 1-10 0c0-3 2-5 3-7 1 2 2 2 2 2s0-3 0-7Z"/></svg></div>' +
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

    quickactions: {
      id: 'quickactions', title: 'Quick Actions',
      icon: '<path d="M4 6h16M4 12h16M4 18h7"/>',
      render: function (host) {
        var actions = [
          { label: 'Quests',  href: '21-quests.html',  icon: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>' },
          { label: 'Shop',    href: '27-shop.html',    icon: '<path d="M6 2L3 6v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>' },
          { label: 'Streak',  href: '26-streak.html',  icon: '<path d="M12 2c1 3-1 4-1 6 0 1 1 2 1 2s2-1 2-3c2 2 3 4 3 7a5 5 0 0 1-10 0c0-3 2-5 3-7 1 2 2 2 2 2s0-3 0-7Z"/>' },
          { label: 'Profile', href: '23-profile.html', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
        ];
        var html = '<div class="w-qa-grid">';
        actions.forEach(function (a) {
          html += '<a href="' + a.href + '" class="w-qa-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">' + a.icon + '</svg><span>' + a.label + '</span></a>';
        });
        host.innerHTML = html + '</div>';
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
        var TIMES  = { sunrise: 'Sunrise', day: 'Daytime', afternoon: 'Afternoon', sunset: 'Sunset', night: 'Night' };
        var amb = window.dashAmbient;
        var w = amb ? amb.getWeather() : 'clear';
        var ti = amb ? amb.getTime() : 'day';
        host.innerHTML =
          '<div class="w-weather">' +
          '<span class="w-weather-icon" id="wWIcon">' + (ICONS[w] || ICONS.clear) + '</span>' +
          '<span class="w-weather-label" id="wWLabel">' + (LABELS[w] || 'Clear') + '</span>' +
          '<span class="w-weather-time" id="wWTime">' + (TIMES[ti] || ti) + '</span>' +
          '</div>';
        function onAmb(e) {
          var ic = host.querySelector('#wWIcon'), lb = host.querySelector('#wWLabel'), tm = host.querySelector('#wWTime');
          if (ic) ic.innerHTML = ICONS[e.detail.weather] || ICONS.clear;
          if (lb) lb.textContent = LABELS[e.detail.weather] || 'Clear';
          if (tm) tm.textContent = TIMES[e.detail.time] || e.detail.time;
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
        var ledger = (s.xpLedger || []).filter(function (e) { return e.delta > 0; }).slice(0, 6);
        if (!ledger.length) {
          host.innerHTML = '<div class="w-empty">Complete quests to see activity here.</div>';
          return;
        }
        var html = '<div class="w-activity-list">';
        ledger.forEach(function (e) {
          var ago = Math.round((Date.now() - e.ts) / 60000);
          var agoStr = ago < 2 ? 'just now' : ago < 60 ? ago + 'm ago' : Math.round(ago / 60) + 'h ago';
          html += '<div class="w-activity-item">' +
            '<span class="w-activity-dot"></span>' +
            '<span class="w-activity-label">' + (e.reason || 'XP').replace('quest:', 'Quest: ') + '</span>' +
            '<span class="w-activity-xp">+' + (e.delta || 0) + ' XP</span>' +
            '<span class="w-activity-time">' + agoStr + '</span></div>';
        });
        host.innerHTML = html + '</div>';
      }
    },

  };

  // ── Layout ───────────────────────────────────────────────────────────────────
  var LAYOUT_KEY = 'coreDashboard.v1';
  var DEFAULT_LAYOUT = ['quote', 'lifescore', 'tasks'];

  function readLayout() {
    try {
      var s = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
      if (Array.isArray(s) && s.length) return s;
    } catch (e) {}
    return DEFAULT_LAYOUT.slice();
  }
  function saveLayout(ids) { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(ids)); } catch (e) {} }
  function getWidget(id) { return REGISTRY[id] || null; }
  function getAll() { return Object.keys(REGISTRY).map(function (k) { return REGISTRY[k]; }); }

  window.dashWidgets = { REGISTRY: REGISTRY, getWidget: getWidget, getAll: getAll, readLayout: readLayout, saveLayout: saveLayout, DEFAULT_LAYOUT: DEFAULT_LAYOUT, dailyQuote: dailyQuote };
})();
