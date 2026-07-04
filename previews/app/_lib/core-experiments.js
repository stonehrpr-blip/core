/* core-experiments.js
 *
 * Tiny A/B engine for the preview. Each named experiment has a list of
 * variants; the first time a visitor encounters it, we pick one
 * (50/50 by default) and persist to coreExp.{name}. Same visitor sees
 * the same variant on subsequent visits — sticky assignment.
 *
 * Usage from a page:
 *   const v = coreExperiments.assign('pricing', ['A','B']);
 *   if (v === 'B') { ... swap copy back to old ... }
 *
 * Tracking helper: coreExperiments.track('event', {extra}) tags the
 * event with the visitor's current assignments so analytics keep variant
 * lineage automatically.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window._coreExperiments) return;
  window._coreExperiments = true;

  const KEY = 'coreExp';
  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeAll(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }

  // Deterministic 50/50 split by default. Pass a weights array (same
  // length as variants, summing to 1) for custom splits.
  function assign(name, variants, weights) {
    if (!Array.isArray(variants) || !variants.length) return null;
    const all = readAll();
    if (all[name] && variants.indexOf(all[name]) !== -1) return all[name];
    let pick;
    if (Array.isArray(weights) && weights.length === variants.length) {
      const r = Math.random();
      let acc = 0;
      pick = variants[0];
      for (let i = 0; i < variants.length; i++) {
        acc += weights[i];
        if (r <= acc) { pick = variants[i]; break; }
      }
    } else {
      pick = variants[Math.floor(Math.random() * variants.length)];
    }
    all[name] = pick;
    writeAll(all);
    try { if (window.coreTrack) coreTrack('exp_assign', { name, variant: pick }); } catch (e) {}
    return pick;
  }

  function get(name) {
    return readAll()[name] || null;
  }

  function track(event, extra) {
    if (!window.coreTrack) return;
    try { coreTrack(event, Object.assign({}, extra || {}, { exp: readAll() })); } catch (e) {}
  }

  // Force a variant (e.g. ?exp_pricing=B in the URL) for QA. Sticky.
  function applyUrlOverrides() {
    try {
      const sp = new URLSearchParams(location.search);
      const all = readAll();
      let changed = false;
      sp.forEach((value, key) => {
        if (key.indexOf('exp_') === 0) {
          all[key.slice(4)] = value;
          changed = true;
        }
      });
      if (changed) writeAll(all);
    } catch (e) {}
  }
  applyUrlOverrides();

  window.coreExperiments = { assign, get, track, readAll };
})();
