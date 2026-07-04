/**
 * CoreHeader — renders the standard right-side header chips:
 *   [Coin · 240] [Bell] [Settings]
 *
 * Use by placing:
 *   <div class="core-header-actions" data-show="coins,bell,settings"></div>
 * and including this script.
 *
 * `data-show` is comma-separated, in render order. Defaults to all three.
 * Visible chip set adapts per page (e.g., omit coins on coach).
 */
(function() {
  if (typeof window === 'undefined') return;

  function ensureStyles() {
    if (document.getElementById('core-header-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-header-styles';
    s.textContent = `
      .core-header-actions { display:flex; align-items:center; gap:8px; }
      .core-header-actions .ch-chip {
        padding:5px 10px; border-radius:999px;
        background: rgba(255,208,92,0.10); border:1px solid rgba(255,208,92,0.34);
        color:#FFD56E; font-size:11px; font-weight:700; letter-spacing:-0.1px;
        cursor:pointer; display:inline-flex; align-items:center; gap:5px;
      }
      .core-header-actions .ch-chip svg { width:11px; height:11px; stroke:#FFD56E; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
      .core-header-actions .ch-icon-btn {
        width:36px; height:36px; border-radius:50%;
        background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10);
        display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative;
      }
      .core-header-actions .ch-icon-btn svg { width:16px; height:16px; stroke:#F8FAFE; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
      .core-header-actions .ch-icon-btn .ch-badge {
        position:absolute; top:7px; right:7px; width:8px; height:8px; border-radius:50%;
        background:#FF4F6B; box-shadow:0 0 6px #FF4F6B; border:1.5px solid #02020A;
      }
    `;
    document.head.appendChild(s);
  }

  function render() {
    ensureStyles();
    document.querySelectorAll('.core-header-actions').forEach(host => {
      // Skip if already rendered (so pages with custom chips still inside aren't clobbered)
      if (host.__chRendered) return;
      host.__chRendered = true;
      const showRaw = host.dataset.show || 'coins,bell,settings';
      const show = showRaw.split(',').map(s => s.trim()).filter(Boolean);
      let coins = 0;
      try { coins = (window.coreState && coreState.read().coins) || 0; } catch(e){}
      const parts = show.map(key => {
        if (key === 'coins') return (
          '<div class="ch-chip" onclick="window.location.href=\'58-shop.html\'" title="Coins · tap for Shop">' +
            '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M14 9.5C14 8.5 13 7.5 12 7.5S10 8.5 10 9.5s.5 1.5 2 1.5 2 .5 2 1.5-1 1.5-2 1.5-2-1-2-1.5"/><path d="M12 6v1.5M12 15v1.5"/></svg>' +
            '<span data-core="coins">' + coins + '</span>' +
          '</div>'
        );
        if (key === 'bell') return (
          '<div class="ch-icon-btn" onclick="window.location.href=\'71-notifications.html\'" aria-label="Notifications">' +
            '<svg viewBox="0 0 24 24"><path d="M18 16V11a6 6 0 0 0-12 0v5l-2 3h16z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>' +
            '<span class="ch-badge"></span>' +
          '</div>'
        );
        if (key === 'settings') return (
          '<div class="ch-icon-btn" onclick="window.location.href=\'80-settings.html\'" aria-label="Settings">' +
            '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
          '</div>'
        );
        if (key === 'rank') {
          let label = 'Iron', color = '#9aa0aa';
          try { const s = coreState.read(); const r = coreState.rankFor(s.xp || 0); if (r) { label = r.name; color = r.color; } } catch(e){}
          return (
            '<div class="ch-chip" style="background: rgba(74,143,255,0.10); border-color: rgba(74,143,255,0.32); color:' + color + ';" onclick="window.location.href=\'45-ranks.html\'">' +
              '<span data-core="rank.label">' + label + '</span>' +
            '</div>'
          );
        }
        return '';
      });
      host.innerHTML = parts.join('');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
  window.CoreHeader = { render };
})();
