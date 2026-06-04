/* quest-ui.js — rendering + interactions for 21-quests.html
 * Depends on: coreState, coreAI, coreProof, coreQuest (quest-engine.js)
 */
(function () {
  if (typeof window === 'undefined' || !window.coreQuest) return;
  var Q = window.coreQuest, S = window.coreState;
  var qs = function (s) { return document.querySelector(s); };
  var el = function (id) { return document.getElementById(id); };
  function SFX(n) { try { if (typeof window.coreSfx === 'function') window.coreSfx(n); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function svg(inner, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; }
  function dom(d) { return Q.ICON[d] || Q.ICON.generic; }

  var IC_XP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>';
  var IC_COIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/></svg>';
  var IC_CHEST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l2-4h14l2 4M3 9v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M12 9v3"/></svg>';
  var IC_ITEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z"/></svg>';
  var IC_STAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l4-4 3 3 6-7M16 7h3v3"/></svg>';
  var IC_CLOCK ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>';
  var IC_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z"/></svg>';
  var IC_BOLT_S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>';

  var PROOF_LABEL = { low: 'Quick check', medium: 'Proof', high: 'Photo proof', legendary: 'Full proof' };

  // RPG-6 stat DISPLAY MAPPING — surfaces Strength/Focus/Wealth/Health/Social/Purpose on the
  // quest surface, backed by CORE's existing domains (no parallel stat model, no desync).
  var STAT_MAP = {
    gym:      { l: 'Strength', c: '#FF6B6B', ic: '<path d="M4 9v6M7 8v8M17 8v8M20 9v6M7 12h10"/>' },
    business: { l: 'Wealth',   c: '#FFC56B', ic: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 10.2h4a1.4 1.4 0 0 1 0 2.8h-3a1.4 1.4 0 0 0 0 2.8h4"/>' },
    reading:  { l: 'Purpose',  c: '#5BC8FF', ic: '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.3 4.9-4.9 2.3 2.3-4.9z"/>' },
    school:   { l: 'Focus',    c: '#4A8FFF', ic: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>' },
    health:   { l: 'Health',   c: '#34D399', ic: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z"/>' },
    social:   { l: 'Social',   c: '#B388FF', ic: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5"/>' },
    generic:  { l: 'Focus',    c: '#4A8FFF', ic: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>' }
  };
  function statFor(q) {
    if (STAT_MAP[q.domain]) return STAT_MAP[q.domain];
    var t = (q.title + ' ' + (q.desc || '')).toLowerCase();
    if (/(call|text|friend|talk|meet|partner|family|reach out)/.test(t)) return STAT_MAP.social;
    if (/(workout|gym|run|steps|lift|stretch|train)/.test(t)) return STAT_MAP.gym;
    if (/(water|sleep|walk|meal|hydrate|rest)/.test(t)) return STAT_MAP.health;
    if (/(save|money|earn|invoice|sell|budget|income)/.test(t)) return STAT_MAP.business;
    if (/(read|learn|study|course|book|write)/.test(t)) return STAT_MAP.reading;
    return STAT_MAP.generic;
  }

  // ── toast ──
  var toastT;
  function toast(m, kind) {
    var t = el('toast'); var ic = kind === 'good' ? svg('<path d="M5 12l4 4 10-11"/>', 3) : kind === 'warn' ? svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>', 2.2) : '';
    t.className = 'toast show' + (kind ? ' ' + kind : ''); t.innerHTML = ic + '<span>' + m + '</span>';
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  function countUp(node, to, dur) {
    var from = parseInt((node.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0; to = to | 0; if (from === to) { node.textContent = to.toLocaleString(); return; }
    var start = null; dur = dur || 700; if (node._raf) cancelAnimationFrame(node._raf);
    function step(ts) { if (!start) start = ts; var p = Math.min(1, (ts - start) / dur); node.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) node._raf = requestAnimationFrame(step); }
    node._raf = requestAnimationFrame(step);
  }
  function syncTop() { try { var s = S.read(); countUp(el('xpTop'), s.xp || 0); countUp(el('coinTop'), s.coins || 0); } catch (e) {} }
  var REDUCED_M = false; try { REDUCED_M = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  // floating "+N XP" rising from the top XP chip — instant reward juice on completion
  function flyXp(amount) {
    if (!amount) return; var chip = el('xpTop'), phone = document.querySelector('.phone'); if (!chip || !phone) return;
    var pr = phone.getBoundingClientRect(), cr = chip.getBoundingClientRect();
    var fx = document.createElement('div'); fx.className = 'flyxp'; fx.textContent = '+' + amount + ' XP';
    fx.style.left = (cr.left - pr.left + cr.width / 2) + 'px'; fx.style.top = (cr.top - pr.top + cr.height + 2) + 'px';
    phone.appendChild(fx);
    if (REDUCED_M) { setTimeout(function () { fx.remove(); }, 900); return; }
    fx.animate([{ transform: 'translate(-50%,6px) scale(.8)', opacity: 0 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: .22 }, { transform: 'translate(-50%,-30px) scale(1)', opacity: 0 }], { duration: 1150, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = function () { fx.remove(); };
  }

  // ── stars ──
  (function () { var h = el('stars'); if (!h) return; var f = document.createDocumentFragment(); for (var i = 0; i < 56; i++) { var d = document.createElement('span'); d.className = 'star'; var sz = (i % 7 === 0) ? 2.2 : (i % 3 === 0) ? 1.6 : 1.0; d.style.width = sz + 'px'; d.style.height = sz + 'px'; d.style.left = ((i * 37) % 100) + '%'; d.style.top = ((i * 53) % 100) + '%'; d.style.setProperty('--d', (3 + (i % 5)) + 's'); d.style.setProperty('--del', ((i % 9) * 0.4) + 's'); if (i % 11 === 0) d.style.boxShadow = '0 0 6px rgba(150,195,255,0.8)'; f.appendChild(d); } h.appendChild(f); })();

  // ════════ COACH HERO ════════
  function coachBriefing() {
    var m = Q.getMemory(); var name = Q.playerName();
    var active = Q.allQuests().filter(function (q) { return q.status === 'active' || q.status === 'claimable'; });
    var boss = active.find(function (q) { return q.cat === 'boss'; });
    var hello = name ? 'Morning, <b>' + esc(name) + '</b>.' : 'Here\'s today.';
    if (boss) return hello + ' Your boss quest — <b>' + esc(boss.title) + '</b> — is the one that moves the needle. Everything else is warm-up.';
    if (active.length) return hello + ' You\'ve got <b>' + active.length + ' quests</b> live. Clear the daily set and your streak holds.';
    return hello + ' Board\'s clear — tell me a goal and I\'ll build your next mission.';
  }
  function renderCoach() {
    var active = Q.allQuests().filter(function (q) { return q.status === 'active'; });
    var claimable = Q.allQuests().filter(function (q) { return q.status === 'claimable'; });
    var xpAvail = active.concat(claimable).reduce(function (a, q) { return a + (q.xp || 0); }, 0);
    el('coach').innerHTML =
      '<div class="coachtop"><div class="orb"><i></i><i></i><i></i><div class="core"></div></div>' +
      '<div class="ci"><div class="cn"><span class="live"></span>CORE Coach · Online</div><div class="cg">' + coachBriefing() + '</div></div></div>' +
      '<div class="coachmeta">' +
        '<div class="cm"><div class="k">Quests today</div><div class="v">' + active.length + ' <small>active</small></div></div>' +
        '<div class="cm"><div class="k">XP on the board</div><div class="v">' + xpAvail.toLocaleString() + '</div></div>' +
        '<div class="cm"><div class="k">Ready to claim</div><div class="v">' + claimable.length + '</div></div>' +
      '</div>' +
      '<div class="coachactions"><button class="ca talk" data-coach="open">' + svg('<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/>') + 'Talk to Coach</button>' +
        '<button class="ca gen" data-coach="new">' + svg('<path d="M12 5v14M5 12h14"/>') + 'New quest</button></div>' +
      '<div class="qchips">' +
        chip('first', 'What should I do first?') + chip('read', 'Track my reading') + chip('money', 'Create a money quest') +
        chip('hard', 'Make today harder') + chip('disc', 'Build discipline') + chip('hist', 'Quest history') +
      '</div>';
  }
  function chip(k, label) { return '<button class="qc" data-chip="' + k + '">' + svg('<path d="M5 12l5 5L20 7"/>', 2.4) + esc(label) + '</button>'; }

  // ════════ QUEST CARD ════════
  function tag(cls, inner) { return '<span class="tg ' + cls + '">' + inner + '</span>'; }
  function rewardChips(q) {
    var h = '';
    if (q.xp) h += '<span class="rw xp">' + IC_BOLT_S + q.xp + '</span>';
    if (q.coins) h += '<span class="rw coin">' + IC_COIN + q.coins + '</span>';
    (q.items || []).forEach(function (it) { h += '<span class="rw item">' + IC_ITEM + '</span>'; });
    if (q.chest) h += '<span class="rw chest">' + IC_CHEST + '</span>';
    return h;
  }
  function questCard(q) {
    var R = Q.RARITY[q.rarity] || Q.RARITY.common;
    var statusCls = q.status === 'claimed' ? ' claimed' : q.status === 'claimable' ? ' claimable-card' : '';
    var bossCls = q.cat === 'boss' ? ' boss' : '';
    var btn;
    if (q.status === 'claimed') btn = '<button class="qbtn done">' + svg('<path d="M5 12l4 4 10-11"/>', 3) + 'Done</button>';
    else if (q.status === 'claimable') btn = '<button class="qbtn claim" data-act="claim" data-qid="' + q.id + '">' + svg('<path d="M12 2l2.4 6.8L21 9l-5.5 4 2 7-5.5-4.2L6.5 20l2-7L3 9z"/>', 1.6) + 'Claim</button>';
    else if (q.cat !== 'boss' && q.proof === 'low') btn = '<button class="qbtn go" data-act="complete" data-qid="' + q.id + '">' + svg('<path d="M5 12l4 4 10-11"/>', 2.8) + 'Complete</button>';
    else btn = '<button class="qbtn ' + (q.cat === 'boss' ? 'boss' : 'go') + '" data-act="start" data-qid="' + q.id + '">' + (q.cat === 'boss' ? 'Face it' : 'Start') + '</button>';

    var DIFF = (q.rarity === 'common' || q.rarity === 'uncommon') ? { k: 'easy', l: 'Easy' }
      : (q.rarity === 'rare' || q.rarity === 'epic') ? { k: 'med', l: 'Medium' }
      : { k: 'hard', l: 'Hard' };
    var ST = statFor(q);
    var tags = '<span class="tg stat" style="--sc:' + ST.c + '">' + svg(ST.ic, 2) + ST.l + '</span>' +
      tag('diff ' + DIFF.k, DIFF.l) +
      tag('rar', '<span class="rd"></span>' + R.l) +
      tag('meta', IC_CLOCK + esc(q.timeEst)) +
      tag('proof', svg('<path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>', 2) + (PROOF_LABEL[q.proof] || 'Proof'));

    var prog = q.progress ? '<div class="qprog"><div class="pl"><span>Progress</span><span>' + q.progress.cur + ' / ' + q.progress.total + '</span></div><div class="pb"><div class="pf" style="width:' + Math.min(100, Math.round(q.progress.cur / q.progress.total * 100)) + '%"></div></div></div>' : '';
    var note = q.coachNote ? '<div class="qcoach"><div class="qo"></div><div class="qm">' + esc(q.coachNote) + '</div></div>' : '';
    var why = q.reason ? '<div class="qwhy"><div class="wi">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>', 2) + '</div><div class="wt"><b>Why this:</b> ' + esc(q.reason) + '</div></div>' : '';

    return '<div class="quest r-' + q.rarity + bossCls + (q.status === 'claimed' ? ' claimed' : '') + '" style="--rc:' + R.c + '" data-qid="' + q.id + '">' +
      '<div class="qhead"><div class="qicon" style="--rc:' + ST.c + '">' + svg(ST.ic) + '</div><div class="qmid"><div class="qtitle">' + esc(q.title) + '</div><div class="qtags">' + tags + '</div></div></div>' +
      (q.desc ? '<div class="qdesc">' + esc(q.desc) + '</div>' : '') + why + prog + note +
      '<div class="qfoot"><div class="qrew">' + rewardChips(q) + '</div>' + btn + '</div>' +
    '</div>';
  }

  function sectionHead(icon, title, count, moreKey) {
    return '<div class="sechd"><div class="l">' + svg(icon) + '<h2>' + title + '</h2></div>' + (moreKey ? '<button class="more" data-more="' + moreKey + '">' + count + '</button>' : '<span class="ct">' + count + '</span>') + '</div>';
  }

  function mainQuestCard(m) {
    if (!m.main) return '';
    var mn = m.main; var pct = Math.min(100, mn.progress || 0);
    var miles = (mn.milestones || []).map(function (ms) { return '<div class="ms' + (ms.done ? ' done' : '') + '"><div class="mn">' + esc(ms.n) + '</div><div class="mv">' + (ms.done ? '✓' : '·') + '</div></div>'; }).join('');
    var rw = mn.reward || {};
    return '<div class="sec"><div class="sechd"><div class="l">' + svg('<path d="M12 2l2.4 6.8L21 9l-5.5 4 2 7-5.5-4.2L6.5 20l2-7L3 9z"/>') + '<h2>Main Questline</h2></div><span class="ct">Your big goal</span></div>' +
      '<div class="mainq"><div class="mtag">' + svg('<path d="M5 21V8l7-5 7 5v13"/>', 2) + 'Life Goal</div>' +
      '<div class="mt">' + esc(mn.title) + '</div><div class="mwhy">' + esc(mn.why) + '</div>' +
      '<div class="mbar"><div class="mfill" style="width:' + pct + '%"></div></div>' +
      '<div class="mprog"><span>Progress</span><b>' + pct + '%</b></div>' +
      '<div class="mile">' + miles + '</div>' +
      '<div class="mrew">Completion reward:' +
        '<span class="rwd">' + IC_BOLT_S + (rw.xp || 0).toLocaleString() + '</span>' +
        '<span class="rwd">' + IC_COIN + (rw.coins || 0) + '</span>' +
        (rw.chest ? '<span class="rwd">' + IC_CHEST + cap(rw.chest) + ' Chest</span>' : '') +
      '</div></div></div>';
  }
  function cap(s) { return (s || '').replace(/^\w/, function (c) { return c.toUpperCase(); }); }

  function chainCard(chainId, name, steps) {
    var doneCount = steps.filter(function (s) { return s.status === 'claimed'; }).length;
    var dotsHtml = steps.map(function (s, i) {
      var d = '<div class="cstep' + (s.status === 'claimed' ? ' done' : '') + '"><div class="cdot">' + svg(s.status === 'claimed' ? '<path d="M5 12l4 4 10-11"/>' : dom(s.domain), 2.2) + '</div><div class="cln">' + esc(s.title) + '</div></div>';
      return d + (i < steps.length - 1 ? '<div class="carrow">' + svg('<path d="M9 6l6 6-6 6"/>', 2) + '</div>' : '');
    }).join('');
    var complete = doneCount === steps.length;
    return '<div class="chain"><div class="chd">' + svg('<path d="M9 12a3 3 0 0 0 3 3h2a3 3 0 0 0 0-6M15 12a3 3 0 0 0-3-3h-2a3 3 0 0 0 0 6"/>', 2) + esc(name) + ' Chain · ' + doneCount + '/' + steps.length + '</div>' +
      '<div class="csteps">' + dotsHtml + '</div>' +
      '<div class="crew">' + svg('<path d="M3 9l2-4h14l2 4M3 9v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18"/>', 1.8) + (complete ? 'Chain complete — bonus chest unlocked!' : 'Complete all ' + steps.length + ' → bonus chest + 200 XP') + '</div></div>';
  }

  // ════════ RENDER ════════
  function render() {
    syncTop();
    renderCoach();
    var m = Q.getMemory();
    var html = '';

    // Main questline
    html += mainQuestCard(m);

    // Daily
    var daily = Q.questsByCat('daily');
    if (daily.length) {
      var dDone = daily.filter(function (q) { return q.status === 'claimed'; }).length;
      var dPct = Math.round(dDone / daily.length * 100);
      var todayBar = '<div class="todaybar"><div class="tbtop"><span>Today’s progress</span><b>' + dDone + '/' + daily.length + '</b></div><div class="tbtrack"><div class="tbfill" style="width:' + dPct + '%"></div></div></div>';
      var claimables = Q.allQuests().filter(function (q) { return q.status === 'claimable'; });
      var claimAllBtn = claimables.length ? '<button class="claimall" data-act="claimall">' + svg('<path d="M12 2l2.4 6.8L21 9l-5.5 4 2 7-5.5-4.2L6.5 20l2-7L3 9z"/>', 1.7) + 'Claim all rewards (' + claimables.length + ')</button>' : '';
      html += '<div class="sec">' + sectionHead('<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>', 'Daily Quests', daily.filter(function (q) { return q.status !== 'claimed'; }).length + ' left') + todayBar + claimAllBtn + '<div class="qgrid">' + daily.map(questCard).join('') + '</div></div>';
    }

    // Weekly
    var weekly = Q.questsByCat('weekly');
    if (weekly.length) { html += '<div class="sec">' + sectionHead('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 'Weekly Quests', weekly.length + ' open') + '<div class="qgrid">' + weekly.map(questCard).join('') + '</div></div>'; }

    // Boss
    var boss = Q.questsByCat('boss');
    if (boss.length) { html += '<div class="sec">' + sectionHead('<path d="M12 2l3 4 5 1-2 5 2 5-5 1-3 4-3-4-5-1 2-5-2-5 5-1z"/>', 'Boss Quests', 'High impact') + '<div class="qgrid">' + boss.map(questCard).join('') + '</div></div>'; }

    // Side + chains
    var side = Q.questsByCat('side');
    var chained = {}; side.forEach(function (q) { if (q.chainId) { (chained[q.chainId] = chained[q.chainId] || { name: q.chainName, steps: [] }).steps.push(q); } });
    var loose = side.filter(function (q) { return !q.chainId; });
    if (loose.length || Object.keys(chained).length) {
      html += '<div class="sec">' + sectionHead('<path d="M12 2l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z"/>', 'Side Quests', 'Optional');
      html += '<div class="qgrid">' + loose.map(questCard).join('');
      Object.keys(chained).forEach(function (cid) { html += chainCard(cid, chained[cid].name, chained[cid].steps); });
      html += '</div></div>';
    }

    // empty state
    if (!daily.length && !weekly.length && !boss.length && !side.length && !m.main) {
      html += '<div class="sec"><div class="empty"><div class="et">Your board is empty</div><div class="ed">Tell the Coach a goal and it\'ll build your first mission system — daily quests, a main goal, and a boss challenge.</div></div>' +
        '<div class="locked-q"><div class="lq">' + svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 2.2) + '</div><div class="lt">Boss Quest<small>Unlocks with your first goal — rare items + chests</small></div></div>' +
        '<div class="locked-q"><div class="lq">' + svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 2.2) + '</div><div class="lt">Main Questline<small>Your biggest life goal, tracked to completion</small></div></div></div>';
    }

    // history button
    html += '<div class="sec"><button class="ca gen" style="width:100%" data-coach="hist">' + svg('<path d="M3 3v6h6M3 9a9 9 0 1 0 2-5"/>', 2) + 'Quest History &amp; Stats</button></div>';

    el('sections').innerHTML = html;
  }

  // ════════ ACTIONS ════════
  function startQuest(q) {
    if (q.proof === 'low') { Q.markClaimable(q.id); SFX('tick'); toast('Verified — claim your reward', 'good'); render(); return; }
    if (q.proof === 'medium') { q.mode === 'timer' ? proofTimer(q) : proofText(q); return; }
    if (q.proof === 'high') { proofPhoto(q); return; }
    proofLegendary(q);
  }

  function openOv(id) { el(id).classList.add('on'); }
  function closeOv(id) { el(id).classList.remove('on'); }

  // ── MEDIUM: text reflection ──
  function proofText(q) {
    var min = (q.cat === 'boss' || q.rarity === 'epic') ? 40 : 14;
    el('proofRoot').innerHTML =
      '<div class="pf-h">Prove it</div><div class="pf-sub">A short, honest note on what you did. The Coach reads it.</div>' +
      '<div class="pf-task"><div class="qicon" style="--rc:' + (Q.RARITY[q.rarity].c) + '">' + svg(dom(q.domain)) + '</div><div class="pn">' + esc(q.title) + '</div></div>' +
      '<textarea class="pf-ta" id="pfTa" placeholder="e.g. Did 4 sets of squats at 60kg, felt strong…"></textarea>' +
      '<div class="pf-count" id="pfCount">0 / ' + min + ' min</div>' +
      '<button class="pf-btn" id="pfSubmit" disabled>Submit to Coach</button>' +
      '<button class="pf-btn ghost" data-close>Cancel</button>';
    openOv('proofOv');
    var ta = el('pfTa'), btn = el('pfSubmit'), cnt = el('pfCount');
    ta.addEventListener('input', function () { var n = ta.value.trim().length; cnt.textContent = n + ' / ' + min + ' min'; btn.disabled = n < min; });
    setTimeout(function () { ta.focus(); }, 250);
    btn.addEventListener('click', function () {
      var txt = ta.value.trim();
      el('proofRoot').innerHTML = '<div class="pf-spin"></div><div style="text-align:center;color:var(--muted);font-size:13px;">Coach is reviewing…</div>';
      setTimeout(function () {
        // local judge: length + on-topic-ish keyword bonus
        var verdict = txt.length >= min + 26 ? 'pass' : 'review';
        if (txt.length < min) verdict = 'fail';
        showVerdict(q, verdict, verdict === 'pass' ? 'Clear and specific. Logged.' : verdict === 'review' ? 'Logged — add a bit more detail next time for full marks.' : 'Too thin to verify. Tell me what you actually did.');
      }, 850);
    });
  }

  // ── MEDIUM: timer ──
  function proofTimer(q) {
    var total = q.timerSec || 600, left = total; var R = 64, C = 2 * Math.PI * R;
    el('proofRoot').innerHTML =
      '<div class="pf-h">Focus timer</div><div class="pf-sub">Stay with it until the timer ends. That\'s your proof.</div>' +
      '<div class="pf-timer"><div class="pf-ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="' + R + '" stroke="rgba(255,255,255,0.08)"/><circle id="pfArc" cx="75" cy="75" r="' + R + '" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="0"/></svg><div class="pf-time" id="pfTime"></div></div></div>' +
      '<button class="pf-btn" id="pfStart">Start ' + Math.round(total / 60) + ':00</button>' +
      '<button class="pf-btn ghost" data-close>Not now</button>';
    openOv('proofOv');
    function fmt(s) { var mm = Math.floor(s / 60), ss = s % 60; return mm + ':' + (ss < 10 ? '0' : '') + ss; }
    el('pfTime').textContent = fmt(left);
    var running = false, iv;
    el('pfStart').addEventListener('click', function () {
      if (running) return; running = true; var btn = el('pfStart'); btn.textContent = 'In progress…'; btn.disabled = true;
      iv = setInterval(function () {
        left--; el('pfTime').textContent = fmt(Math.max(0, left));
        el('pfArc').style.strokeDashoffset = C * (1 - left / total);
        if (left <= 0) { clearInterval(iv); SFX('chime'); showVerdict(q, 'pass', 'Full session done. That\'s the proof.'); }
      }, 1000);
    });
  }

  // ── HIGH: photo via coreProof ──
  function proofPhoto(q) {
    if (window.coreProof) {
      coreProof.captureFor({ id: q.id, title: q.title }, function (res) {
        if (res && res.verdict !== 'fail') { Q.markClaimable(q.id); SFX('tick'); toast('Proof accepted — claim your reward', 'good'); render(); }
        else if (res && res.verdict === 'fail') { toast('That didn\'t match the task', 'warn'); }
      });
    } else { proofText(q); }
  }

  // ── LEGENDARY: explanation + photo ──
  function proofLegendary(q) {
    el('proofRoot').innerHTML =
      '<div class="pf-h">Legendary proof</div><div class="pf-sub">Big quests need real evidence. Add a photo and a short account.</div>' +
      '<div class="pf-task"><div class="qicon" style="--rc:' + (Q.RARITY[q.rarity].c) + '">' + svg(dom(q.domain)) + '</div><div class="pn">' + esc(q.title) + '</div></div>' +
      '<label class="pf-upl" id="pfUpl">' + svg('<path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>', 1.8) + '<span>Tap to add a photo / screenshot</span><input type="file" accept="image/*" id="pfFile" style="display:none"></label>' +
      '<textarea class="pf-ta" id="pfTa" placeholder="What did you do, and how do you know it\'s done?"></textarea>' +
      '<div class="pf-count" id="pfCount">0 / 40 min · photo required</div>' +
      '<button class="pf-btn" id="pfSubmit" disabled>Submit for verification</button>' +
      '<button class="pf-btn ghost" data-close>Cancel</button>';
    openOv('proofOv');
    var ta = el('pfTa'), btn = el('pfSubmit'), cnt = el('pfCount'), file = el('pfFile'), upl = el('pfUpl');
    var img = null;
    function check() { var n = ta.value.trim().length; cnt.textContent = n + ' / 40 min · ' + (img ? 'photo added ✓' : 'photo required'); btn.disabled = !(n >= 40 && img); }
    ta.addEventListener('input', check);
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { img = rd.result; upl.innerHTML = '<img src="' + img + '" alt="proof">'; check(); }; rd.readAsDataURL(f); });
    btn.addEventListener('click', async function () {
      el('proofRoot').innerHTML = '<div class="pf-spin"></div><div style="text-align:center;color:var(--muted);font-size:13px;">' + (window.coreAI && coreAI.hasKey() ? 'AI is verifying your evidence…' : 'Coach is reviewing your evidence…') + '</div>';
      var verdict = 'pass', reason = 'Strong evidence. Quest verified.';
      if (window.coreAI && coreAI.hasKey() && img) {
        try { var r = await coreAI.visionCheck(q.title, { dataUrl: img }); verdict = r.verdict || 'review'; reason = r.reason || reason; } catch (e) { verdict = 'review'; }
      } else { await new Promise(function (r) { setTimeout(r, 900); }); }
      showVerdict(q, verdict, reason);
    });
  }

  function showVerdict(q, verdict, reason) {
    var titleMap = { pass: 'Proof accepted', review: 'Logged — needs review', fail: 'Not enough proof' };
    var icon = verdict === 'pass' ? '<path d="M5 12l4 4 10-11"/>' : verdict === 'fail' ? '<path d="M6 6l12 12M18 6L6 18"/>' : '<path d="M12 8v5M12 16h.01"/>';
    el('proofRoot').innerHTML =
      '<div class="pf-verdict ' + verdict + '"><div class="vic">' + svg(icon, 3) + '</div><div class="vt"><b>' + titleMap[verdict] + '</b><p>' + esc(reason) + '</p></div></div>' +
      (verdict === 'fail'
        ? '<button class="pf-btn" data-close>Try again</button>'
        : '<button class="pf-btn" id="pfConfirm">Confirm &amp; claim reward</button><button class="pf-btn ghost" data-close>Later</button>');
    if (verdict !== 'fail') { SFX('tick'); el('pfConfirm').addEventListener('click', function () { Q.markClaimable(q.id); closeOv('proofOv'); render(); var qq = Q.findQuest(q.id); claimFlow(qq); }); }
  }

  // ── REWARD CINEMATIC ──
  function claimFlow(q) {
    var rows = Q.rewardBundle(q);
    var R = Q.RARITY[(q.chest && q.chest.rarity) || q.rarity] || Q.RARITY.epic;
    var listHtml = rows.map(function (r) {
      var rc = r.rarity ? Q.RARITY[r.rarity].c : (r.color || '');
      var icon = r.type === 'xp' ? IC_XP : r.type === 'coin' ? IC_COIN : r.type === 'stat' ? IC_STAT : (r.chest ? IC_CHEST : IC_ITEM);
      var val = (r.type === 'xp' || r.type === 'coin') ? '<div class="rv" data-target="' + r.value + '">0</div>'
              : r.type === 'stat' ? '<div class="rv" style="color:' + (r.color || '#fff') + '">+' + r.value + '</div>' : '';
      return '<div class="rwd-row ' + r.type + '" style="' + (rc ? '--rc:' + rc : '') + '"><div class="ri">' + icon + '</div><div class="rl">' + esc(r.label) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>' + val + '</div>';
    }).join('');
    el('rwdCard').innerHTML =
      '<div class="rwd-chest" style="--rc:' + R.c + '"><div class="glow"></div>' + IC_CHEST.replace('stroke-width="1.8"', 'stroke-width="1.4"') + '</div>' +
      '<div class="rwd-title">Quest Complete</div><div class="rwd-name">' + esc(q.title) + '</div>' +
      '<div class="rwd-list">' + listHtml + '</div>' +
      '<button class="rwd-done" id="rwdCollect">Collect rewards</button>';
    el('rwdOv').classList.add('on'); SFX('reward');
    var chest = qs('#rwdCard .rwd-chest'); chest.classList.add('shake');
    var rws = el('rwdCard').querySelectorAll('.rwd-row');
    rws.forEach(function (r, i) { setTimeout(function () { r.classList.add('in'); var v = r.querySelector('.rv'); var tg = v && parseInt(v.dataset.target, 10); if (v && !isNaN(tg)) countUp(v, tg, 600); SFX('coin'); }, 350 + i * 230); });
    el('rwdCollect').addEventListener('click', function () {
      var gained = (Q.findQuest(q.id) || q).xp || 0;
      Q.claimQuest(q.id); el('rwdOv').classList.remove('on'); SFX('confirm');
      render(); syncTop(); flyXp(gained); toast('Rewards collected', 'good');
    });
  }

  function claimQuestUI(q) { claimFlow(q); }

  // ── Claim All — batch-grant every claimable quest, one combined reward overlay ──
  function claimAll() {
    var claimables = Q.allQuests().filter(function (q) { return q.status === 'claimable'; });
    if (!claimables.length) return;
    var totXp = 0, totCoins = 0, n = 0;
    claimables.forEach(function (q) { totXp += q.xp || 0; totCoins += q.coins || 0; Q.claimQuest(q.id); n++; });
    showBatchReward(n, totXp, totCoins);
    render(); syncTop();
  }
  function showBatchReward(n, xp, coins) {
    var R = Q.RARITY.epic;
    var rows = [];
    if (xp) rows.push({ type: 'xp', label: 'Experience', value: xp });
    if (coins) rows.push({ type: 'coin', label: 'Coins', value: coins });
    var listHtml = rows.map(function (r) {
      var icon = r.type === 'xp' ? IC_XP : IC_COIN;
      return '<div class="rwd-row ' + r.type + '"><div class="ri">' + icon + '</div><div class="rl">' + r.label + '</div><div class="rv" data-target="' + r.value + '">0</div></div>';
    }).join('');
    el('rwdCard').innerHTML =
      '<div class="rwd-chest" style="--rc:' + R.c + '"><div class="glow"></div>' + IC_CHEST.replace('stroke-width="1.8"', 'stroke-width="1.4"') + '</div>' +
      '<div class="rwd-title">' + n + ' Quest' + (n === 1 ? '' : 's') + ' Claimed</div><div class="rwd-name">All rewards collected</div>' +
      '<div class="rwd-list">' + listHtml + '</div>' +
      '<button class="rwd-done" id="rwdCollect">Nice</button>';
    el('rwdOv').classList.add('on'); SFX('reward');
    var chest = qs('#rwdCard .rwd-chest'); if (chest) chest.classList.add('shake');
    el('rwdCard').querySelectorAll('.rwd-row').forEach(function (r, i) { setTimeout(function () { r.classList.add('in'); var v = r.querySelector('.rv'); var tg = v && parseInt(v.dataset.target, 10); if (v && !isNaN(tg)) countUp(v, tg, 600); SFX('coin'); }, 350 + i * 230); });
    el('rwdCollect').addEventListener('click', function () { el('rwdOv').classList.remove('on'); SFX('confirm'); flyXp(xp); toast('Rewards collected', 'good'); });
  }

  // ════════ COACH CHAT ════════
  var SUGGEST = ['What should I do first?', 'I\'m reading a book', 'Create a money quest', 'Make today harder', 'Add a quest', 'Build discipline'];
  function openChat(prefill) {
    el('chatRoot').innerHTML =
      '<div class="chathd"><div class="orb"><i></i><i></i><i></i><div class="core"></div></div><div><div class="ch1">CORE Coach</div><div class="ch2"><span class="live"></span>' + (window.coreAI && coreAI.hasKey() ? 'GPT-4o · remembers everything' : 'Online · remembers everything') + '</div></div></div>' +
      '<div class="chatbody" id="chatBody"></div>' +
      '<div class="chatsug" id="chatSug">' + SUGGEST.map(function (s) { return '<button>' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="chatin"><input id="chatInput" placeholder="Tell your Coach anything…" autocomplete="off"><button id="chatSend">' + svg('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', 2) + '</button></div>';
    var body = el('chatBody');
    var hist = Q.getChat();
    if (!hist.length) { bubble('ai', 'I\'m your Coach. I remember everything you tell me — your books, your gym, your goals — and turn it into quests. What are we working on?'); }
    else hist.slice(-12).forEach(function (mm) { bubble(mm.role === 'user' ? 'me' : 'ai', mm.text, true); });
    openOv('chatOv');
    el('chatSug').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
    el('chatSend').addEventListener('click', function () { send(el('chatInput').value); });
    el('chatInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(el('chatInput').value); });
    setTimeout(function () { try { el('chatInput').focus(); } catch (e) {} }, 250);
    if (prefill) { el('chatInput').value = prefill; }
    function bubble(role, text, noScroll) { var d = document.createElement('div'); d.className = 'msg ' + role; d.innerHTML = text; body.appendChild(d); if (!noScroll) body.scrollTop = body.scrollHeight; return d; }
    async function send(text) {
      text = (text || '').trim(); if (!text) return;
      el('chatInput').value = '';
      bubble('me', esc(text));
      var typing = bubble('ai', '<span style="display:flex;gap:4px"><i style="width:6px;height:6px;border-radius:50%;background:var(--muted);display:inline-block"></i></span>'); typing.classList.add('typing'); typing.innerHTML = '<i></i><i></i><i></i>';
      var r = await Q.coachReply(text);
      typing.classList.remove('typing'); typing.innerHTML = r.text;
      body.scrollTop = body.scrollHeight;
      render(); syncTop();
    }
    window._questChatSend = send;
  }
  function sendToCoach(text) { openChat(); setTimeout(function () { if (window._questChatSend) window._questChatSend(text); }, 360); }

  // ════════ HISTORY ════════
  function openHistory() {
    var st = Q.historyStats(), h = Q.getHistory();
    var rows = h.length ? h.map(function (e) {
      var cls = e.result, ic = e.result === 'done' ? '<path d="M5 12l4 4 10-11"/>' : e.result === 'failed' ? '<path d="M6 6l12 12M18 6L6 18"/>' : '<path d="M5 12h14"/>';
      return '<div class="hrow ' + cls + '"><div class="hi">' + svg(ic, 2.4) + '</div><div class="ht">' + esc(e.title) + '<small>' + cap(e.cat || '') + ' · ' + e.result + '</small></div>' + (e.xp ? '<div class="hx">+' + e.xp + '</div>' : '') + '</div>';
    }).join('') : '<div class="hempty">No completed quests yet. Finish your first to start your record.</div>';
    el('histRoot').innerHTML =
      '<div class="pf-h">Quest History</div><div class="pf-sub" style="margin-bottom:14px">Everything you\'ve completed, failed, and earned.</div>' +
      '<div class="hstat"><div class="hs"><div class="v" style="color:var(--good)">' + st.done + '</div><div class="k">Completed</div></div>' +
        '<div class="hs"><div class="v">' + st.xp.toLocaleString() + '</div><div class="k">XP earned</div></div>' +
        '<div class="hs"><div class="v" style="color:var(--coin2)">' + st.coins + '</div><div class="k">Coins</div></div></div>' +
      rows;
    openOv('histOv');
  }

  // ════════ ONBOARDING (cinematic) ════════
  var OB = {
    greet: ['Welcome to CORE.', 'I\'m your Coach.', 'My job is simple — I help you become who you\'re trying to become.', 'Answer 5 questions and I\'ll build your mission system.'],
    questions: [
      { key: 'goal', label: 'What are you trying to become?', chips: ['Get fit', 'Build a business', 'Save money', 'Pass my exams', 'Read more', 'Quit a habit'], input: 'Or type your own goal…', required: true },
      { key: 'focus', label: 'Which areas of life matter most right now?', multi: true, chips: ['Fitness', 'Money', 'Business', 'Learning', 'School', 'Mind', 'Health', 'Relationships'], required: true },
      { key: 'avoiding', label: 'What have you been avoiding?', input: 'The thing you keep putting off…', required: false },
      { key: 'habit', label: 'What habit are you building?', chips: ['Reading', 'Gym', 'Meditation', 'Early mornings', 'No vaping'], input: 'Or describe it…', required: false },
      { key: 'dailyMin', label: 'How much time can you commit daily?', chips: ['15 min', '30 min', '1 hour', '2 hrs+'], map: { '15 min': 15, '30 min': 30, '1 hour': 60, '2 hrs+': 120 }, required: true }
    ]
  };
  var obState = { phase: 'greet', gi: 0, qi: 0, ans: { focus: [] } };

  function runOnboarding() {
    el('ob').classList.add('on');
    obState = { phase: 'greet', gi: 0, ans: { focus: [] } };
    typeGreeting();
  }
  function typeGreeting() {
    var c = el('obc');
    c.innerHTML = '<div class="ob-orb"><i></i><i></i><i></i><div class="core"></div></div><div class="obtag">CORE Coach</div><div class="obsay" id="obSay"></div><div class="obq" id="obQ"></div>';
    var line = OB.greet[obState.gi]; var node = el('obSay'); var i = 0;
    (function tw() { if (i <= line.length) { node.innerHTML = esc(line.slice(0, i)) + '<span class="obcursor"></span>'; i++; setTimeout(tw, 26); } else { node.innerHTML = '<b>' + esc(line) + '</b>'; afterLine(); } })();
    function afterLine() {
      if (obState.gi < OB.greet.length - 1) { setTimeout(function () { obState.gi++; typeGreeting(); }, 750); }
      else { el('obQ').innerHTML = '<button class="obnext" id="obBegin">Begin</button>'; el('obBegin').addEventListener('click', function () { obState.phase = 'q'; obState.qi = 0; renderQ(); }); }
    }
  }
  function renderQ() {
    var q = OB.questions[obState.qi]; var c = el('obc');
    var say = obState.qi === 0 ? 'Let\'s build your system.' : ['Good.', 'I\'ve got that.', 'Noted.', 'Last one.'][Math.min(obState.qi, 3)];
    var dots = OB.questions.map(function (_, i) { return '<div class="obdot' + (i === obState.qi ? ' on' : '') + '"></div>'; }).join('');
    var chipsHtml = (q.chips || []).map(function (ch) {
      var sel = q.multi ? (obState.ans.focus.indexOf(ch) >= 0) : (obState.ans['_' + q.key] === ch);
      return '<button class="obchip' + (sel ? ' sel' : '') + '" data-chip="' + esc(ch) + '">' + esc(ch) + '</button>';
    }).join('');
    c.innerHTML = '<div class="ob-orb"><i></i><i></i><i></i><div class="core"></div></div><div class="obtag">CORE Coach</div>' +
      '<div class="obsay"><b>' + esc(say) + '</b></div>' +
      '<div class="obq"><div class="obqlabel">' + esc(q.label) + '</div>' +
      (q.chips ? '<div class="obchips">' + chipsHtml + '</div>' : '') +
      (q.input ? '<input class="obinput" id="obInput" placeholder="' + esc(q.input) + '" autocomplete="off">' : '') +
      '<button class="obnext" id="obNext"' + (q.required ? ' disabled' : '') + '>' + (obState.qi === OB.questions.length - 1 ? 'Build my quests' : 'Next') + '</button>' +
      '<div class="obdots">' + dots + '</div></div>';
    var nextBtn = el('obNext');
    function refreshValid() {
      var ok = !q.required;
      if (q.multi) ok = obState.ans.focus.length > 0;
      else if (q.required) ok = !!(obState.ans['_' + q.key] || (el('obInput') && el('obInput').value.trim()));
      nextBtn.disabled = !ok;
    }
    c.querySelectorAll('.obchip').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.chip;
        if (q.multi) { var idx = obState.ans.focus.indexOf(v); if (idx >= 0) obState.ans.focus.splice(idx, 1); else obState.ans.focus.push(v); b.classList.toggle('sel'); }
        else { obState.ans['_' + q.key] = v; c.querySelectorAll('.obchip').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); if (el('obInput')) el('obInput').value = ''; }
        refreshValid();
      });
    });
    if (el('obInput')) el('obInput').addEventListener('input', function () { if (!q.multi) obState.ans['_' + q.key] = ''; c.querySelectorAll('.obchip').forEach(function (x) { x.classList.remove('sel'); }); refreshValid(); });
    nextBtn.addEventListener('click', function () {
      // capture answer
      var val = obState.ans['_' + q.key] || (el('obInput') ? el('obInput').value.trim() : '');
      if (q.key === 'goal') obState.ans.goal = val;
      else if (q.key === 'avoiding') obState.ans.avoiding = val;
      else if (q.key === 'habit') obState.ans.habit = val;
      else if (q.key === 'dailyMin') obState.ans.dailyMin = (q.map && q.map[val]) || 30;
      if (obState.qi < OB.questions.length - 1) { obState.qi++; renderQ(); }
      else finishOb();
    });
    refreshValid();
  }
  function finishOb() {
    var c = el('obc');
    var steps = ['Reading your goals…', 'Mapping your focus areas…', 'Generating your main questline…', 'Building daily + boss quests…', 'Your system is ready.'];
    c.innerHTML = '<div class="ob-orb"><i></i><i></i><i></i><div class="core"></div></div><div class="obtag">Building your system</div><div class="obbuild" id="obBuild"></div>';
    var b = el('obBuild');
    steps.forEach(function (s, i) { setTimeout(function () { var d = document.createElement('div'); d.className = 'bl'; d.textContent = s; d.style.animation = 'none'; b.appendChild(d); requestAnimationFrame(function () { d.style.transition = 'opacity .5s'; d.style.opacity = '1'; }); SFX('tick'); }, i * 620); });
    setTimeout(function () {
      Q.onboardComplete(obState.ans);
      el('ob').classList.remove('on');
      render(); syncTop();
      toast('Your mission system is live', 'good');
    }, steps.length * 620 + 500);
  }

  // ════════ EVENT WIRING ════════
  document.addEventListener('click', function (e) {
    var close = e.target.closest('[data-close]'); if (close) { var ov = close.closest('.ov'); if (ov) ov.classList.remove('on'); return; }
  });
  el('sections').addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]'); if (act) {
      if (act.dataset.act === 'claimall') { claimAll(); return; }
      var q = Q.findQuest(act.dataset.qid); if (!q) return;
      if (act.dataset.act === 'start') startQuest(q);
      else if (act.dataset.act === 'complete') { Q.markClaimable(q.id); SFX('tick'); claimFlow(q); }
      else if (act.dataset.act === 'claim') claimFlow(q);
      return;
    }
    var more = e.target.closest('[data-more]'); if (more) { /* reserved */ }
    var coach = e.target.closest('[data-coach]'); if (coach) {
      if (coach.dataset.coach === 'open') openChat();
      else if (coach.dataset.coach === 'new') openChat('Create a ');
      else if (coach.dataset.coach === 'hist') openHistory();
    }
  });
  el('coach').addEventListener('click', function (e) {
    var coach = e.target.closest('[data-coach]'); if (coach) { if (coach.dataset.coach === 'open') openChat(); else if (coach.dataset.coach === 'new') openChat('Create a '); else if (coach.dataset.coach === 'hist') openHistory(); return; }
    var chip = e.target.closest('[data-chip]'); if (chip) {
      var k = chip.dataset.chip;
      if (k === 'hist') return openHistory();
      var map = { first: 'What should I do first?', read: 'I\'m reading a book', money: 'Create a money quest', hard: 'Make today harder', disc: 'Help me build discipline' };
      sendToCoach(map[k] || 'Help me');
    }
  });

  // ════════ INIT ════════
  function init() {
    var m = Q.getMemory();
    // demo seeding
    try { if (/[?&]demo=1/.test(location.search)) { if (S && S.seedDemo) S.seedDemo(); if (!m.onboarded) { Q.onboardComplete({ goal: 'Launch my business and get fit', focus: ['Business', 'Fitness', 'Learning'], avoiding: 'Publish my first landing page', habit: 'Reading', dailyMin: 60 }); var mm = Q.getMemory(); mm.domains.reading = { book: 'Atomic Habits', page: 63, target: 320, daily: 10, why: '' }; Q.setMemory(mm); Q.upsertQuest('q_reading_today', Q.readingQuest('daily')); } } } catch (e) {}

    m = Q.getMemory();
    if (m.onboarded) { Q.ensureDefaults(); render(); syncTop(); }
    else { render(); syncTop(); setTimeout(runOnboarding, 400); }

    // Re-render on external state changes (XP/coins/quests changed by another screen),
    // but never yank the board out from under an open sheet/overlay/proof flow.
    var extT;
    function externalRefresh() {
      syncTop();
      if (document.querySelector('.ov.on') || document.querySelector('.rwd-ov.on') || document.querySelector('.ob.on')) return;
      clearTimeout(extT); extT = setTimeout(function () { render(); syncTop(); }, 90);
    }
    window.addEventListener('core:progress-updated', externalRefresh);
    window.addEventListener('coreStateChange', externalRefresh);
    window.addEventListener('storage', function (ev) { if (!ev.key || /^core(State|Quests|Xp|Coins|Streak)/i.test(ev.key)) externalRefresh(); });
  }
  init();
})();
