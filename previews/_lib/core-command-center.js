/* core-command-center.js
 * Injects a command-center widget block into dashboard.html — top of the
 * scroll area, above the existing routine. Pulls together:
 *   • Today's Tasks (top 3 pending from coreTasks)
 *   • AI Insight (1-line read of current state)
 *   • 4 metric tiles (Focus / Health / Mind / Money)
 *
 * Non-destructive: adds new DOM, doesn't touch existing widgets.
 * Only runs on dashboard.html.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window._coreCommandCenter) return;
  window._coreCommandCenter = true;

  if (!/dashboard\.html$/.test(location.pathname)) return;

  function ensureStyles() {
    if (document.getElementById('core-cc-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-cc-styles';
    s.textContent = `
      .cc-block { padding: 10px 16px 4px; }
      .cc-section-h { font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; color: rgba(235,235,245,0.55); margin: 16px 4px 8px; display: flex; align-items: center; justify-content: space-between; }
      .cc-section-h .right { color: #0A84FF; font-size: 14px; font-weight: 600; cursor: pointer; }
      .cc-list { background: rgba(255,255,255,0.04); border-radius: 14px; overflow: hidden; }
      .cc-row { display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom: 0.5px solid rgba(255,255,255,0.08); cursor: pointer; transition: background 0.12s; }
      .cc-row:last-child { border-bottom: none; }
      .cc-row:active { background: rgba(255,255,255,0.06); }
      .cc-icon { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; }
      .cc-icon svg { width: 16px; height: 16px; stroke: #fff; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .cc-body { flex: 1; min-width: 0; }
      .cc-title { font-size: 15px; color: #fff; font-weight: 500; letter-spacing: -0.2px; }
      .cc-sub   { font-size: 11px; color: rgba(235,235,245,0.55); margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase; }
      .cc-check { width: 24px; height: 24px; border-radius: 50%; border: 1.6px solid rgba(255,255,255,0.22); flex-shrink: 0; cursor: pointer; }
      .cc-check.done { background: #30D158; border-color: #30D158; position: relative; }
      .cc-check.done::after { content:""; position:absolute; left:6px; top:8px; width: 8px; height: 4px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg); }

      .cc-insight { padding: 14px 16px; border-radius: 12px; background: linear-gradient(135deg, rgba(10,132,255,0.16), rgba(91,106,230,0.08)); border: 0.5px solid rgba(10,132,255,0.40); display: flex; gap: 10px; align-items: flex-start; }
      .cc-insight .ai-orb { width: 28px; height: 28px; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #DCE9FF, #0A84FF 55%, #1453A8 100%); flex-shrink: 0; box-shadow: 0 0 12px rgba(10,132,255,0.40); }
      .cc-insight .body { flex: 1; font-size: 13px; color: #fff; line-height: 1.4; }
      .cc-insight .h { color: #6BA9FF; font-size: 10px; letter-spacing: 0.10em; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }

      .cc-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .cc-tile { padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.04); cursor: pointer; transition: background 0.12s; }
      .cc-tile:active { background: rgba(255,255,255,0.06); }
      .cc-tile .lbl { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(235,235,245,0.55); font-weight: 600; }
      .cc-tile .val { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-top: 4px; font-variant-numeric: tabular-nums; }
      .cc-tile .delta { font-size: 11px; margin-top: 2px; font-weight: 600; }
      .cc-tile .delta.pos { color: #30D158; }
      .cc-tile .delta.neg { color: #FF453A; }
      .cc-tile.focus  { border-left: 3px solid #BF5AF2; }
      .cc-tile.health { border-left: 3px solid #30D158; }
      .cc-tile.mind   { border-left: 3px solid #B388FF; }
      .cc-tile.money  { border-left: 3px solid #FFD05C; }
    `;
    document.head.appendChild(s);
  }

  function build() {
    if (document.getElementById('coreCommandCenter')) return;
    ensureStyles();
    // Find the .scroll container on dashboard
    const scroll = document.querySelector('.scroll');
    if (!scroll) return;

    const block = document.createElement('div');
    block.id = 'coreCommandCenter';
    block.className = 'cc-block';
    block.innerHTML = `
      <div class="cc-insight" id="ccInsight">
        <div class="ai-orb"></div>
        <div class="body">
          <div class="h">AI insight</div>
          <span id="ccInsightText">Tap to get a personalized read on your week.</span>
        </div>
      </div>

      <div class="cc-section-h">
        <span>Today's tasks</span>
        <span class="right" onclick="window.location.href='34-tasks.html'">View all ›</span>
      </div>
      <div class="cc-list" id="ccTaskList"></div>

      <div class="cc-section-h"><span>Metrics</span></div>
      <div class="cc-metrics">
        <div class="cc-tile focus"  onclick="window.location.href='30-stat.html?s=brain'">
          <div class="lbl">Focus</div><div class="val" id="m-focus">—</div><div class="delta pos" id="m-focus-d"></div>
        </div>
        <div class="cc-tile health" onclick="window.location.href='30-stat.html?s=body'">
          <div class="lbl">Health</div><div class="val" id="m-health">—</div><div class="delta pos" id="m-health-d"></div>
        </div>
        <div class="cc-tile mind"   onclick="window.location.href='32-mind.html'">
          <div class="lbl">Mind</div><div class="val" id="m-mind">—</div><div class="delta pos" id="m-mind-d"></div>
        </div>
        <div class="cc-tile money"  onclick="window.location.href='30-stat.html?s=wallet'">
          <div class="lbl">Money</div><div class="val" id="m-money">—</div><div class="delta pos" id="m-money-d"></div>
        </div>
      </div>
    `;
    // Insert right after the build-routine-card if present, else top of scroll
    const buildCard = scroll.querySelector('.build-routine-card');
    if (buildCard) buildCard.after(block);
    else scroll.insertBefore(block, scroll.firstChild);

    paintTasks(); paintMetrics(); paintInsight();
    window.addEventListener('coreTaskComplete', paintTasks);
    window.addEventListener('coreTaskCreate',   paintTasks);
    window.addEventListener('coreStateChange',  paintMetrics);
  }

  function paintTasks() {
    if (!window.coreTasks) return setTimeout(paintTasks, 80);
    const top = coreTasks.list({ status: 'pending' }).slice(0, 3);
    const $list = document.getElementById('ccTaskList');
    if (!$list) return;
    if (!top.length) {
      $list.innerHTML = `<div class="cc-row" onclick="window.location.href='34-tasks.html'">
        <div class="cc-icon" style="background:rgba(10,132,255,0.18);"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>
        <div class="cc-body"><div class="cc-title">Add your first task</div><div class="cc-sub">Or take the deep intake for a full plan</div></div>
      </div>`;
      return;
    }
    const CATS = coreTasks.CATEGORIES;
    $list.innerHTML = top.map(t => {
      const c = CATS[t.category] || CATS.mind;
      return `<div class="cc-row" data-id="${t.id}">
        <div class="cc-icon" style="background:${c.color}22;"><svg viewBox="0 0 24 24"><path d="${c.icon}" stroke="${c.color}"/></svg></div>
        <div class="cc-body"><div class="cc-title">${escape(t.title)}</div><div class="cc-sub">${c.label} · +${t.xp} XP</div></div>
        <div class="cc-check" data-id="${t.id}"></div>
      </div>`;
    }).join('');
    $list.querySelectorAll('.cc-check').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const t = coreTasks.list().find(x => x.id === el.dataset.id);
        if (!t) return;
        if (t.proofRequired && window.coreProof) {
          coreProof.captureFor(t, (proof) => {
            if (proof && proof.verdict === 'fail') return;
            coreTasks.complete(t.id, proof);
          });
        } else {
          el.classList.add('done');
          setTimeout(() => coreTasks.complete(t.id), 280);
        }
      });
    });
    $list.querySelectorAll('.cc-row').forEach(row => row.addEventListener('click', () => { window.location.href = '34-tasks.html'; }));
  }

  function paintMetrics() {
    try {
      const s = JSON.parse(localStorage.getItem('coreState.v1') || '{}');
      const st = s.stats || {};
      put('m-focus',  st.brain);
      put('m-health', st.body);
      put('m-mind',   st.willpower);
      put('m-money',  st.wallet);
    } catch (e) {}
    function put(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = typeof val === 'number' ? val : '—';
    }
  }

  async function paintInsight() {
    const el = document.getElementById('ccInsightText');
    if (!el) return;
    // If we already cached today's insight, show it
    const today = new Date().toISOString().slice(0, 10);
    const cached = (() => { try { return JSON.parse(localStorage.getItem('coreInsight.' + today) || 'null'); } catch (e) { return null; } })();
    if (cached?.text) { el.textContent = cached.text; return; }
    if (!window.coreAI) return;
    // Lazy: generate insight on first paint of the day
    setTimeout(async () => {
      const r = await coreAI.chat([{
        role: 'user',
        content: 'Give me one line — a punchy honest read on my week. Reference one specific stat or pattern from my profile. Max 22 words.'
      }], { temperature: 0.6, maxTokens: 80 });
      const text = (r.text || '').trim();
      if (text) {
        el.textContent = text;
        try { localStorage.setItem('coreInsight.' + today, JSON.stringify({ text, ts: Date.now() })); } catch (e) {}
      }
    }, 600);
  }

  function escape(s){ return String(s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
