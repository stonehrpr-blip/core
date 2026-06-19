/**
 * CoreBackground — single source of truth for the CORE atmosphere.
 *
 * Drop in to any page with both:
 *   <link rel="stylesheet" href="_lib/core-background.css">
 *   <script src="_lib/core-background.js"></script>
 *
 * The script auto-injects the layer stack into every .phone container
 * found on the page. To opt out for a specific page, add data-bg-skip
 * to the .phone element.
 *
 * Side effect: removes any existing direct-child .bg / .aurora /
 * .stars / .nebula / .shooting / .particles elements so the new stack
 * doesn't double up with a page's legacy background.
 */
(function() {
  if (typeof window === 'undefined') return;

  function spawnStars(wrap, count) {
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const tier = r < 0.55 ? 's1' : r < 0.82 ? 's2' : r < 0.96 ? 's3' : 's4';
      const s = document.createElement('div');
      s.className = 'core-bg-star ' + tier;
      s.style.left = (Math.random() * 100) + '%';
      s.style.top  = (Math.random() * 100) + '%';
      s.style.setProperty('--d',   (4 + Math.random() * 6) + 's');
      s.style.setProperty('--del', (Math.random() * 6) + 's');
      s.style.setProperty('--min', (0.04 + Math.random() * 0.10).toFixed(2));
      s.style.setProperty('--max', (0.30 + Math.random() * 0.25).toFixed(2));
      wrap.appendChild(s);
    }
  }

  function spawnParticles(wrap, count) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.setProperty('--d',   (12 + Math.random() * 10) + 's');
      p.style.setProperty('--del', (Math.random() * 14) + 's');
      const size = 2 + Math.random() * 3;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      wrap.appendChild(p);
    }
  }

  function injectInto(target) {
    if (!target || target.__coreBgInjected) return;
    if (target.hasAttribute && target.hasAttribute('data-bg-skip')) return;
    target.__coreBgInjected = true;

    // Remove any direct-child legacy background elements so we don't double-up.
    // Only direct children — nested .stars or .bg in cards stay intact.
    ['bg', 'aurora', 'stars', 'nebula', 'shooting', 'particles', 'mesh', 'scanlines'].forEach(function(cls) {
      target.querySelectorAll(':scope > .' + cls).forEach(function(el) { el.remove(); });
    });

    const stack = document.createElement('div');
    stack.className = 'core-bg-stack';
    stack.setAttribute('aria-hidden', 'true');
    stack.innerHTML =
      '<div class="core-bg-grad"></div>' +
      '<div class="core-bg-nebula"></div>' +
      '<div class="core-bg-aurora"></div>' +
      '<div class="core-bg-stars"></div>' +
      '<div class="core-bg-particles"></div>' +
      '<div class="core-bg-shooting s1"></div>' +
      '<div class="core-bg-shooting s2"></div>';
    target.insertBefore(stack, target.firstChild);

    spawnStars(stack.querySelector('.core-bg-stars'), 80);
    spawnParticles(stack.querySelector('.core-bg-particles'), 10);
  }

  function init() {
    document.querySelectorAll('.phone').forEach(injectInto);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
