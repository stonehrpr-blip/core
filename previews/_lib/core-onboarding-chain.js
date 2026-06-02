// Core onboarding chain — injects a "Continue →" CTA on pages that are part
// of the post-trial moment chain when `coreOnboardingChain === '1'`. When the
// chain flag is absent, the script is a no-op and the page behaves normally.
//
// Chain order (must match finishOnboarding's redirect):
//   trial pay → projection-90 → cost-saved → rating-ask
//   → rank-reveal → leaderboard → find-friends → permissions → dashboard
//
// Each page knows its OWN key via `window.CORE_CHAIN_KEY` set before this
// script loads, OR auto-detected from the current pathname.

(function () {
  try {
    if (localStorage.getItem('coreOnboardingChain') !== '1') return;
  } catch (e) { return; }

  const ORDER = [
    { key: 'projection-90', next: './17-cost-saved.html' },
    { key: 'cost-saved',    next: './18-rating-ask.html' },
    { key: 'rating-ask',    next: '19-rank-reveal.html' },
    { key: 'rank-reveal',   next: '66-leaderboard.html' },
    { key: 'leaderboard',   next: '67-find-friends.html' },
    { key: 'find-friends',  next: '15-permissions.html' },
    { key: 'permissions',   next: '20-dashboard.html', isLast: true },
  ];

  function detectKey() {
    if (window.CORE_CHAIN_KEY) return window.CORE_CHAIN_KEY;
    const path = location.pathname.split('/').pop().replace('.html','');
    if (path.includes('rank-reveal')  || path === '37-rank-reveal') return 'rank-reveal';
    if (path.includes('leaderboard') || path === '19-leaderboard') return 'leaderboard';
    if (path.includes('find-friends') || path === '55-find-friends') return 'find-friends';
    if (path.includes('permissions')  || path === '12-permissions') return 'permissions';
    if (path.includes('projection'))  return 'projection-90';
    if (path.includes('cost-saved'))  return 'cost-saved';
    if (path.includes('rating'))      return 'rating-ask';
    return null;
  }

  const key = detectKey();
  if (!key) return;
  const entry = ORDER.find(e => e.key === key);
  if (!entry) return;

  // Pages that already define their own primary continue CTA (rating-ask,
  // projection-90, cost-saved) — we skip injecting a duplicate. They route
  // forward correctly on their own.
  const SELF_ROUTED = new Set(['projection-90','cost-saved','rating-ask']);
  if (SELF_ROUTED.has(key)) return;

  function buildCTA() {
    if (document.getElementById('coreChainCta')) return;
    const css = document.createElement('style');
    css.textContent =
      '#coreChainCta{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;}' +
      '#coreChainCta button{pointer-events:auto;padding:16px 28px;border-radius:999px;border:none;cursor:pointer;font-family:inherit;font-size:16px;font-weight:700;letter-spacing:-0.3px;color:#fff;background:linear-gradient(135deg,#2F8FFF 0%,#6F70FF 50%,#B388FF 100%);background-size:200% 200%;animation:coreChainShift 5s ease infinite;box-shadow:0 14px 36px rgba(47,143,255,0.45),0 0 0 1px rgba(255,255,255,0.20) inset,0 1px 0 rgba(255,255,255,0.35) inset;display:flex;align-items:center;gap:8px;transition:transform .12s,filter .2s;min-width:220px;justify-content:center;}' +
      '#coreChainCta button:hover{filter:brightness(1.05);}' +
      '#coreChainCta button:active{transform:scale(0.97);}' +
      '#coreChainCta .core-chain-meta{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:700;background:rgba(0,0,0,0.40);padding:4px 10px;border-radius:999px;backdrop-filter:blur(6px);}' +
      '@keyframes coreChainShift{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}';
    document.head.appendChild(css);
    const wrap = document.createElement('div');
    wrap.id = 'coreChainCta';
    const meta = document.createElement('div');
    meta.className = 'core-chain-meta';
    meta.textContent = entry.isLast ? 'FINAL STEP' : 'KEEP GOING';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = (entry.isLast ? 'Enter CORE' : 'Continue') +
      ' <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
    btn.addEventListener('click', () => {
      try { if (window.coreTrack) window.coreTrack('chain_continue', { from: key }); } catch (e) {}
      if (entry.isLast) {
        try { localStorage.removeItem('coreOnboardingChain'); } catch (e) {}
      }
      location.href = entry.next;
    });
    wrap.appendChild(meta);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildCTA);
  } else {
    buildCTA();
  }
})();
