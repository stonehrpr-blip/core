/**
 * core-dev.js — floating QA panel, only visible with ?dev=1.
 *
 * Bundles the dev-only toggles that were scattered across pages: CORE Plus,
 * grant coins/XP, jump rank, expire Plus, reset. Reads window.coreState.
 * Safe to include anywhere — it does nothing unless the URL has ?dev=1.
 */
(function () {
  if (typeof window === 'undefined') return;
  try { if (!/[?&]dev=1/.test(location.search)) return; } catch (e) { return; }
  if (window.__coreDevPanel) return; window.__coreDevPanel = true;

  function boot() {
    var S = window.coreState; if (!S) { return setTimeout(boot, 200); }
    var refresh = function () {
      try { S.syncProgress(); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('coreStateChange', { detail: S.read() })); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('core:progress-updated', { detail: { source: 'dev' } })); } catch (e) {}
    };
    var plusOn = function () { try { return S.corePlusActive && S.corePlusActive(); } catch (e) { return false; } };

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:99999;font:600 12px -apple-system,system-ui,sans-serif';
    var panel = document.createElement('div');
    panel.style.cssText = 'display:none;flex-direction:column;gap:6px;margin-bottom:8px;padding:10px;border-radius:14px;background:rgba(14,16,24,0.96);border:1px solid rgba(255,255,255,0.12);box-shadow:0 12px 34px rgba(0,0,0,0.5);min-width:168px';

    function btn(label, fn) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'text-align:left;padding:9px 11px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#F8FAFE;font:inherit;cursor:pointer';
      b.onmousedown = function (e) { e.preventDefault(); };
      b.addEventListener('click', function () { try { fn(b); } catch (e) {} refresh(); });
      panel.appendChild(b); return b;
    }

    var plusBtn = btn('', function (b) {
      var on = !plusOn(); S.setCorePlus(on);
      var em = location.search.match(/expire=(\d+)/);
      if (on && em) { try { localStorage.setItem('corePlusUntil', String(Date.now() + parseInt(em[1], 10) * 86400000)); } catch (e) {} }
    });
    var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;"><path d="M5 12l4 4 10-11"/></svg>';
    function paintPlus() { plusBtn.innerHTML = (plusOn() ? CHECK_SVG + 'CORE Plus ON' : 'CORE Plus OFF'); }
    paintPlus();
    var _r = refresh; refresh = function () { _r(); paintPlus(); };

    btn('+500 coins', function () { S.earnCoins && S.earnCoins(500, 'dev'); });
    btn('+1000 XP', function () { S.addXp && S.addXp(1000, 'dev'); });
    btn('Jump to next rank', function () {
      try { var xp = S.read().xp || 0, r = S.rankFor(xp), nx = (S.RANKS || [])[r.idx + 1]; if (nx) S.addXp(nx.min - xp + 1, 'dev:rankjump'); } catch (e) {}
    });
    btn('Expire Plus -> 2 days', function () { try { localStorage.setItem('corePlusUntil', String(Date.now() + 2 * 86400000)); } catch (e) {} });
    btn('Grant Epic chest', function () { try { var o = JSON.parse(localStorage.getItem('coreOwnedChests') || '[]'); (Array.isArray(o) ? o : []).push('chest_epic'); localStorage.setItem('coreOwnedChests', JSON.stringify(o)); } catch (e) {} });
    btn('Reset all', function () { try { S.resetAll(); ['corePlusActive', 'corePlusUntil', 'corePlusNextChestAt', 'coreFreeChestNextAt', 'coreDashChestDay', 'coreOwnedChests', 'coreOwnedShopItems', 'coreProfileTheme', 'coreProfileTitle'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} });

    var fab = document.createElement('button');
    fab.textContent = 'DEV';
    fab.style.cssText = 'padding:9px 14px;border-radius:999px;border:1px solid rgba(120,140,255,0.5);background:linear-gradient(135deg,#4A8FFF,#B388FF);color:#fff;font:800 12px -apple-system,system-ui,sans-serif;letter-spacing:.1em;cursor:pointer;box-shadow:0 8px 22px rgba(74,143,255,0.4)';
    fab.addEventListener('click', function () { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; });

    wrap.appendChild(panel); wrap.appendChild(fab); document.body.appendChild(wrap);
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
