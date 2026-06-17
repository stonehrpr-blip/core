/* core-starfield.js — injects the premium matte-black animated starfield
   into every .phone on the page. Pair with core-starfield.css and add
   data-bg-skip to the .phone element so the shared blue atmosphere
   (core-background.js) opts out. */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__coreStarfield) return;
  window.__coreStarfield = true;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);

  function build(phone) {
    if (!phone || phone.__sf) return;
    phone.__sf = true;
    phone.setAttribute('data-starfield', '');

    var base = document.createElement('div');  base.className = 'sf-base';
    var drift = document.createElement('div'); drift.className = 'sf-drift';
    var layer = document.createElement('div'); layer.className = 'sf-layer';

    var n = reduce ? 46 : 94, html = '';
    for (var i = 0; i < n; i++) {
      var r = Math.random();
      var t = r < 0.58 ? 's1' : r < 0.84 ? 's2' : r < 0.96 ? 's3' : 's4';
      html += '<i class="sf-star ' + t + '" style="'
        + 'left:'  + (Math.random() * 100).toFixed(2) + '%;'
        + 'top:'   + (Math.random() * 100).toFixed(2) + '%;'
        + '--d:'   + (4 + Math.random() * 6).toFixed(2) + 's;'
        + '--del:' + (Math.random() * 6).toFixed(2) + 's;'
        + '--min:' + (0.04 + Math.random() * 0.10).toFixed(2) + ';'
        + '--max:' + (0.30 + Math.random() * 0.30).toFixed(2) + '"></i>';
    }
    layer.innerHTML = html;

    if (!reduce) {
      ['a', 'b', 'c'].forEach(function (c) {
        var s = document.createElement('div');
        s.className = 'sf-shoot ' + c;
        layer.appendChild(s);
      });
    }

    // first children → painted behind the page's content (z-index:10)
    phone.insertBefore(layer, phone.firstChild);
    phone.insertBefore(drift, phone.firstChild);
    phone.insertBefore(base, phone.firstChild);
  }

  function init() {
    var ps = document.querySelectorAll('.phone');
    for (var i = 0; i < ps.length; i++) build(ps[i]);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
