/* core-edit-mode.js
 *
 * Page-level widget reorder system. Two phases:
 *   1. Bootstrap — auto-tag known top-level widgets on each page with
 *      data-widget-id (idempotent). Each tagged element becomes a
 *      reorderable block.
 *   2. Edit mode — body[data-edit-mode] turns on dashed outlines + up/
 *      down arrow controls on each widget. Reorder swaps DOM siblings
 *      and persists the resulting order to coreLayout.{pageKey}.
 *
 * Saved order is re-applied on every page load. "Reset" wipes the
 * saved layout and reloads original DOM order.
 *
 * Pages handled by bootstrap (today):
 *   - dashboard.html: routine, checkin-card, hero-stage, coach-callout,
 *     life-mini, stats-list, week-card, actions, build-routine-card
 * Other pages can opt in by adding data-widget-id="…" themselves.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window._coreEditMode) return;
  window._coreEditMode = true;

  // ── Bootstrap: auto-tag known widgets per page ──────────────────────
  // Pairs of [selector inside .scroll, widget-id]. Sec-h headers that
  // precede a list are merged with their list so they move together.
  const BOOTSTRAP = {
    'dashboard.html': [
      ['.build-routine-card',                 'build-routine'],
      ['.routine',                            'routine',      { precedingHeader: true }],
      ['.checkin-card',                       'checkin'],
      ['.hero-stage',                         'hero'],
      ['.coach-callout',                      'coach-callout'],
      ['.life-mini',                          'life'],
      ['.stats-list',                         'stats',        { precedingHeader: true }],
      ['.week-card',                          'week'],
      ['.actions',                            'actions']
    ]
  };

  function pageKey() {
    return (location.pathname.split('/').pop() || '64-u-profile.html').toLowerCase();
  }

  function bootstrap() {
    const map = BOOTSTRAP[pageKey()];
    if (!map) return;
    map.forEach(([sel, id, opts]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      // If a preceding .sec-h is glued visually to this widget, wrap them
      // together so reorder treats them as one block.
      if (opts && opts.precedingHeader) {
        const prev = el.previousElementSibling;
        if (prev && prev.classList.contains('sec-h') && !prev.dataset.widgetId) {
          const wrap = document.createElement('div');
          wrap.dataset.widgetId = id;
          wrap.className = 'core-widget core-widget--grouped';
          el.parentNode.insertBefore(wrap, prev);
          wrap.appendChild(prev);
          wrap.appendChild(el);
          return;
        }
      }
      if (!el.dataset.widgetId) el.dataset.widgetId = id;
      el.classList.add('core-widget');
    });
  }

  // ── Layout persistence ──────────────────────────────────────────────
  function readLayout() {
    try { return JSON.parse(localStorage.getItem('coreLayout.' + pageKey()) || 'null'); } catch (e) { return null; }
  }
  function writeLayout(order) {
    try { localStorage.setItem('coreLayout.' + pageKey(), JSON.stringify(order)); } catch (e) {}
  }
  function clearLayout() {
    try { localStorage.removeItem('coreLayout.' + pageKey()); } catch (e) {}
  }

  function applyLayout() {
    const order = readLayout();
    if (!order || !order.length) return;
    const widgets = Array.from(document.querySelectorAll('[data-widget-id]'));
    if (!widgets.length) return;
    const parent = widgets[0].parentNode;
    const byId = {};
    widgets.forEach(w => byId[w.dataset.widgetId] = w);
    order.forEach(id => { if (byId[id]) parent.appendChild(byId[id]); });
  }

  // ── Styles ──────────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('core-edit-mode-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-edit-mode-styles';
    s.textContent = `
      body[data-edit-mode="1"] .core-widget {
        position: relative;
        outline: 1.5px dashed rgba(74,143,255,0.55);
        outline-offset: 4px;
        border-radius: 14px;
        animation: coreEditPulse 1.8s ease-in-out infinite;
      }
      @keyframes coreEditPulse {
        0%,100% { outline-color: rgba(74,143,255,0.45); }
        50%     { outline-color: rgba(107,169,255,0.85); }
      }
      body[data-edit-mode="1"] .core-widget > .core-edit-handle {
        position: absolute; top: -10px; right: -10px; z-index: 50;
        display: inline-flex; gap: 4px;
        background: rgba(2,2,10,0.94); border: 1px solid rgba(74,143,255,0.50);
        border-radius: 999px; padding: 4px 6px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.55), 0 0 18px rgba(74,143,255,0.30);
      }
      body[data-edit-mode="1"] .core-edit-handle button {
        background: rgba(74,143,255,0.15); border: none; border-radius: 50%;
        width: 26px; height: 26px; color: #6BA9FF;
        font-size: 14px; font-weight: 700; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      body[data-edit-mode="1"] .core-edit-handle button:active {
        background: rgba(74,143,255,0.30);
      }
      body[data-edit-mode="1"] .core-widget * { pointer-events: none; }
      body[data-edit-mode="1"] .core-widget .core-edit-handle,
      body[data-edit-mode="1"] .core-widget .core-edit-handle * { pointer-events: auto; }
      .core-edit-bar {
        position: fixed; left: 50%; transform: translateX(-50%);
        top: 14px; z-index: 9995;
        display: flex; align-items: center; gap: 8px;
        padding: 10px 14px; border-radius: 999px;
        background: rgba(2,2,10,0.94);
        border: 1px solid rgba(74,143,255,0.50);
        box-shadow: 0 14px 36px rgba(0,0,0,0.55), 0 0 30px rgba(74,143,255,0.25);
        font-family: 'Chakra Petch', -apple-system, sans-serif;
        font-size: 13px; color: #fff; font-weight: 600;
      }
      .core-edit-bar .ce-pill {
        font-size: 10px; letter-spacing: 0.18em; color: #6BA9FF;
        text-transform: uppercase; font-weight: 700;
      }
      .core-edit-bar .ce-btn {
        background: transparent; border: none; color: #9AA1B7;
        font-family: inherit; font-size: 12px; font-weight: 700;
        cursor: pointer; padding: 4px 8px; border-radius: 999px;
      }
      .core-edit-bar .ce-btn.primary {
        background: linear-gradient(180deg, #fff, #e8ecf4);
        color: #050510;
      }
      .core-edit-bar .ce-btn.danger { color: #FCA5A5; }
    `;
    document.head.appendChild(s);
  }

  // ── Edit-mode controls ──────────────────────────────────────────────
  function addHandles() {
    document.querySelectorAll('[data-widget-id]').forEach(w => {
      if (w.querySelector(':scope > .core-edit-handle')) return;
      const h = document.createElement('div');
      h.className = 'core-edit-handle';
      h.innerHTML = '<button data-dir="up" aria-label="Move up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button><button data-dir="down" aria-label="Move down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>';
      w.appendChild(h);
      h.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          move(w, b.dataset.dir);
        });
      });
    });
  }
  function removeHandles() {
    document.querySelectorAll('.core-edit-handle').forEach(el => el.remove());
  }

  function move(w, dir) {
    const parent = w.parentNode;
    if (dir === 'up' && w.previousElementSibling && w.previousElementSibling.matches('[data-widget-id]')) {
      parent.insertBefore(w, w.previousElementSibling);
    } else if (dir === 'down' && w.nextElementSibling && w.nextElementSibling.matches('[data-widget-id]')) {
      parent.insertBefore(w.nextElementSibling, w);
    }
    saveCurrentOrder();
  }

  function saveCurrentOrder() {
    const order = Array.from(document.querySelectorAll('[data-widget-id]')).map(w => w.dataset.widgetId);
    writeLayout(order);
  }

  let bar = null;
  function showBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'core-edit-bar';
    bar.innerHTML = `
      <span class="ce-pill">Edit page</span>
      <button class="ce-btn danger" id="ceReset">Reset</button>
      <button class="ce-btn primary" id="ceDone">Done</button>
    `;
    document.body.appendChild(bar);
    bar.querySelector('#ceDone').addEventListener('click', exit);
    bar.querySelector('#ceReset').addEventListener('click', () => {
      clearLayout();
      location.reload();
    });
  }
  function hideBar() { if (bar) { bar.remove(); bar = null; } }

  function enter() {
    ensureStyles();
    if (!document.querySelector('[data-widget-id]')) {
      // No widgets on this page — show a quick hint
      alert("This page doesn't have customisable widgets yet. The dashboard is fully supported.");
      return;
    }
    document.body.setAttribute('data-edit-mode', '1');
    addHandles();
    showBar();
  }
  function exit() {
    document.body.removeAttribute('data-edit-mode');
    removeHandles();
    hideBar();
  }

  // Init: bootstrap + apply saved layout on load
  function init() {
    ensureStyles();
    bootstrap();
    applyLayout();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.coreEditMode = { enter, exit, reset: () => { clearLayout(); location.reload(); } };
})();
