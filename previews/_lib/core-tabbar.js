/**
 * CoreTabbar — single source of truth for the bottom nav.
 *
 * Any page that wants the standard tab bar adds:
 *   <div class="tabbar" data-active="home"></div>
 * and includes this script. The script fills in the buttons + active state.
 *
 * data-active values: home | feed | coach | ranks | you
 *
 * If a page already has hand-rolled tab HTML, this script REPLACES the inner
 * children so visuals stay consistent app-wide.
 */
(function() {
  if (typeof window === 'undefined') return;

  // Full catalog — user picks 5 from this list. Default below.
  const ALL_TABS = [
    { key:'home',  label:'Home',  href:'dashboard.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>' },
    { key:'tasks', label:'Tasks', href:'34-tasks.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
    { key:'feed',  label:'Feed',  href:'feed.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>' },
    { key:'coach', label:'Coach', href:'coach.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12c0 5-4.5 8-9 8a9 9 0 0 1-3.5-.7L3 21l1.7-5.5A9 9 0 0 1 3 12c0-5 4.5-8 9-8s9 3 9 8z"/></svg>' },
    { key:'progress', label:'Progress', href:'45-ranks.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>' },
    { key:'ranks', label:'Ranks', href:'45-ranks.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l3-6 3 6 3-3 3 3v12H6z"/><path d="M2 21h20"/></svg>' },
    { key:'mind',  label:'Mind',  href:'32-mind.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C7 2 3 6 3 11c0 3 1 5 3 6v3l3-2c.7.2 1.5.3 2.4.3h.6c5 0 9-4 9-9s-4-9-9-9z"/></svg>' },
    { key:'you',   label:'You',   href:'profile.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>' },
    { key:'gym',   label:'Gym',   href:'gym.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="2" height="2"/><rect x="19" y="11" width="2" height="2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' },
    { key:'streak',label:'Streak',href:'streak-board.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3"/><path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5"/></svg>' },
    { key:'shop',  label:'Shop',  href:'58-shop.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18l-2 13H5L3 7z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>' },
    { key:'friends',label:'Friends',href:'find-friends.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M3 21c0-3 2-5 5-5"/><path d="M14 21c0-3 2-5 5-5"/></svg>' },
    { key:'goals', label:'Goals', href:'goal-set.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>' },
    { key:'habits',label:'Habits',href:'pick-habits.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
    { key:'activity',label:'Activity',href:'activity.html',
      svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
  ];
  const DEFAULT_PICK = ['home','tasks','coach','progress','you'];

  function readPick() {
    try {
      const raw = JSON.parse(localStorage.getItem('coreTabbarPick') || 'null');
      if (Array.isArray(raw) && raw.length === 5) return raw;
    } catch (e) {}
    return DEFAULT_PICK;
  }
  function writePick(arr) {
    try { localStorage.setItem('coreTabbarPick', JSON.stringify(arr)); } catch (e) {}
    render();
  }
  function getTabs() {
    const pick = readPick();
    return pick.map(k => ALL_TABS.find(t => t.key === k)).filter(Boolean);
  }
  const TABS = getTabs(); // legacy alias — render() re-reads

  function detectActive() {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    if (file.startsWith('dashboard')) return 'home';
    if (file.startsWith('tasks')) return 'tasks';
    if (file.startsWith('feed')) return 'feed';
    if (file.startsWith('coach')) return 'coach';
    if (file.startsWith('ranks') || file.startsWith('leaderboard')) return 'progress';
    if (file.startsWith('mind')) return 'mind';
    if (file.startsWith('profile') || file.startsWith('user-profile') || file.startsWith('achievements') || file.startsWith('activity')) return 'you';
    return '';
  }

  function ensureStyles() {
    if (document.getElementById('core-tabbar-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-tabbar-styles';
    s.textContent = `
      .tabbar.core-std {
        position: absolute; bottom: 0; left: 0; right: 0;
        padding: 10px 14px 28px;
        display: flex; justify-content: space-around; align-items: flex-end; gap: 4px;
        background: linear-gradient(180deg, transparent 0%, rgba(2,2,10,0.85) 35%, rgba(2,2,10,0.95) 100%);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        z-index: 50; border-top: 1px solid rgba(255,255,255,0.06);
      }
      body[data-theme="light"] .tabbar.core-std {
        background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.98) 100%);
        border-top: 1px solid rgba(20,22,36,0.10);
      }
      .tabbar.core-std .tb-btn {
        flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
        background: none; border: none; cursor: pointer; padding: 4px 0;
        font-family: inherit; color: #9AA1B7; transition: color .15s;
      }
      body[data-theme="light"] .tabbar.core-std .tb-btn { color: #4F5570; }
      .tabbar.core-std .tb-btn svg { width: 22px; height: 22px; display: block; }
      .tabbar.core-std .tb-btn .lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.02em; }
      .tabbar.core-std .tb-btn.active { color: #6BA9FF; }
      body[data-theme="light"] .tabbar.core-std .tb-btn.active { color: #1F6FE0; }
      .tabbar.core-std .tb-btn.active svg { filter: drop-shadow(0 0 6px #4A8FFF); }
      body[data-theme="light"] .tabbar.core-std .tb-btn.active svg { filter: drop-shadow(0 0 4px rgba(31,111,224,0.40)); }
    `;
    document.head.appendChild(s);
  }

  function render() {
    ensureStyles();
    const tabs = getTabs();
    const containers = document.querySelectorAll('.tabbar, .nav');
    containers.forEach(c => {
      c.classList.remove('nav');
      c.classList.add('tabbar');
      c.classList.add('core-std');
      const active = c.dataset.active || detectActive();
      c.innerHTML = tabs.map(t => {
        const isActive = t.key === active;
        return '<button class="tb-btn' + (isActive ? ' active' : '') + '"' +
          (isActive ? '' : ' onclick="window.location.href=\'' + t.href + '\'"') +
          ' aria-label="' + t.label + '">' +
          t.svg + '<span class="lbl">' + t.label + '</span>' +
        '</button>';
      }).join('');
      bindLongPress(c);
    });
  }

  // Long-press (700ms) on the tabbar opens the customize sheet
  function bindLongPress(c) {
    if (c.dataset.lpBound) return;
    c.dataset.lpBound = '1';
    let timer = null;
    function start() { clearTimeout(timer); timer = setTimeout(openEditor, 1000); }
    function cancel() { clearTimeout(timer); }
    c.addEventListener('touchstart', start, { passive: true });
    c.addEventListener('touchend',   cancel);
    c.addEventListener('touchmove',  cancel, { passive: true });
    c.addEventListener('mousedown',  start);
    c.addEventListener('mouseup',    cancel);
    c.addEventListener('mouseleave', cancel);
  }

  // ── Customize editor — pick 5 tabs from ALL_TABS ────────────────────
  function openEditor() {
    if (document.getElementById('coreTabEditorBack')) return;
    const back = document.createElement('div');
    back.id = 'coreTabEditorBack';
    back.style.cssText = 'position:fixed;inset:0;background:rgba(2,2,10,0.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9990;opacity:0;transition:opacity 0.2s;';
    document.body.appendChild(back);
    requestAnimationFrame(() => back.style.opacity = '1');

    const sheet = document.createElement('div');
    sheet.id = 'coreTabEditor';
    sheet.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:linear-gradient(180deg,#0a0a14,#02020A);border-top-left-radius:28px;border-top-right-radius:28px;border-top:1px solid rgba(255,255,255,0.08);padding:8px 22px calc(34px + env(safe-area-inset-bottom,0px));z-index:9999;max-height:82vh;overflow-y:auto;transform:translateY(110%);transition:transform 0.32s cubic-bezier(0.22,1,0.36,1);font-family:"Chakra Petch",-apple-system,sans-serif;';
    sheet.innerHTML = `
      <div style="width:36px;height:4px;border-radius:999px;background:rgba(255,255,255,0.20);margin:0 auto 14px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.3px;">Customize your tabs</div>
        <button id="coreTabDone" style="background:linear-gradient(180deg,#fff,#e8ecf4);color:#050510;border:none;border-radius:999px;padding:8px 16px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Done</button>
      </div>
      <div style="font-size:12px;color:#9AA1B7;margin-bottom:12px;">Tap to add or remove. Pick exactly 5 — they'll show in the order you tap.</div>
      <div id="coreTabCount" style="font-size:11px;letter-spacing:0.16em;color:#6BA9FF;text-transform:uppercase;font-weight:700;margin-bottom:10px;">0 / 5 selected</div>
      <div id="coreTabGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>
      <button id="coreTabReset" style="background:transparent;border:1px solid rgba(255,255,255,0.10);color:#9AA1B7;border-radius:14px;padding:12px;width:100%;margin-top:14px;font-family:inherit;font-size:13px;cursor:pointer;">Reset to default</button>
    `;
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.style.transform = 'translateY(0)');

    const grid = sheet.querySelector('#coreTabGrid');
    const countEl = sheet.querySelector('#coreTabCount');
    let pick = [...readPick()];
    function paint() {
      countEl.textContent = pick.length + ' / 5 selected' + (pick.length === 5 ? ' ✓' : '');
      grid.innerHTML = ALL_TABS.map(t => {
        const isOn = pick.includes(t.key);
        const idx = pick.indexOf(t.key);
        return `<div data-k="${t.key}" style="position:relative;padding:14px 12px;border-radius:14px;background:${isOn ? 'rgba(74,143,255,0.10)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isOn ? 'rgba(74,143,255,0.45)' : 'rgba(255,255,255,0.06)'};display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:background 0.15s;">
          ${isOn ? `<span style="position:absolute;top:6px;right:8px;font-size:10px;color:#6BA9FF;font-weight:700;">${idx + 1}</span>` : ''}
          <div style="width:24px;height:24px;color:${isOn ? '#6BA9FF' : '#9AA1B7'};">${t.svg}</div>
          <div style="font-size:12px;color:${isOn ? '#fff' : '#9AA1B7'};font-weight:600;">${t.label}</div>
        </div>`;
      }).join('');
      grid.querySelectorAll('[data-k]').forEach(el => {
        el.addEventListener('click', () => {
          const k = el.dataset.k;
          const i = pick.indexOf(k);
          if (i >= 0) pick.splice(i, 1);
          else if (pick.length < 5) pick.push(k);
          paint();
        });
      });
    }
    paint();

    function close() {
      sheet.style.transform = 'translateY(110%)';
      back.style.opacity = '0';
      setTimeout(() => { sheet.remove(); back.remove(); }, 320);
    }
    back.addEventListener('click', close);
    sheet.querySelector('#coreTabDone').addEventListener('click', () => {
      if (pick.length === 5) writePick(pick);
      close();
    });
    sheet.querySelector('#coreTabReset').addEventListener('click', () => {
      pick = [...DEFAULT_PICK];
      writePick(pick);
      paint();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
  window.CoreTabbar = { render, openEditor };
})();
