/**
 * CoreStepper — vanilla port of the React Bits Stepper slide-transition engine.
 *
 * Public API:
 *   const stepper = CoreStepper({
 *     container,         // the wrapper element that holds all .step children
 *     stepSelector,      // optional, default '.step'
 *     activeClass,       // optional, default 'active'
 *     initialStep,       // 1-indexed, default 1
 *     onStepChange,      // (step, direction) => void
 *     onFinalCompleted,  // () => void
 *     duration,          // ms, default 380
 *     easing,            // cubic-bezier, default spring-ish
 *   });
 *
 *   stepper.go(stepNumber)    // jump to step
 *   stepper.next()            // advance
 *   stepper.back()            // go back
 *   stepper.current()         // read current step (1-indexed)
 *   stepper.total              // total step count (number)
 *
 * Layout requirement: .step children should normally have `display:none` when
 * inactive. During transitions, both old and new are positioned absolute and
 * slide simultaneously. After the animation completes, the new step becomes
 * `position:static` again and the old one returns to `display:none`.
 */
(function() {
  if (typeof window === 'undefined') return;

  function CoreStepper(opts) {
    opts = opts || {};
    const container       = opts.container;
    if (!container) { console.warn('[CoreStepper] container required'); return null; }
    const stepSelector    = opts.stepSelector  || '.step';
    const activeClass     = opts.activeClass   || 'active';
    const duration        = opts.duration      || 380;
    const easing          = opts.easing        || 'cubic-bezier(0.22, 1, 0.36, 1)';
    const onStepChange    = opts.onStepChange  || function(){};
    const onFinalCompleted = opts.onFinalCompleted || function(){};

    let steps   = Array.from(container.querySelectorAll(stepSelector));
    const total = steps.length;
    let current = Math.max(1, Math.min(opts.initialStep || 1, total));
    let busy    = false;

    // Initial state: ensure only `current` is visible
    steps.forEach((s, i) => {
      s.classList.toggle(activeClass, i === current - 1);
      s.style.position = '';
      s.style.transform = '';
      s.style.opacity = '';
      s.style.pointerEvents = '';
    });

    function refreshSteps() {
      steps = Array.from(container.querySelectorAll(stepSelector));
    }

    function lockHeight(target) {
      // Smoothly animate container height from current to target step height
      const startH = container.offsetHeight;
      // Temporarily mount target invisibly to measure
      const clone = target.cloneNode(true);
      clone.classList.add(activeClass);
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.pointerEvents = 'none';
      clone.style.left = '0';
      clone.style.right = '0';
      clone.style.transform = 'none';
      clone.style.opacity = '0';
      container.appendChild(clone);
      const endH = clone.offsetHeight;
      container.removeChild(clone);

      if (Math.abs(endH - startH) < 2) return;
      container.style.height = startH + 'px';
      container.style.transition = `height ${duration}ms ${easing}`;
      // Force reflow then set target
      // eslint-disable-next-line no-unused-expressions
      container.offsetHeight;
      container.style.height = endH + 'px';
      setTimeout(() => {
        container.style.height = '';
        container.style.transition = '';
      }, duration + 30);
    }

    function transition(newStep, direction) {
      if (busy) return;
      if (newStep < 1) return;
      if (newStep > total) { onFinalCompleted(); return; }
      if (newStep === current) return;
      busy = true;

      const oldEl = steps[current - 1];
      const newEl = steps[newStep - 1];

      // Set up overlap: both absolute during animation
      const containerRect = container.getBoundingClientRect();
      container.style.position = container.style.position || 'relative';

      // Lock container height during transition to prevent jumps
      lockHeight(newEl);

      // Position both elements absolutely so they can overlap
      [oldEl, newEl].forEach(el => {
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.right = '0';
        el.style.top = '0';
        el.style.width = '100%';
      });

      // Make sure new step is "active" (visible) and start it offscreen
      newEl.classList.add(activeClass);
      newEl.style.transform = direction >= 0 ? 'translateX(100%)' : 'translateX(-100%)';
      newEl.style.opacity = '0';
      newEl.style.pointerEvents = 'none';

      oldEl.style.transform = 'translateX(0)';
      oldEl.style.opacity = '1';
      oldEl.style.pointerEvents = 'none';

      // Force layout flush
      // eslint-disable-next-line no-unused-expressions
      newEl.offsetHeight;

      // Animate
      oldEl.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
      newEl.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;

      requestAnimationFrame(() => {
        oldEl.style.transform = direction >= 0 ? 'translateX(-50%)' : 'translateX(50%)';
        oldEl.style.opacity = '0';
        newEl.style.transform = 'translateX(0)';
        newEl.style.opacity = '1';
      });

      setTimeout(() => {
        // Cleanup
        oldEl.classList.remove(activeClass);
        oldEl.style.position = '';
        oldEl.style.transform = '';
        oldEl.style.opacity = '';
        oldEl.style.transition = '';
        oldEl.style.pointerEvents = '';
        oldEl.style.left = oldEl.style.right = oldEl.style.top = oldEl.style.width = '';

        newEl.style.position = '';
        newEl.style.transform = '';
        newEl.style.opacity = '';
        newEl.style.transition = '';
        newEl.style.pointerEvents = '';
        newEl.style.left = newEl.style.right = newEl.style.top = newEl.style.width = '';

        current = newStep;
        busy = false;
        onStepChange(current, direction);
      }, duration + 20);
    }

    const api = {
      go(step) {
        if (step === current) return;
        const dir = step > current ? 1 : -1;
        transition(step, dir);
      },
      next() {
        if (current >= total) { onFinalCompleted(); return; }
        transition(current + 1, 1);
      },
      back() {
        if (current <= 1) return;
        transition(current - 1, -1);
      },
      current() { return current; },
      isBusy() { return busy; },
      refresh: refreshSteps,
      get total() { return steps.length; },
      // #88 — destroy hook: cleans up steps + drops the container's busy/transition state
      destroy() {
        steps.forEach(s => {
          s.style.position = '';
          s.style.transform = '';
          s.style.opacity = '';
          s.style.transition = '';
          s.style.pointerEvents = '';
          s.style.left = s.style.right = s.style.top = s.style.width = '';
          s.classList.remove(activeClass);
        });
        if (container) {
          container.style.height = '';
          container.style.transition = '';
        }
        busy = false;
        steps = [];
      },
    };
    if (container) container.__coreStepper = api;
    return api;
  }

  window.CoreStepper = CoreStepper;
})();
