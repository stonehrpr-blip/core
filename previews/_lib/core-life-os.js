/* core-life-os.js
 * The connective tissue between modules.
 *
 * Subscribes to events and auto-creates linked items so nothing exists
 * in isolation. Example:
 *   • Meal plan generated → tasks auto-created for prep + cook + log
 *   • Workout created → gym session added to dashboard routine
 *   • Morning routine updated → check-in tasks scheduled
 *   • Habit picked → daily task seeded
 *
 * Anyone can fire these events:
 *   window.dispatchEvent(new CustomEvent('coreLifeMealCreated',     { detail: {...} }));
 *   window.dispatchEvent(new CustomEvent('coreLifeWorkoutCreated',  { detail: {...} }));
 *   window.dispatchEvent(new CustomEvent('coreLifeRoutineUpdated',  { detail: {...} }));
 *   window.dispatchEvent(new CustomEvent('coreLifeHabitPicked',     { detail: {...} }));
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window._coreLifeOS) return;
  window._coreLifeOS = true;

  function whenReady(check, cb, retries = 50) {
    if (check()) return cb();
    if (retries <= 0) return;
    setTimeout(() => whenReady(check, cb, retries - 1), 80);
  }

  // ── Meal plan → tasks ────────────────────────────────────────────────
  window.addEventListener('coreLifeMealCreated', (e) => {
    whenReady(() => window.coreTasks, () => {
      const m = e.detail || {};
      const meals = Array.isArray(m.meals) ? m.meals : [{ name: m.name || 'Meal', kcal: m.kcal }];
      meals.forEach(meal => {
        coreTasks.create({
          title: 'Log ' + (meal.name || 'meal') + (meal.kcal ? ' · ' + meal.kcal + ' kcal' : ''),
          category: 'health',
          xp: 5,
          proofRequired: false,
          source: 'meal-plan'
        });
      });
    });
  });

  // ── Workout created → gym session in routine ────────────────────────
  window.addEventListener('coreLifeWorkoutCreated', (e) => {
    whenReady(() => window.coreTasks, () => {
      const w = e.detail || {};
      coreTasks.create({
        title: w.title || 'Gym session · ' + (w.duration || '45 min'),
        category: 'fitness',
        xp: w.xp || 25,
        proofRequired: true,
        source: 'workout-plan'
      });
    });
  });

  // ── Routine updated → schedule daily check-in ───────────────────────
  window.addEventListener('coreLifeRoutineUpdated', (e) => {
    whenReady(() => window.coreTasks, () => {
      const r = e.detail || {};
      // Don't duplicate — only seed if no morning-checkin task exists today
      const today = coreTasks.list({ todayOnly: true });
      const has = today.some(t => /morning check-in/i.test(t.title));
      if (!has) {
        coreTasks.create({
          title: 'Morning check-in · ' + (r.wake || '07:00'),
          category: 'mind',
          xp: 10,
          source: 'routine'
        });
      }
    });
  });

  // ── Habit picked → recurring daily task ─────────────────────────────
  window.addEventListener('coreLifeHabitPicked', (e) => {
    whenReady(() => window.coreTasks, () => {
      const h = e.detail || {};
      coreTasks.create({
        title: h.title || 'Daily habit',
        category: h.category || 'mind',
        xp: h.xp || 10,
        proofRequired: !!h.proofRequired,
        source: 'habit'
      });
    });
  });

  // ── Plan accepted (from deep-onboarding) → seed today + remind ──────
  window.addEventListener('coreLifePlanSeeded', (e) => {
    whenReady(() => window.coreTasks, () => {
      const plan = e.detail?.plan || {};
      (plan.today || []).forEach(t => {
        coreTasks.create({
          title: t.title,
          category: t.category || 'mind',
          xp: t.xp || 5,
          difficulty: t.difficulty || 1,
          proofRequired: !!t.proofRequired,
          source: 'plan'
        });
      });
      // Notify dashboard to refresh
      try { window.dispatchEvent(new Event('coreStateChange')); } catch (e) {}
    });
  });

  // ── Helper exports for pages that want to fire events ───────────────
  window.coreLifeOS = {
    mealCreated:    (data) => window.dispatchEvent(new CustomEvent('coreLifeMealCreated',    { detail: data })),
    workoutCreated: (data) => window.dispatchEvent(new CustomEvent('coreLifeWorkoutCreated', { detail: data })),
    routineUpdated: (data) => window.dispatchEvent(new CustomEvent('coreLifeRoutineUpdated', { detail: data })),
    habitPicked:    (data) => window.dispatchEvent(new CustomEvent('coreLifeHabitPicked',    { detail: data })),
    planSeeded:     (data) => window.dispatchEvent(new CustomEvent('coreLifePlanSeeded',     { detail: data })),
  };
})();
