/**
 * CoreAvatar — shared profile-picture registry + DOM helpers.
 *
 *   coreAvatar.set('flow')        // save selection
 *   coreAvatar.current()          // → { key, name, c1, c2, glow, svg }
 *   coreAvatar.applyTo(el)        // sets background gradient + glow + injects SVG
 *   coreAvatar.gradient(key)      // string CSS gradient for inline style
 *
 * Storage key: localStorage.coreProfilePic = 'flow' (etc.)
 */
(function() {
  if (typeof window === 'undefined') return;

  const AVATARS = [
    { key:'core',   name:'Core',   cost: 0,   c1:'#7a7f8a', c2:'#111111', glow:'#aaaaaa',
      svg:'<circle cx="50" cy="50" r="28"/>' },
    { key:'rise',   name:'Rise',   cost: 50,  c1:'#ff9f2e', c2:'#6b2b00', glow:'#ff9f2e',
      svg:'<path d="M20 62h60v14H20zM50 18 78 55H22z"/>' },
    { key:'wave',   name:'Wave',   cost: 50,  c1:'#2dc7ff', c2:'#004477', glow:'#2dc7ff',
      svg:'<path d="M5 58c20-30 35-30 55 0 12 18 22 18 35 0v20c-20 18-40 18-58-4C26 61 18 61 5 78z"/>' },
    { key:'growth', name:'Growth', cost: 75,  c1:'#5dff62', c2:'#00551e', glow:'#5dff62',
      svg:'<path d="M50 82C30 60 22 34 22 20c20 4 32 18 28 42 4-24 8-38 28-42 0 14-8 40-28 62z"/>' },
    { key:'focus',  name:'Focus',  cost: 75,  c1:'#b35cff', c2:'#35006b', glow:'#b35cff',
      svg:'<path d="M50 8 62 38l30 12-30 12-12 30-12-30L8 50l30-12z"/>' },
    { key:'peak',   name:'Peak',   cost: 100, c1:'#ff4c9a', c2:'#62002d', glow:'#ff4c9a',
      svg:'<path d="M15 70 40 25l18 30 10-14 17 29z"/>' },
    { key:'orbit',  name:'Orbit',  cost: 100, c1:'#3af7f2', c2:'#005d66', glow:'#3af7f2',
      svg:'<path d="M50 10a40 40 0 1 0 0 80 20 20 0 1 1 0-40 20 20 0 1 0 0-40z"/>' },
    { key:'energy', name:'Energy', cost: 150, c1:'#ffd21f', c2:'#765200', glow:'#ffd21f',
      svg:'<path d="M55 5 25 56h23L40 95l35-56H52z"/>' },
    { key:'planet', name:'Planet', cost: 150, c1:'#8176ff', c2:'#130051', glow:'#8176ff',
      svg:'<ellipse cx="50" cy="55" rx="34" ry="16"/><circle cx="50" cy="45" r="22"/>' },
    { key:'flow',   name:'Flow',   cost: 200, c1:'#1ef2c8', c2:'#00473f', glow:'#1ef2c8',
      svg:'<path d="M50 10a40 40 0 1 0 40 40c0-18-14-30-30-30-18 0-28 12-28 24 0 10 8 18 18 18 8 0 14-6 14-14"/>' },
  ];
  const byKey = {};
  AVATARS.forEach(a => { byKey[a.key] = a; });

  function current() {
    let k = 'core';
    try { k = localStorage.getItem('coreProfilePic') || 'core'; } catch(e){}
    return byKey[k] || byKey.core;
  }
  // Color the user's name displayed anywhere in the app — pulled from their selected avatar
  function currentNameColor() {
    return current().c1;
  }
  // Ownership — which icons has this user paid for? Default = Core only.
  function owned() {
    try {
      const raw = JSON.parse(localStorage.getItem('coreIconsUnlocked') || 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch(e){}
    return ['core'];
  }
  function isOwned(key) { return owned().indexOf(key) >= 0; }
  function _setOwned(arr) {
    try { localStorage.setItem('coreIconsUnlocked', JSON.stringify(arr)); } catch(e){}
  }
  // Try to purchase a locked icon. Returns { ok, balance, needed } on insufficient funds.
  function buy(key) {
    const a = byKey[key];
    if (!a) return { ok: false, reason: 'unknown' };
    if (isOwned(key)) return { ok: true, alreadyOwned: true };
    if ((a.cost || 0) === 0) {
      const list = owned(); list.push(key); _setOwned(list);
      return { ok: true, free: true };
    }
    if (!window.coreState || typeof coreState.spendCoins !== 'function') return { ok: false, reason: 'no-coins' };
    const r = coreState.spendCoins(a.cost, 'buy_icon_' + key);
    if (!r.ok) return r;
    const list = owned(); list.push(key); _setOwned(list);
    // Auto-broadcast: small post in the user's feed announcing the unlock
    try {
      const posts = JSON.parse(localStorage.getItem('coreUserPosts') || '[]');
      posts.unshift({
        id: 'icon_' + Date.now(),
        ts: Date.now(),
        section: 'streaks',
        text: 'Unlocked the ' + a.name + ' profile icon.',
        score: { label: a.name + ' Icon', n: a.cost, unit: 'coins' },
        autoIconUnlock: true,
      });
      localStorage.setItem('coreUserPosts', JSON.stringify(posts));
    } catch(e){}
    return { ok: true, spent: a.cost };
  }
  function set(key) {
    if (!byKey[key]) return false;
    // Block setting an un-owned icon
    if (!isOwned(key)) return false;
    try { localStorage.setItem('coreProfilePic', key); } catch(e){}
    try { window.dispatchEvent(new CustomEvent('coreAvatarChange', { detail: { key } })); } catch(e){}
    return true;
  }
  function gradient(key) {
    const a = byKey[key] || byKey.core;
    return 'radial-gradient(circle at 35% 28%, ' + a.c1 + 'cc 0%, ' + a.c1 + ' 40%, ' + a.c2 + ' 100%)';
  }
  // Paint a circular avatar element: sets bg + glow + injects centered SVG of inner contents
  function applyTo(el, opts) {
    if (!el) return;
    const key = (opts && opts.key) || current().key;
    const a = byKey[key] || byKey.core;
    const showIcon = opts && opts.icon !== false; // default true
    el.style.background = 'radial-gradient(circle at 35% 28%, ' + a.c1 + ' 0%, ' + a.c1 + ' 35%, ' + a.c2 + ' 100%)';
    el.style.boxShadow = '0 0 18px ' + a.glow + '66';
    if (showIcon) {
      // Replace existing SVG (if any) with the avatar's icon
      let svg = el.querySelector('svg.__core-av');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', '__core-av');
        // Sized via CSS, leave to consumer for layout
        svg.style.width = '55%';
        svg.style.height = '55%';
        svg.style.display = 'block';
        svg.style.margin = 'auto';
        svg.style.position = 'absolute';
        svg.style.top = '50%';
        svg.style.left = '50%';
        svg.style.transform = 'translate(-50%, -50%)';
        svg.setAttribute('fill', '#fff');
        el.style.position = el.style.position || 'relative';
        el.appendChild(svg);
      }
      svg.innerHTML = a.svg;
    }
  }
  function list() { return AVATARS.slice(); }
  // Color any element holding the user's name, e.g. <span class="core-username">
  function colorNamesOnPage() {
    try {
      const c = currentNameColor();
      document.querySelectorAll('.core-username, [data-core-name]').forEach(el => {
        el.style.color = c;
        el.style.textShadow = '0 0 8px ' + c + '40';
      });
    } catch(e){}
  }
  // Auto-recolor names on avatar change
  window.addEventListener('coreAvatarChange', colorNamesOnPage);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', colorNamesOnPage);
  } else {
    colorNamesOnPage();
  }

  window.coreAvatar = { current, currentNameColor, set, gradient, applyTo, list, owned, isOwned, buy, colorNamesOnPage };
})();
