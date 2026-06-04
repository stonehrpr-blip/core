/* quest-engine.js
 * ──────────────────────────────────────────────────────────────────────
 * The CORE Coach brain + memory + quest generation for 21-quests.html.
 *
 * Everything is local-first (localStorage) so the page is fully functional
 * with NO API key. If an OpenAI key is set (coreAI.hasKey()), open-ended
 * coach chat is upgraded to real GPT-4o; the deterministic memory parsing
 * (book → page → daily target → auto-generated quest) always runs locally.
 *
 * Public surface: window.coreQuest
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.coreQuest) return;

  var MEM_KEY  = 'coreCoachMemory.v1';
  var Q_KEY    = 'coreQuests.v1';
  var HIST_KEY = 'coreQuestHistory.v1';
  var CHAT_KEY = 'coreCoachChat.v1';

  // ── tiny storage helpers ──
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid() { return 'q' + Math.floor(Math.random() * 1e9).toString(36); }
  function cap(s) { return (s || '').replace(/^\w/, function (c) { return c.toUpperCase(); }); }
  function playerName() { try { var t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}'); return t.name || t.firstName || ''; } catch (e) { return ''; } }

  // ── rarity ladder (6) ──
  var RARITY = {
    common:    { l: 'Common',    c: 'var(--r-common)',    xp: 40,  coin: 8   },
    uncommon:  { l: 'Uncommon',  c: 'var(--r-uncommon)',  xp: 60,  coin: 14  },
    rare:      { l: 'Rare',      c: 'var(--r-rare)',      xp: 90,  coin: 22  },
    epic:      { l: 'Epic',      c: 'var(--r-epic)',      xp: 150, coin: 40  },
    legendary: { l: 'Legendary', c: 'var(--r-legendary)', xp: 260, coin: 75  },
    mythic:    { l: 'Mythic',    c: 'var(--r-mythic)',    xp: 400, coin: 120 }
  };
  var RANK = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  // ── domain icons (SVG inner path) ──
  var ICON = {
    reading:    '<path d="M3 5a2 2 0 0 1 2-2h6v17H5a2 2 0 0 0-2 2V5zM21 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2V5z"/>',
    gym:        '<path d="M6.5 6.5l11 11M4 9l-1 1 2 2-2 2 1 1M20 15l1-1-2-2 2-2-1-1M8 4l-1 1 2 2M16 20l1-1-2-2"/>',
    money:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
    business:   '<path d="M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
    school:     '<path d="M3 9l9-5 9 5-9 5-9-5zM7 11v5c0 1 2.5 3 5 3s5-2 5-3v-5"/>',
    mind:       '<path d="M12 3a5 5 0 0 0-5 5c0 1.5-1 2-1 4a3 3 0 0 0 3 3v3h6v-3a3 3 0 0 0 3-3c0-2-1-2.5-1-4a5 5 0 0 0-5-5z"/>',
    discipline: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>',
    health:     '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z"/>',
    sleep:      '<path d="M20 14a8 8 0 1 1-9-9 6.5 6.5 0 0 0 9 9z"/>',
    generic:    '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
  };

  // ── memory ──
  function blankMemory() {
    return {
      onboarded: false,
      main: null,                 // { title, why, progress, total, unit, milestones:[], reward:{xp,coins,chest} }
      focus: [],                  // life areas
      dailyMin: 30,
      avoiding: '',
      tone: 'balanced',
      domains: {},                // reading:{book,page,target,daily,why}, gym:{...}, business:{...}, school:{...}
      facts: []                   // freeform [{k,v,ts}]
    };
  }
  function getMemory() { var m = jget(MEM_KEY, null); if (!m) { m = blankMemory(); } if (!m.domains) m.domains = {}; if (!m.facts) m.facts = []; if (!m.focus) m.focus = []; return m; }
  function setMemory(m) { jset(MEM_KEY, m); }
  function remember(path, value) { var m = getMemory(); var parts = path.split('.'); var o = m; for (var i = 0; i < parts.length - 1; i++) { if (!o[parts[i]]) o[parts[i]] = {}; o = o[parts[i]]; } o[parts[parts.length - 1]] = value; setMemory(m); return m; }
  function rememberFact(k, v) { var m = getMemory(); var ex = m.facts.find(function (f) { return f.k === k; }); if (ex) ex.v = v; else m.facts.push({ k: k, v: v, ts: Date.now() }); setMemory(m); }

  // ── quests ──
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function getQuests() { var q = jget(Q_KEY, null); if (!q || !q.list) q = { dateKey: todayKey(), list: [] }; return q; }
  function setQuests(q) { jset(Q_KEY, q); }
  function allQuests() { return getQuests().list; }
  function questsByCat(cat) { return allQuests().filter(function (q) { return q.cat === cat; }); }
  function findQuest(id) { return allQuests().find(function (q) { return q.id === id; }); }

  function rewardFor(rarity, mult) {
    mult = mult || 1;
    var r = RARITY[rarity] || RARITY.common;
    return { xp: Math.round(r.xp * mult), coins: Math.round(r.coin * mult) };
  }
  // proof level scales with rarity + domain
  function proofFor(rarity, domain) {
    if (domain === 'reading' || domain === 'gym' || domain === 'business' || domain === 'school') {
      if (rarity === 'legendary' || rarity === 'mythic') return 'legendary';
      if (rarity === 'epic' || rarity === 'rare') return 'high';
      return 'medium';
    }
    if (rarity === 'legendary' || rarity === 'mythic') return 'legendary';
    if (rarity === 'epic') return 'high';
    if (rarity === 'rare' || rarity === 'uncommon') return 'medium';
    return 'low';
  }

  function makeQuest(o) {
    var rarity = o.rarity || 'common';
    var rew = o.xp != null ? { xp: o.xp, coins: o.coins } : rewardFor(rarity, o.mult);
    return {
      id: o.id || uid(),
      cat: o.cat || 'daily',
      domain: o.domain || 'generic',
      title: o.title,
      desc: o.desc || '',
      reason: o.reason || '',
      rarity: rarity,
      xp: rew.xp,
      coins: rew.coins,
      items: o.items || [],
      chest: o.chest || null,
      timeEst: o.timeEst || '10 min',
      proof: o.proof || proofFor(rarity, o.domain),
      mode: o.mode || null,           // for medium proof: 'timer' | 'text'
      timerSec: o.timerSec || 0,
      progress: o.progress || null,   // {cur,total}
      coachNote: o.coachNote || '',
      chainId: o.chainId || null,
      chainName: o.chainName || '',
      status: o.status || 'active'    // active | claimable | claimed | failed
    };
  }
  function addQuest(o) { var q = getQuests(); var nq = makeQuest(o); q.list.push(nq); setQuests(q); return nq; }
  function upsertQuest(matchId, o) { var q = getQuests(); var i = q.list.findIndex(function (x) { return x.id === matchId; }); if (i >= 0) { q.list[i] = Object.assign(q.list[i], o); setQuests(q); return q.list[i]; } return addQuest(o); }
  function removeQuest(id) { var q = getQuests(); var rm = q.list.find(function (x) { return x.id === id; }); q.list = q.list.filter(function (x) { return x.id !== id; }); setQuests(q); return rm; }

  // ── history ──
  function getHistory() { return jget(HIST_KEY, []); }
  function logHistory(entry) { var h = getHistory(); h.unshift(Object.assign({ ts: Date.now() }, entry)); if (h.length > 80) h = h.slice(0, 80); jset(HIST_KEY, h); }
  function historyStats() {
    var h = getHistory();
    var done = h.filter(function (e) { return e.result === 'done'; });
    return {
      done: done.length,
      failed: h.filter(function (e) { return e.result === 'failed'; }).length,
      skipped: h.filter(function (e) { return e.result === 'skipped'; }).length,
      xp: done.reduce(function (a, e) { return a + (e.xp || 0); }, 0),
      coins: done.reduce(function (a, e) { return a + (e.coins || 0); }, 0)
    };
  }

  // ── chat transcript ──
  function getChat() { return jget(CHAT_KEY, []); }
  function pushChat(role, text) { var c = getChat(); c.push({ role: role, text: text, ts: Date.now() }); if (c.length > 60) c = c.slice(-60); jset(CHAT_KEY, c); }

  // ════════════════════════════════════════════════════════════════════
  // QUEST GENERATION FROM MEMORY
  // ════════════════════════════════════════════════════════════════════
  function readingQuest(cat) {
    var m = getMemory(), r = m.domains.reading;
    if (!r || !r.book) return null;
    var from = (r.page || 0) + 1, to = (r.page || 0) + (r.daily || 10);
    var reason = 'Keeps you on pace to finish ' + r.book + (r.target ? ' (target p.' + r.target + ')' : '') + '.';
    return makeQuest({
      id: 'q_reading_today', cat: cat || 'daily', domain: 'reading', rarity: 'uncommon',
      title: 'Read ' + r.book + ' — pages ' + from + '–' + to,
      desc: 'Read ' + (r.daily || 10) + ' pages of ' + r.book + ' today.' + (r.why ? ' ' + r.why : ''),
      reason: reason, timeEst: Math.max(10, Math.round((r.daily || 10) * 1.4)) + ' min',
      coachNote: 'You were on page ' + (r.page || 0) + '. Snap the page you finish on and I\'ll log your new spot.',
      progress: r.target ? { cur: r.page || 0, total: r.target } : null
    });
  }
  // advance reading after completion
  function advanceReading() { var m = getMemory(), r = m.domains.reading; if (r && r.book) { r.page = (r.page || 0) + (r.daily || 10); setMemory(m); } }

  function ensureDefaults() {
    var m = getMemory();
    var q = getQuests();
    if (q.list.length) return; // already generated

    var list = [];
    var name = playerName() || 'you';

    // Reading daily (if known)
    var rq = readingQuest('daily'); if (rq) list.push(rq);

    // Focus-driven dailies
    var focus = m.focus || [];
    if (focus.indexOf('Fitness') >= 0) {
      list.push(makeQuest({ cat: 'daily', domain: 'gym', rarity: 'rare', title: 'Train — ' + (m.domains.gym && m.domains.gym.split ? m.domains.gym.split : 'today\'s session'),
        desc: 'Complete your workout. Log the main lift.', reason: 'Consistency is the whole game — showing up today protects your streak.', timeEst: '45 min',
        coachNote: 'Photo of the gym or your tracked set works as proof.' }));
    }
    if (focus.indexOf('Mind') >= 0 || focus.indexOf('Health') >= 0) {
      list.push(makeQuest({ cat: 'daily', domain: 'mind', rarity: 'common', title: '10-minute reset', desc: 'Breathe, stretch or meditate for 10 minutes.', reason: 'A calm mind makes the hard quests easier.', timeEst: '10 min', mode: 'timer', timerSec: 600 }));
    }
    // a discipline daily everyone gets
    list.push(makeQuest({ cat: 'daily', domain: 'discipline', rarity: 'common', title: 'Plan tomorrow tonight', desc: 'Write your top 3 for tomorrow before bed.', reason: 'People who plan the night before do 2× more of what matters.', timeEst: '5 min', proof: 'medium', mode: 'text', coachNote: 'Tell me the 3 things and I\'ll turn them into quests.' }));

    // Weekly (medium goals from focus)
    if (focus.indexOf('Money') >= 0 || focus.indexOf('Business') >= 0) {
      list.push(makeQuest({ cat: 'weekly', domain: 'money', rarity: 'epic', title: 'Move money forward', desc: 'Take one concrete action toward income this week.', reason: 'Direction beats motion — one real step compounds.', timeEst: '1–2 hrs', proof: 'high' }));
    }
    if (m.domains.reading && m.domains.reading.book) {
      list.push(makeQuest({ cat: 'weekly', domain: 'reading', rarity: 'rare', title: 'Finish a chapter of ' + m.domains.reading.book, desc: 'Complete a full chapter this week.', reason: 'Chapters are milestones — they keep the book from stalling.', timeEst: '3 sessions', proof: 'medium', mode: 'text' }));
    }

    // Side quest (optional bonus)
    list.push(makeQuest({ cat: 'side', domain: 'health', rarity: 'uncommon', title: 'Hit 8,000 steps', desc: 'Optional — move your body today.', reason: 'Bonus XP for keeping the engine warm.', timeEst: 'all day', proof: 'low' }));

    // Boss quest (from what they're avoiding)
    if (m.avoiding) {
      list.push(makeQuest({ cat: 'boss', domain: 'business', rarity: 'legendary', title: m.avoiding, desc: 'The thing you\'ve been putting off. Today you face it.', reason: 'This is the quest that actually changes your trajectory. Everything else is warm-up.', timeEst: '1 hr', proof: 'legendary',
        items: [{ name: 'Streak Shield', rarity: 'rare' }], chest: { rarity: 'epic' },
        coachNote: 'Scary is the point. Do it badly if you have to — just start.' }));
    }

    // Fitness chain (if fitness)
    if (focus.indexOf('Fitness') >= 0 || focus.indexOf('Health') >= 0) {
      var cid = 'chain_body';
      list.push(makeQuest({ cat: 'side', domain: 'gym', rarity: 'rare', chainId: cid, chainName: 'Body Reset', title: 'Workout', desc: 'Train today.', reason: 'Step 1 of the Body Reset chain.', timeEst: '45 min', proof: 'high' }));
      list.push(makeQuest({ cat: 'side', domain: 'health', rarity: 'uncommon', chainId: cid, chainName: 'Body Reset', title: 'Eat a real meal', desc: 'Protein + veg, no junk.', reason: 'Step 2 of the Body Reset chain.', timeEst: '30 min', proof: 'medium', mode: 'text' }));
      list.push(makeQuest({ cat: 'side', domain: 'sleep', rarity: 'uncommon', chainId: cid, chainName: 'Body Reset', title: 'Sleep before midnight', desc: 'Lights out early.', reason: 'Step 3 — finish the chain for a bonus chest.', timeEst: 'tonight', proof: 'low' }));
    }

    q.list = list; q.dateKey = todayKey(); setQuests(q);
  }

  // ════════════════════════════════════════════════════════════════════
  // ONBOARDING → memory + first quests
  // ════════════════════════════════════════════════════════════════════
  function onboardComplete(ans) {
    var m = getMemory();
    m.onboarded = true;
    m.focus = ans.focus || [];
    m.dailyMin = ans.dailyMin || 30;
    m.avoiding = ans.avoiding || '';
    // Main quest from their stated goal
    var goal = ans.goal || 'Become the person I want to be';
    m.main = {
      title: goal,
      why: ans.goalWhy || 'The single outcome everything else is building toward.',
      progress: 0, total: 100, unit: '%',
      milestones: [
        { n: 'Start', done: true },
        { n: '25%', done: false },
        { n: '50%', done: false },
        { n: 'Done', done: false }
      ],
      reward: { xp: 2500, coins: 500, chest: 'legendary' }
    };
    // Habit → domain memory
    if (ans.habit) {
      var h = ans.habit.toLowerCase();
      if (/read/.test(h)) m.domains.reading = m.domains.reading || { book: '', page: 0, target: 0, daily: 10, why: '' };
      if (/gym|lift|train|workout/.test(h)) m.domains.gym = m.domains.gym || { split: '' };
      rememberFact('current_habit', ans.habit);
    }
    setMemory(m);
    // wipe any stale quests then build fresh
    setQuests({ dateKey: todayKey(), list: [] });
    ensureDefaults();
    pushChat('ai', 'Your mission system is live. I\'ll keep it sharp — tell me what you\'re reading, training, or building and I\'ll turn it into quests.');
    return m;
  }

  // ════════════════════════════════════════════════════════════════════
  // THE COACH BRAIN  — coachReply(text) → { text, did:[] }
  // Deterministic intent parsing (works with no API key).
  // ════════════════════════════════════════════════════════════════════
  function num(s) { var m = String(s).match(/(\d[\d,]*)/); return m ? parseInt(m[1].replace(/,/g, ''), 10) : null; }

  function parseReading(t) {
    var did = [], m = getMemory();
    m.domains.reading = m.domains.reading || { book: '', page: 0, target: 0, daily: 10, why: '' };
    var r = m.domains.reading, changed = false;
    // book: "reading X" / "book is X" / "i'm reading X"
    var bm = t.match(/(?:reading|book is|book:|reading the book)\s+["']?([a-z0-9][a-z0-9 '&:.-]{1,48}?)["']?(?:\s*(?:by|,|\.|right now|currently|$))/i);
    if (bm) { r.book = bm[1].trim().replace(/\s+(by|right now|currently)$/i, '').replace(/[.,]$/, ''); changed = true; did.push('book "' + r.book + '"'); }
    // page: "on page 63" / "page 63" / "i'm at page 63"
    if (/page/i.test(t)) { var p = num(t.replace(/\b(?:10|20|30|40|50)\s*pages?\b/i, '')); var pm = t.match(/page\s*(\d+)/i); if (pm) { r.page = parseInt(pm[1], 10); changed = true; did.push('page ' + r.page); } }
    // target/finish page: "finish by page 300" / "target 300"
    var tm = t.match(/(?:target|finish (?:by|at)?|by page|goal)\s*(?:page\s*)?(\d{2,4})/i);
    if (tm) { r.target = parseInt(tm[1], 10); changed = true; did.push('target p.' + r.target); }
    // daily: "10 pages a day" / "read 10 pages daily"
    var dm = t.match(/(\d{1,3})\s*pages?\s*(?:a day|daily|per day|each day|every day)/i);
    if (dm) { r.daily = parseInt(dm[1], 10); changed = true; did.push(r.daily + ' pages/day'); }
    if (changed) { setMemory(m); upsertQuest('q_reading_today', readingQuest('daily')); }
    return { changed: changed, did: did, ready: !!(r.book && r.daily) };
  }

  function intentReply(raw) {
    var t = (raw || '').trim();
    var low = t.toLowerCase();
    var did = [];
    var name = playerName();

    // 1) READING memory flow (the headline example)
    if (/read|book|page/i.test(low)) {
      var pr = parseReading(t);
      if (pr.changed) {
        var m = getMemory(), r = m.domains.reading;
        var reply;
        if (r.book && r.daily) {
          var from = (r.page || 0) + 1, to = (r.page || 0) + r.daily;
          reply = 'Got it — remembered ' + pr.did.join(', ') + '. ';
          reply += 'I\'ve set today\'s quest: <b>Read ' + r.book + ' pages ' + from + '–' + to + '</b> for <b>+' + RARITY.uncommon.xp + ' XP</b>.';
          if (r.target) { var left = Math.max(0, r.target - (r.page || 0)); var days = Math.ceil(left / r.daily); reply += ' At ' + r.daily + '/day you\'ll finish in ~' + days + ' days.'; }
          reply += ' Every day I\'ll roll it forward automatically.';
        } else if (r.book) {
          reply = 'Noted — you\'re reading <b>' + r.book + '</b>. What page are you on, and how many pages a day do you want to read?';
        } else {
          reply = 'Remembered ' + pr.did.join(', ') + '. What book is it?';
        }
        return { text: reply, did: pr.did };
      }
    }

    // 2) CREATE quests by domain
    function spawn(domain, rarity, title, desc, reason, proof) {
      var nq = addQuest({ cat: 'daily', domain: domain, rarity: rarity, title: title, desc: desc, reason: reason, proof: proof });
      return nq;
    }
    if (/(create|add|make|give me|new).*(money|cash|income|sell|business)/i.test(low)) {
      spawn('money', 'epic', 'Make one move toward money', 'Do a single concrete action that could earn — message a lead, list a thing, ship an offer.', 'Income comes from action, not planning. One real move today.', 'high');
      return { text: 'Done. Added a <b>money quest</b> — Epic, photo/screenshot proof, <b>+150 XP +40 coins</b>. Want it harder?', did: ['+money quest'] };
    }
    if (/(create|add|make|give me|new).*(fitness|gym|workout|train|lift|run)/i.test(low)) {
      spawn('gym', 'rare', 'Train today', 'Get the session in. Log the main lift or a photo of the gym.', 'Showing up beats the perfect program. Protect the chain.', 'high');
      return { text: 'Locked in a <b>fitness quest</b> — Rare, +90 XP. Tell me your split and I\'ll tailor the next ones.', did: ['+fitness quest'] };
    }
    if (/(create|add|make|give me|new).*(read|book)/i.test(low)) {
      var rq = readingQuest('daily');
      if (rq) { upsertQuest('q_reading_today', rq); return { text: 'Your reading quest is set. ' + (getMemory().domains.reading.book ? 'Pages ' + ((getMemory().domains.reading.page||0)+1) + '–' + ((getMemory().domains.reading.page||0)+(getMemory().domains.reading.daily||10)) + ' of ' + getMemory().domains.reading.book + '.' : ''), did: ['reading quest'] }; }
      spawn('reading', 'uncommon', 'Read 10 pages', 'Read something that moves you forward.', 'Tell me the book and your page so I can track the finish line.', 'medium');
      return { text: 'Added a reading quest. What book are you reading? Tell me and I\'ll track your progress to the last page.', did: ['+reading quest'] };
    }
    if (/(discipline|consistent|consistency|focus|habit)/i.test(low) && /(build|help|more|better)/i.test(low)) {
      spawn('discipline', 'rare', 'Win the morning', 'No phone for the first 30 minutes. Do one hard thing first.', 'Discipline is built at the start of the day. Win the morning, win the day.', 'medium');
      return { text: 'Discipline is a muscle — we train it daily. Added <b>Win the morning</b>. Hit it 5 days straight and I\'ll unlock a streak chest.', did: ['+discipline quest'] };
    }

    // 3) ADD custom quest: "add a quest to call mum"
    var addm = t.match(/^(?:add|create|new)\s+(?:a\s+)?quest\s*(?:to|:|called)?\s*(.+)/i);
    if (addm) {
      var title = cap(addm[1].trim().replace(/[.?!]$/, ''));
      addQuest({ cat: 'daily', domain: 'generic', rarity: 'common', title: title, desc: 'Custom quest you asked me to add.', reason: 'You told me this matters today.', proof: 'medium', mode: 'text' });
      return { text: 'Added: <b>' + title + '</b>. Common, +40 XP. Say "make it harder" to raise the stakes and reward.', did: ['+' + title] };
    }

    // 4) REMOVE quest
    var rmm = t.match(/^(?:remove|delete|drop|cancel)\s+(?:the\s+)?(?:quest\s+)?(.+)/i);
    if (rmm) {
      var needle = rmm[1].toLowerCase().replace(/quest|the/g, '').trim();
      var hit = allQuests().find(function (q) { return q.status !== 'claimed' && q.title.toLowerCase().indexOf(needle) >= 0; });
      if (hit) { removeQuest(hit.id); return { text: 'Removed <b>' + hit.title + '</b>. Cleared it off your board.', did: ['-' + hit.title] }; }
      return { text: 'I couldn\'t find a quest matching that. Which one — give me a word from its title.', did: [] };
    }

    // 5) HARDER / EASIER (adjust the most recent active quest)
    if (/(harder|tougher|more (xp|reward)|raise|push me)/i.test(low)) {
      var active = allQuests().filter(function (q) { return q.status === 'active' && q.cat !== 'main'; });
      var q = active[active.length - 1];
      if (q) { var i = Math.min(RANK.length - 1, RANK.indexOf(q.rarity) + 1); q.rarity = RANK[i]; var rew = rewardFor(q.rarity); q.xp = rew.xp; q.coins = rew.coins; q.proof = proofFor(q.rarity, q.domain); upsertQuest(q.id, q); return { text: 'Raised <b>' + q.title + '</b> to <b>' + RARITY[q.rarity].l + '</b> — now +' + q.xp + ' XP and stronger proof. No backing out.', did: ['↑ ' + q.title] }; }
    }
    if (/(easier|simpler|too hard|lower|smaller)/i.test(low)) {
      var active2 = allQuests().filter(function (q) { return q.status === 'active' && q.cat !== 'main'; });
      var q2 = active2[active2.length - 1];
      if (q2) { var j = Math.max(0, RANK.indexOf(q2.rarity) - 1); q2.rarity = RANK[j]; var rew2 = rewardFor(q2.rarity); q2.xp = rew2.xp; q2.coins = rew2.coins; q2.proof = proofFor(q2.rarity, q2.domain); upsertQuest(q2.id, q2); return { text: 'Scaled <b>' + q2.title + '</b> down to ' + RARITY[q2.rarity].l + '. Smaller is fine — momentum matters more than size.', did: ['↓ ' + q2.title] }; }
    }

    // 6) WHAT FIRST / where to start
    if (/(what (should|do) i|where (do|should) i|first|start with|priorit)/i.test(low)) {
      var order = ['boss', 'main', 'daily', 'weekly', 'side'];
      var pick = null;
      for (var oi = 0; oi < order.length && !pick; oi++) { pick = allQuests().find(function (q) { return q.cat === order[oi] && q.status === 'active'; }); }
      if (pick) { return { text: 'Start with <b>' + pick.title + '</b>. ' + (pick.reason || '') + ' Knock it out while your willpower is highest.', did: [] }; }
      return { text: 'You\'re clear for now. Tell me a goal and I\'ll build the next quest.', did: [] };
    }

    // 7) generic → real AI if key, else scripted coach
    if (window.coreAI && coreAI.hasKey()) { return { text: '__ASYNC__', raw: t }; }
    var stub = [
      'Keep it simple: pick the smallest quest on your board and finish it in the next 10 minutes. Momentum first.',
      'I hear you. The quest that scares you a little is usually the one worth doing. Which one is that right now?',
      'Tell me what you\'re reading, training, or building — I\'ll turn it into a tracked quest with real rewards.',
      'Discipline isn\'t a feeling, it\'s the next rep. What\'s the next rep for you today?'
    ];
    return { text: stub[Math.abs(t.length) % stub.length], did: [] };
  }

  // async wrapper that may hit real AI for open-ended messages
  async function coachReply(text) {
    pushChat('user', text);
    var r = intentReply(text);
    if (r.text === '__ASYNC__' && window.coreAI) {
      try {
        var ctx = getMemory();
        var sys = 'You are CORE Coach, the user\'s in-game life strategist. Memory: ' + JSON.stringify({ goal: ctx.main && ctx.main.title, focus: ctx.focus, reading: ctx.domains.reading, avoiding: ctx.avoiding }).slice(0, 700) + '. Be concise, motivating, specific. 2-3 sentences.';
        var resp = await coreAI.chat([{ role: 'system', content: sys }, { role: 'user', content: text }], { maxTokens: 220, temperature: 0.7 });
        r = { text: (resp.text || 'Let\'s keep moving.').replace(/\n+/g, ' '), did: [] };
      } catch (e) { r = { text: 'Let\'s keep it simple — pick one quest and finish it now.', did: [] }; }
    }
    pushChat('ai', r.text);
    return r;
  }

  // ── completion + reward bundle ──
  // Quest domain → CORE life-score stat (display key) + rarity-scaled gain.
  // Single source for both the reward overlay (rewardBundle) and the grant (claimQuest).
  var DOMAIN_STAT = { gym: 'strength', reading: 'focus', school: 'focus', mind: 'health', health: 'health', discipline: 'purpose', money: 'wealth', business: 'wealth', social: 'social' };
  var RARITY_STAT_GAIN = { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 3, mythic: 3 };
  function statForQuest(q) {
    var key = q.stat || DOMAIN_STAT[q.domain];
    if (!key) return null;
    return { key: key, gain: q.statGain || RARITY_STAT_GAIN[q.rarity] || 1 };
  }

  function rewardBundle(q) {
    var rows = [];
    if (q.xp) rows.push({ type: 'xp', label: 'Experience', value: q.xp });
    if (q.coins) rows.push({ type: 'coin', label: 'Coins', value: q.coins });
    var sg = statForQuest(q);
    if (sg) { var sd = (window.coreState && coreState.statDef) ? coreState.statDef(sg.key) : null;
      rows.push({ type: 'stat', label: (sd && sd.name) || sg.key, sub: 'Life Score', value: sg.gain, color: (sd && sd.color) || '#4A8FFF' }); }
    (q.items || []).forEach(function (it) { rows.push({ type: 'item', label: it.name, sub: (RARITY[it.rarity] || RARITY.common).l + ' item', rarity: it.rarity }); });
    if (q.chest) rows.push({ type: 'item', label: (RARITY[q.chest.rarity] || RARITY.epic).l + ' Chest', sub: 'Reward chest', rarity: q.chest.rarity, chest: true });
    return rows;
  }
  // apply rewards to coreState + history; advance domain memory; mark claimed
  function claimQuest(id) {
    var q = findQuest(id); if (!q || q.status === 'claimed') return null;
    try { if (window.coreState) { if (coreState.addXp) coreState.addXp(q.xp, 'quest:' + q.id); if (coreState.earnCoins && q.coins) coreState.earnCoins(q.coins, 'quest:' + q.id);
      (q.items || []).forEach(function (it) { if (coreState.addItem) coreState.addItem({ id: it.name.toLowerCase().replace(/\s+/g, '-'), name: it.name, type: 'item', rarity: it.rarity, source: 'Quest' }); });
      // Life Score gain — quest domain maps to a CORE stat (addStat accepts display keys)
      if (coreState.addStat) { var sg = statForQuest(q); if (sg) coreState.addStat(sg.key, sg.gain, 'quest:' + q.id); }
      if (q.chest && coreState.update) { coreState.update(function (s) { s.chests = s.chests || { opened: [], progress: 0 }; var owned = (function () { try { return JSON.parse(localStorage.getItem('coreOwnedChests') || '[]'); } catch (e) { return []; } })(); owned.push('chest_' + q.chest.rarity); localStorage.setItem('coreOwnedChests', JSON.stringify(owned)); return s; }); }
    } } catch (e) {}
    if (q.domain === 'reading') advanceReading();
    // main quest progress nudge
    var m = getMemory();
    if (m.main) { m.main.progress = Math.min(100, (m.main.progress || 0) + (q.cat === 'boss' ? 12 : q.cat === 'weekly' ? 8 : 4)); var milesDone = Math.floor(m.main.progress / 25); (m.main.milestones || []).forEach(function (ms, i) { if (i <= milesDone) ms.done = true; }); setMemory(m); }
    logHistory({ title: q.title, result: 'done', xp: q.xp, coins: q.coins, cat: q.cat });
    q.status = 'claimed'; upsertQuest(q.id, q);
    try { if (window.coreState && coreState.syncProgress) coreState.syncProgress(); window.dispatchEvent(new CustomEvent('core:progress-updated', { detail: { source: 'quests' } })); } catch (e) {}
    return q;
  }
  function markClaimable(id) { var q = findQuest(id); if (q) { q.status = 'claimable'; upsertQuest(q.id, q); } return q; }

  window.coreQuest = {
    RARITY: RARITY, RANK: RANK, ICON: ICON,
    getMemory: getMemory, setMemory: setMemory, remember: remember, rememberFact: rememberFact,
    getQuests: getQuests, allQuests: allQuests, questsByCat: questsByCat, findQuest: findQuest,
    addQuest: addQuest, upsertQuest: upsertQuest, removeQuest: removeQuest,
    ensureDefaults: ensureDefaults, onboardComplete: onboardComplete,
    coachReply: coachReply, readingQuest: readingQuest,
    rewardFor: rewardFor, rewardBundle: rewardBundle, markClaimable: markClaimable, claimQuest: claimQuest,
    getHistory: getHistory, logHistory: logHistory, historyStats: historyStats,
    getChat: getChat, pushChat: pushChat, playerName: playerName
  };
})();
