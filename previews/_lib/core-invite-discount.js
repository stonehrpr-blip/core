/* core-invite-discount.js
 *
 * When a visitor lands with ?ref=CODE in the URL we persist a discount:
 *   localStorage.coreInviteDiscount = { pct:50, ref, ts }
 *
 * On pricing pages (trial / pricing / paywall) this script:
 *   1. Inserts a small "50% off applied" badge near the price area
 *   2. Walks visible text nodes and halves any "$X.XX" price that the
 *      pricing A/B script wrote, so dollar amounts always reflect the
 *      discounted total.
 *
 * Discount sticks per browser. To clear: localStorage.removeItem('coreInviteDiscount').
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window._coreInviteDiscount) return;
  window._coreInviteDiscount = true;

  function captureRef() {
    try {
      const sp = new URLSearchParams(location.search);
      const ref = sp.get('ref');
      if (!ref) return;
      const existing = JSON.parse(localStorage.getItem('coreInviteDiscount') || 'null');
      if (existing && existing.ref === ref) return; // already captured
      localStorage.setItem('coreInviteDiscount', JSON.stringify({ pct: 50, ref, ts: Date.now() }));
      if (window.coreTrack) coreTrack('invite_ref_captured', { ref });
    } catch (e) {}
  }
  captureRef();

  function readDiscount() {
    try { return JSON.parse(localStorage.getItem('coreInviteDiscount') || 'null'); } catch (e) { return null; }
  }

  function applyDiscount() {
    const d = readDiscount();
    if (!d || !d.pct) return;
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!['trial.html', 'pricing.html', 'paywall.html'].includes(path)) return;

    // Halve any dollar amount in text nodes (well-formed like $4.99, $2.49)
    const factor = (100 - d.pct) / 100;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    const priceRe = /\$(\d+(?:\.\d{2})?)/g;
    nodes.forEach(node => {
      // Skip the badge we inject
      if (node.parentElement && node.parentElement.classList && node.parentElement.classList.contains('invite-applied-badge')) return;
      const t = node.nodeValue;
      const out = t.replace(priceRe, (m, num) => '$' + (parseFloat(num) * factor).toFixed(2));
      if (out !== t) node.nodeValue = out;
    });

    // Inject a discount-applied badge near the first .cta button or .price-card
    if (document.querySelector('.invite-applied-badge')) return;
    const anchor = document.querySelector('.cta, .price-card, .ap-row') || document.querySelector('main, .scroll, body');
    if (!anchor) return;
    const badge = document.createElement('div');
    badge.className = 'invite-applied-badge';
    badge.style.cssText = `
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px; margin: 10px 0;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(179,136,255,0.16), rgba(74,143,255,0.10));
      border: 1px solid rgba(179,136,255,0.42);
      color: #C7B5FF; font-size: 11px; font-weight: 700;
      letter-spacing: 0.10em; text-transform: uppercase;
      font-family: 'Chakra Petch', -apple-system, sans-serif;
      width: fit-content;
    `;
    badge.textContent = '🎁 ' + d.pct + '% off applied · ref: ' + (d.ref || '').slice(0, 8).toUpperCase();
    anchor.parentNode.insertBefore(badge, anchor);

    if (window.coreTrack) coreTrack('invite_discount_shown', { pct: d.pct, ref: d.ref });
  }

  function init() {
    // Defer until after core-pricing-ab.js has done its variant swap
    setTimeout(applyDiscount, 60);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.coreInviteDiscount = { read: readDiscount, apply: applyDiscount };
})();
