/* core-pricing-ab.js
 *
 * Pricing experiment runner. Picks variant A (new: $0 today · $4.99/mo
 * · 3 days free) vs B (old: $2.99 first month · $7.99/mo · 7 days free)
 * via coreExperiments, then swaps the copy in any text node that
 * matches the new-variant phrasing.
 *
 * Auto-runs on trial.html / pricing.html / paywall.html. Other pages
 * just get the assignment recorded; nothing visible changes.
 *
 * To force a variant for QA, add ?exp_pricing=A or ?exp_pricing=B to
 * the URL (sticky after first visit).
 */
(function () {
  if (typeof window === 'undefined') return;
  if (!window.coreExperiments) {
    // Lazy-load the engine if a page forgot to include it
    const s = document.createElement('script');
    s.src = 'core-experiments.js';
    s.onload = run;
    document.head.appendChild(s);
    return;
  }
  run();

  function run() {
    const v = window.coreExperiments.assign('pricing', ['A', 'B'], [0.5, 0.5]);
    document.body && document.body.setAttribute('data-exp-pricing', v);

    // Variant A = current copy (already in DOM). No swap needed.
    if (v !== 'B') return;

    // Variant B = old copy. Walk text nodes and replace matched phrases.
    const SWAPS = [
      // 3-day → 7-day framing
      [/\b3 days free\b/g,             '7 days free'],
      [/\bStart 3 days free\b/g,       'Start 7-day free trial'],
      [/\b3 days free · cancel any time\b/gi, '7 days free · cancel any time'],
      [/\bclaim my 3 days free\b/g,    'claim my 7 days free'],
      [/\bin 3 days\b/gi,              'in 7 days'],
      [/\b3-day free trial\b/g,        '7-day free trial'],

      // Pricing
      [/\$0 due today · then \$4\.99\/mo · cancel any time/g, '$2.99 first month · then $7.99/mo'],
      [/\$0 due today\. Cancel anytime\./g, 'Apple Pay confirms it\'s you — $2.99 first month'],
      [/\$0 due today\.?/g,            '$2.99 first month.'],
      [/\$4\.99\/mo · cancel any time/g, '$7.99/mo · cancel any time'],
      [/\$4\.99\/mo/g,                 '$7.99/mo'],
      [/\$4\.99/g,                     '$2.99'],

      // First-charge fallback line
      [/First charge is \$2\.99 in 7 days\./g, 'Then $7.99/mo after the first month.'],
    ];

    // Walk all text nodes once
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      let t = node.nodeValue;
      for (let i = 0; i < SWAPS.length; i++) t = t.replace(SWAPS[i][0], SWAPS[i][1]);
      if (t !== node.nodeValue) node.nodeValue = t;
    });

    // For the "big" number element on the Apple Pay row of trial.html,
    // we hard-set since it lives inside .big — text-node walk caught it
    // but the screen-reader value may need a label. Best-effort.
    window.coreExperiments.track('pricing_viewed', { page: location.pathname });
  }
})();
