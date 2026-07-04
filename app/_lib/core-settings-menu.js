/* core-settings-menu.js
 *
 * One settings dropdown the whole app shares. Auto-binds to every icon
 * with aria-label="Settings" (the cog icon convention used across pages)
 * and injects:
 *   - User chip: avatar orb + name + rank · XP · coins · freezes
 *   - Quick navigation rows to every meaningful destination
 *   - Switch account row (preview-stub for now)
 *   - What's new (release notes)
 *   - Sign out (red)
 *
 * Inject CSS + DOM lazily on first cog tap so unused pages stay light.
 */
(function() {
  if (typeof window === 'undefined') return;
  if (window._coreSettingsMenu) return;
  window._coreSettingsMenu = true;

  // ── 1. Inject styles once ─────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('core-settings-menu-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-settings-menu-styles';
    s.textContent = `
      .core-menu-back {
        position: fixed; inset: 0; z-index: 9990;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .core-menu-back.on { opacity: 1; pointer-events: auto; }
      .core-menu {
        position: fixed; z-index: 9999;
        width: 240px; max-width: calc(100vw - 24px); padding: 6px;
        background: rgba(20, 22, 36, 0.96);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
        box-shadow: 0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 32px rgba(74,143,255,0.10);
        opacity: 0; transform: translateY(-8px) scale(0.96); transform-origin: top right;
        pointer-events: none;
        transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1), transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        max-height: 80vh; overflow-y: auto;
      }
      .core-menu::-webkit-scrollbar { display: none; }
      .core-menu.on { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
      .core-menu .cm-user {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 4px;
      }
      .core-menu .cm-user-av {
        width: 36px; height: 36px; border-radius: 50%;
        background: radial-gradient(circle at 35% 28%, #DCE9FF, #4A8FFF 55%, #1453A8 100%);
        box-shadow: 0 0 14px rgba(74,143,255,0.5);
        flex-shrink: 0;
      }
      .core-menu .cm-user-info { flex: 1; min-width: 0; }
      .core-menu .cm-user-name { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.1px; }
      .core-menu .cm-user-meta { font-size: 11px; color: #9AA1B7; margin-top: 2px; }
      .core-menu .cm-user-chips { display: flex; gap: 6px; margin-top: 6px; }
      .core-menu .cm-chip {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 8px; border-radius: 999px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
        font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #fff;
      }
      .core-menu .cm-chip.gold { background: rgba(255,200,87,0.10); border-color: rgba(255,200,87,0.32); color: #FFD05C; }
      .core-menu .cm-chip.blue { background: rgba(74,143,255,0.10); border-color: rgba(74,143,255,0.32); color: #6BA9FF; }
      .core-menu .cm-chip svg { width: 10px; height: 10px; stroke: currentColor; fill: none; stroke-width: 2; }
      .core-menu .cm-section {
        font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase;
        color: #4F5570; font-weight: 700; padding: 8px 12px 4px;
      }
      .core-menu .cm-row {
        display: flex; align-items: center; gap: 12px;
        padding: 9px 12px; border-radius: 10px;
        color: #fff; font-size: 13.5px; font-weight: 500; letter-spacing: -0.1px;
        cursor: pointer; transition: background 0.12s;
      }
      .core-menu .cm-row:hover { background: rgba(255,255,255,0.06); }
      .core-menu .cm-row svg {
        width: 16px; height: 16px; stroke: #6BA9FF; fill: none;
        stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0;
      }
      .core-menu .cm-row .lbl { flex: 1; min-width: 0; }
      .core-menu .cm-row .badge { font-size: 10px; color: #6BA9FF; font-weight: 700; }
      .core-menu .cm-row .chev { color: #4F5570; font-size: 14px; }
      .core-menu .cm-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 6px; }
      .core-menu .cm-row.danger { color: #FCA5A5; }
      .core-menu .cm-row.danger svg { stroke: #FCA5A5; }
      .core-menu .cm-row.danger:hover { background: rgba(248,113,113,0.10); }
    `;
    document.head.appendChild(s);
  }

  // ── 2. Build the menu DOM ─────────────────────────────────────────────
  // Icons inlined as SVG paths for the lucide-style 1.8 stroke
  const I = {
    user:    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    bell:    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    trophy:  '<path d="M6 9V4h12v5a6 6 0 0 1-12 0z"/><path d="M6 4H3v3a3 3 0 0 0 3 3"/><path d="M18 4h3v3a3 3 0 0 1-3 3"/><path d="M9 19h6"/><path d="M12 15v4"/>',
    rank:    '<path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z"/>',
    coin:    '<circle cx="12" cy="12" r="9"/><path d="M9 9h6M9 12h6M9 15h6"/>',
    shop:    '<path d="M3 7h18l-2 13H5L3 7z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
    cog:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    cal:     '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    review:  '<path d="M3 5h14a4 4 0 0 1 0 8H8l-5 4z"/>',
    activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    grid:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    target:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    flame:   '<path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3"/><path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5"/>',
    friends: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M3 21c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M14 21c.3-3 2-5 5-5s5 2 5 5"/>',
    leader:  '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/>',
    invite:  '<path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="9"/>',
    panic:   '<path d="M12 2l10 18H2z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/>',
    help:    '<circle cx="12" cy="12" r="9"/><path d="M10 9c0-2 1.5-3 2.5-3s2.5 1 2.5 3-3 2-3 4"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/>',
    swap:    '<path d="M17 3l4 4-4 4"/><path d="M21 7H7a4 4 0 0 0-4 4"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h14a4 4 0 0 0 4-4"/>',
    sparkle: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2"/>',
    out:     '<path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/>',
    layout:  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    theme:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
    edit:    '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M14.06 6.19l3.75 3.75L20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L14.06 6.19z"/>',
  };

  function row(icon, label, href, opts) {
    opts = opts || {};
    const cls = opts.danger ? 'cm-row danger' : 'cm-row';
    const badge = opts.badge ? `<span class="badge">${opts.badge}</span>` : '';
    return `<div class="${cls}" data-href="${href || ''}" data-action="${opts.action || ''}">
      <svg viewBox="0 0 24 24">${icon}</svg>
      <span class="lbl">${label}</span>
      ${badge}
      ${opts.danger ? '' : '<span class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-2px"><path d="M9 6l6 6-6 6"/></svg></span>'}
    </div>`;
  }

  function buildMenu() {
    let menu = document.getElementById('coreSettingsMenu');
    if (menu) return menu;
    const back = document.createElement('div');
    back.className = 'core-menu-back'; back.id = 'coreSettingsMenuBack';
    document.body.appendChild(back);

    menu = document.createElement('div');
    menu.className = 'core-menu'; menu.id = 'coreSettingsMenu';
    menu.setAttribute('role', 'menu');
    // Compact essentials list (always visible) + everything else hidden under "More"
    menu.innerHTML = `
      <div class="cm-user">
        <div class="cm-user-av"></div>
        <div class="cm-user-info">
          <div class="cm-user-name" id="cmName">Stone</div>
          <div class="cm-user-meta" id="cmMeta">Silver · 1,140 XP</div>
          <div class="cm-user-chips">
            <span class="cm-chip gold" id="cmCoins"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg> 240</span>
            <span class="cm-chip blue" id="cmFreezes"><svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5"/></svg> 1/1</span>
          </div>
        </div>
      </div>

      <!-- Essentials — always visible -->
      ${row(I.user,    'Profile',          'profile.html')}
      ${row(I.bell,    'Notifications',    'notifications-settings.html')}
      ${row(I.shop,    'Shop',             'shop.html')}
      ${row(I.cog,     'Settings',         'settings.html')}

      <!-- More-toggle row -->
      <div class="cm-row" id="cmMoreToggle">
        <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/></svg>
        <span class="lbl">More</span>
        <span class="chev" id="cmMoreChev">▾</span>
      </div>
      <div class="cm-more" id="cmMore" style="display:none;">
        <div class="cm-section">You</div>
        ${row(I.trophy,  'Achievements',     'achievements.html')}
        ${row(I.rank,    'Ranks',            'ranks.html')}
        ${row(I.activity,'Activity log',     'activity.html')}
        <div class="cm-section">Routine</div>
        ${row(I.cal,     'Streak board',     'streak-board.html')}
        ${row(I.review,  'Weekly review',    'weekly-review.html')}
        ${row(I.target,  'Goals',            'goal-set.html')}
        ${row(I.flame,   'Your habits',      'pick-habits.html')}
        <div class="cm-section">Social</div>
        ${row(I.friends, 'Friends',          'find-friends.html')}
        ${row(I.leader,  'Leaderboard',      'leaderboard.html')}
        ${row(I.invite,  'Invite friends',   'invite.html')}
        <div class="cm-section">Wallet</div>
        ${row(I.coin,    'Coin history',     'coin-history.html')}
        <div class="cm-section">Layout</div>
        ${row(I.layout,  'Customize tab bar', '', { action: 'tabbar' })}
        ${row(I.edit,    'Edit page',         '', { action: 'editpage' })}
        ${row(I.theme,   'Theme',             '', { action: 'theme' })}
      </div>

      <div class="cm-divider"></div>
      ${row(I.sparkle, "What's new",       '', { badge: 'NEW', action: 'whatsnew' })}
      ${row(I.help,    'Help & legal',     'legal.html')}
      ${row(I.panic,   'Crisis support',   'crisis.html', { danger: true })}

      <div class="cm-divider"></div>
      ${row(I.swap,    'Switch account',   '', { action: 'switch' })}
      ${row(I.out,     'Sign out',         '', { danger: true, action: 'signout' })}
    `;
    document.body.appendChild(menu);

    // Wire the More toggle (chevron rotates, sub-list slides open)
    const moreToggle = menu.querySelector('#cmMoreToggle');
    const more = menu.querySelector('#cmMore');
    const chev = menu.querySelector('#cmMoreChev');
    moreToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = more.style.display !== 'none';
      more.style.display = isOpen ? 'none' : 'block';
      chev.textContent = isOpen ? '▾' : '▴';
    });

    // Wire row clicks
    menu.querySelectorAll('.cm-row').forEach(r => {
      r.addEventListener('click', (e) => {
        e.stopPropagation();
        const href = r.dataset.href;
        const action = r.dataset.action;
        closeMenu();
        if (action === 'signout') {
          try {
            localStorage.removeItem('coreOnboardComplete');
            localStorage.removeItem('coreOnboardTrial');
          } catch (e) {}
          try { if (window.coreTrack) coreTrack('sign_out', {}); } catch (e) {}
          window.location.href = '04-sign-in.html';
        } else if (action === 'switch') {
          // Preview stub — would open a real account picker. For now,
          // sign out + route to sign-in so user can pick a different identity.
          try { if (window.coreTrack) coreTrack('switch_account', {}); } catch (e) {}
          window.location.href = '04-sign-in.html';
        } else if (action === 'theme') {
          // Theme toggle disabled until light theme is properly designed.
          // Force dark + clear any stale stored preference.
          try { localStorage.removeItem('coreTheme'); } catch (e) {}
          document.body.setAttribute('data-theme', 'dark');
        } else if (action === 'editpage') {
          try {
            if (window.coreEditMode && window.coreEditMode.enter) {
              window.coreEditMode.enter();
            } else {
              const s = document.createElement('script');
              s.src = 'core-edit-mode.js';
              s.onload = () => window.coreEditMode && window.coreEditMode.enter && window.coreEditMode.enter();
              document.head.appendChild(s);
            }
          } catch (e) {}
        } else if (action === 'tabbar') {
          try {
            if (window.CoreTabbar && window.CoreTabbar.openEditor) {
              window.CoreTabbar.openEditor();
            } else {
              const s = document.createElement('script');
              s.src = 'core-tabbar.js';
              s.onload = () => window.CoreTabbar && window.CoreTabbar.openEditor && window.CoreTabbar.openEditor();
              document.head.appendChild(s);
            }
          } catch (e) {}
        } else if (action === 'whatsnew') {
          // Preview stub — show a simple alert with version notes
          alert("What's new in CORE v0.5 · Daily check-in awards +50 XP. Tap-to-complete routine rows. Edit your routine inline. Perfect-week bonus +100 XP. New settings menu.");
        } else if (href) {
          window.location.href = href;
        }
      });
    });
    back.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    return menu;
  }

  // ── 3. Position the menu under the cog ────────────────────────────────
  function positionMenu(cog) {
    const menu = document.getElementById('coreSettingsMenu');
    if (!menu || !cog) return;
    const rect = cog.getBoundingClientRect();
    const top = rect.bottom + 8;
    // Anchor right edge to cog right edge but keep within viewport
    const right = Math.max(8, window.innerWidth - rect.right);
    menu.style.top = top + 'px';
    menu.style.right = right + 'px';
    menu.style.left = 'auto';
  }

  // ── 4. Open / close ──────────────────────────────────────────────────
  function openMenu(cog) {
    const menu = buildMenu();
    const back = document.getElementById('coreSettingsMenuBack');
    populate();
    positionMenu(cog);
    menu.classList.add('on');
    back.classList.add('on');
    menu.setAttribute('aria-hidden', 'false');
    if (cog) cog.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    const menu = document.getElementById('coreSettingsMenu');
    const back = document.getElementById('coreSettingsMenuBack');
    if (menu) { menu.classList.remove('on'); menu.setAttribute('aria-hidden', 'true'); }
    if (back) back.classList.remove('on');
    document.querySelectorAll('[aria-expanded][aria-label="Settings"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
  }

  // ── 5. Populate live user info ────────────────────────────────────────
  function populate() {
    try {
      const t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}');
      const s = (window.coreState && coreState.read()) || {};
      const rank = (window.coreState && coreState.rankFor) ? coreState.rankFor(s.xp || 0) : null;
      const nameEl  = document.getElementById('cmName');
      const metaEl  = document.getElementById('cmMeta');
      const coinsEl = document.getElementById('cmCoins');
      const freezeEl = document.getElementById('cmFreezes');
      if (nameEl && t.name) nameEl.textContent = t.name;
      if (metaEl) {
        metaEl.textContent = rank
          ? rank.name + ' · ' + (s.xp || 0).toLocaleString() + ' XP'
          : 'Member';
      }
      if (coinsEl) coinsEl.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg> ' + ((s.coins || 0).toLocaleString());
      if (freezeEl) {
        const avail = (s.streak && s.streak.freezes && s.streak.freezes.availableThisWeek) || 0;
        const max   = (s.streak && s.streak.freezes && s.streak.freezes.maxPerWeek) || 1;
        freezeEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5"/></svg> ' + avail + '/' + max;
      }
    } catch (e) {}
  }

  // ── 6. Bind every Settings cog on the page ────────────────────────────
  function bindCogs() {
    ensureStyles();
    document.querySelectorAll('[aria-label="Settings"], [data-core-settings]').forEach(cog => {
      if (cog.dataset.coreSettingsBound) return;
      cog.dataset.coreSettingsBound = '1';
      cog.setAttribute('aria-haspopup', 'true');
      cog.setAttribute('aria-expanded', 'false');
      cog.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('coreSettingsMenu');
        if (menu && menu.classList.contains('on')) closeMenu();
        else openMenu(cog);
      });
    });
  }

  // Re-position on scroll/resize so the menu sticks under its cog
  window.addEventListener('resize', () => {
    const open = document.querySelector('.core-menu.on');
    if (open) {
      const cog = document.querySelector('[aria-expanded="true"][aria-label="Settings"]');
      if (cog) positionMenu(cog);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCogs);
  } else {
    bindCogs();
  }
  // Re-bind whenever DOM changes (e.g., core-header.js injects later)
  const obs = new MutationObserver(() => bindCogs());
  obs.observe(document.body, { childList: true, subtree: true });

  // Expose so pages can manually open if needed
  window.coreSettingsMenu = { open: openMenu, close: closeMenu, populate };
})();
