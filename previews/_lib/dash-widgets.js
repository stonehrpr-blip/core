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
        host.innerHTML =
          '<div class="w-quote">' +
          '<svg class="w-quote-mark" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>' +
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

        // Build HTML with values starting at 0 (animates in)
        var html = '<div class="w-ls-hero">' +
          '<div class="w-ls-score-num" id="wLsNum">0</div>' +
          '<div class="w-ls-score-label">Life Score</div>' +
          '</div><div class="w-ls-grid">';

        defs.forEach(function (d) {
          var href = d.page || ('stat.html?s=' + d.key);
          html +=
            '<a href="' + href + '" class="w-ls-card" style="--sc:' + d.color + '" aria-label="' + d.name + ' score">' +
            '<div class="w-ls-card-head">' +
              '<div class="w-ls-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (d.icon || STAT_IC[d.key] || '') + '</svg></div>' +
              '<span class="w-ls-name">' + d.name + '</span>' +
              '<span class="w-ls-val" data-sk="' + d.key + '">0</span>' +
            '</div>' +
            '<div class="w-ls-bar"><div class="w-ls-fill" data-skf="' + d.key + '" style="width:0%"></div></div>' +
            '<div class="w-ls-lvl" data-skl="' + d.key + '">Lv 1</div>' +
            '</a>';
        });
        html += '</div>';
        host.innerHTML = html;

        // Animate all values in after first paint
        setTimeout(function () {
          var ls = cs.lifeScore();
          animCount(host.querySelector('#wLsNum'), ls);
          defs.forEach(function (d) {
            var v = cs.statValue(d.key);
            var lvl = statLevel(v);
            animCount(host.querySelector('[data-sk="' + d.key + '"]'), v);
            var fe = host.querySelector('[data-skf="' + d.key + '"]');
            var le = host.querySelector('[data-skl="' + d.key + '"]');
            if (fe) requestAnimationFrame(function () { fe.style.width = v + '%'; });
            if (le) le.textContent = 'Lv ' + lvl;
          });
        }, 80);

        function onUpdate() {
          var ls = cs.lifeScore();
          animCount(host.querySelector('#wLsNum'), ls);
          defs.forEach(function (d) {
            var v = cs.statValue(d.key);
            animCount(host.querySelector('[data-sk="' + d.key + '"]'), v);
            var fe = host.querySelector('[data-skf="' + d.key + '"]');
            if (fe) fe.style.width = v + '%';
          });
        }
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
            '<a href="21-quests.html" class="w-tasks-viewall">All →</a>';
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
                  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l4 4 10-11"/></svg>'
                  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>') +
              '</button>' +
              '<div class="w-task-body">' +
                '<span class="w-task-title">' + task.title + '</span>' +
                '<span class="w-task-meta">' +
                  '<span class="w-task-chip">' + timeDisplay + '</span>' +
                  '<span class="w-task-xp">+' + task.xp + ' XP</span>' +
                  '<span class="w-task-dest">' + page.replace('stat.html?s=', '').replace('.html', '') + ' →</span>' +
                '</span>' +
              '</div>';

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
        var ICONS  = { clear: '☀️', cloudy: '☁️', rain: '🌧️', snow: '❄️', fog: '🌫️' };
        var LABELS = { clear: 'Clear skies', cloudy: 'Overcast', rain: 'Raining', snow: 'Snowing', fog: 'Foggy' };
        var TIMES  = { sunrise: 'Sunrise', day: 'Daytime', afternoon: 'Afternoon', sunset: 'Sunset', night: 'Night' };
        var amb = window.dashAmbient;
        var w = amb ? amb.getWeather() : 'clear';
        var ti = amb ? amb.getTime() : 'day';
        host.innerHTML =
          '<div class="w-weather">' +
          '<span class="w-weather-icon" id="wWIcon">' + (ICONS[w] || '☀️') + '</span>' +
          '<span class="w-weather-label" id="wWLabel">' + (LABELS[w] || 'Clear') + '</span>' +
          '<span class="w-weather-time" id="wWTime">' + (TIMES[ti] || ti) + '</span>' +
          '</div>';
        function onAmb(e) {
          var ic = host.querySelector('#wWIcon'), lb = host.querySelector('#wWLabel'), tm = host.querySelector('#wWTime');
          if (ic) ic.textContent = ICONS[e.detail.weather] || '☀️';
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
          host.innerHTML = '<div class="w-empty">Add friends to see their progress.<br><a href="23-profile.html" style="color:var(--blue);font-weight:700;text-decoration:none">Find friends →</a></div>';
          return;
        }
        var html = '<div class="w-friends-list">';
        friends.slice(0, 4).forEach(function (f) {
          html += '<div class="w-friend-item">' +
            '<div class="w-friend-avatar">' + ((f.name || '?').charAt(0).toUpperCase()) + '</div>' +
            '<div class="w-friend-info"><span class="w-friend-name">' + (f.name || 'Unknown') + '</span><span class="w-friend-rank">' + (f.rank || 'Stone') + '</span></div>' +
            '<span class="w-friend-power">' + (f.power || 0) + '</span></div>';
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
