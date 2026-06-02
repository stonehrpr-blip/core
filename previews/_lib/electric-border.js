/**
 * ElectricBorder — vanilla-JS port of the React Bits component.
 *
 * HTML structure required:
 *   <div class="electric-border" data-eb data-color="#7df9ff" data-speed="1" data-chaos="0.1" data-thickness="2" style="border-radius:16px;">
 *     <div class="eb-canvas-container"><canvas class="eb-canvas"></canvas></div>
 *     <div class="eb-layers">
 *       <div class="eb-glow-1"></div>
 *       <div class="eb-glow-2"></div>
 *       <div class="eb-background-glow"></div>
 *     </div>
 *     <div class="eb-content"><!-- your content --></div>
 *   </div>
 *
 * Or call manually:  attachElectricBorder(el, { color, speed, chaos, borderRadius, thickness });
 *
 * Original component © Balint Ferenczy via React Bits.
 * https://codepen.io/BalintFerenczy/pen/KwdoyEN
 */
(function() {
  if (typeof window === 'undefined') return;

  function random(x) { return (Math.sin(x * 12.9898) * 43758.5453) % 1; }

  function noise2D(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const a = random(i + j * 57);
    const b = random(i + 1 + j * 57);
    const c = random(i + (j + 1) * 57);
    const d = random(i + 1 + (j + 1) * 57);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  }

  function octavedNoise(x, octaves, lacunarity, gain, baseAmp, baseFreq, t, seed, baseFlatness) {
    let y = 0, amp = baseAmp, freq = baseFreq;
    for (let i = 0; i < octaves; i++) {
      let oa = amp;
      if (i === 0) oa *= baseFlatness;
      y += oa * noise2D(freq * x + seed * 100, t * freq * 0.3);
      freq *= lacunarity;
      amp *= gain;
    }
    return y;
  }

  function cornerPoint(cx, cy, r, start, arc, p) {
    const a = start + p * arc;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function rectPoint(t, left, top, w, h, r) {
    const sw = w - 2 * r, sh = h - 2 * r;
    const ca = (Math.PI * r) / 2;
    const total = 2 * sw + 2 * sh + 4 * ca;
    const d = t * total;
    let acc = 0;
    if (d <= acc + sw) { const p = (d - acc) / sw; return { x: left + r + p * sw, y: top }; } acc += sw;
    if (d <= acc + ca) { return cornerPoint(left + w - r, top + r, r, -Math.PI / 2, Math.PI / 2, (d - acc) / ca); } acc += ca;
    if (d <= acc + sh) { const p = (d - acc) / sh; return { x: left + w, y: top + r + p * sh }; } acc += sh;
    if (d <= acc + ca) { return cornerPoint(left + w - r, top + h - r, r, 0, Math.PI / 2, (d - acc) / ca); } acc += ca;
    if (d <= acc + sw) { const p = (d - acc) / sw; return { x: left + w - r - p * sw, y: top + h }; } acc += sw;
    if (d <= acc + ca) { return cornerPoint(left + r, top + h - r, r, Math.PI / 2, Math.PI / 2, (d - acc) / ca); } acc += ca;
    if (d <= acc + sh) { const p = (d - acc) / sh; return { x: left, y: top + h - r - p * sh }; } acc += sh;
    const p = (d - acc) / ca;
    return cornerPoint(left + r, top + r, r, Math.PI, Math.PI / 2, p);
  }

  function attachElectricBorder(el, opts) {
    opts = opts || {};
    const color   = opts.color   || el.dataset.color   || '#5227FF';
    const speed   = parseFloat(opts.speed   ?? el.dataset.speed   ?? 1);
    const chaos   = parseFloat(opts.chaos   ?? el.dataset.chaos   ?? 0.12);
    const thickness = parseFloat(opts.thickness ?? el.dataset.thickness ?? 1);
    const borderRadius = parseFloat(opts.borderRadius ?? el.dataset.radius ?? 24);

    el.style.setProperty('--electric-border-color', color);
    if (!el.style.borderRadius) el.style.borderRadius = borderRadius + 'px';

    const canvas = el.querySelector('.eb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const octaves = 10, lacunarity = 1.6, gain = 0.7, amplitude = chaos;
    const frequency = 10, baseFlatness = 0, displacement = 60, borderOffset = 60;

    let width = 0, height = 0;
    let time = 0, lastFrame = 0;
    let lastDpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    function updateSize() {
      const rect = el.getBoundingClientRect();
      width = rect.width + borderOffset * 2;
      height = rect.height + borderOffset * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      lastDpr = dpr;
    }

    updateSize();

    function frame(t) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (dpr !== lastDpr) updateSize();
      const dt = lastFrame ? (t - lastFrame) / 1000 : 0;
      time += dt * speed;
      lastFrame = t;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const left = borderOffset, top = borderOffset;
      const bw = width - 2 * borderOffset, bh = height - 2 * borderOffset;
      const maxR = Math.min(bw, bh) / 2;
      const r = Math.min(borderRadius, maxR);
      const perim = 2 * (bw + bh) + 2 * Math.PI * r;
      const samples = Math.max(80, Math.floor(perim / 2));

      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const p = i / samples;
        const pt = rectPoint(p, left, top, bw, bh, r);
        const xN = octavedNoise(p * 8, octaves, lacunarity, gain, amplitude, frequency, time, 0, baseFlatness);
        const yN = octavedNoise(p * 8, octaves, lacunarity, gain, amplitude, frequency, time, 1, baseFlatness);
        const dx = pt.x + xN * displacement;
        const dy = pt.y + yN * displacement;
        if (i === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      }
      ctx.closePath();
      ctx.stroke();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
    }

    el.__electricBorder = { stop: () => cancelAnimationFrame(raf) };
  }

  // Auto-init: any .electric-border with [data-eb] on the page
  function autoInit() {
    document.querySelectorAll('.electric-border[data-eb]').forEach(function(el) {
      if (el.__electricBorder) return;
      attachElectricBorder(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.attachElectricBorder = attachElectricBorder;
})();
