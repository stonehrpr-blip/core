/* core-tasks.js
 * Task model + CRUD over localStorage. Categories:
 *   fitness · mind · money · relationships · learning · health · business · lifestyle
 *
 * Each task: { id, title, category, xp, difficulty, deadline, proofRequired,
 *              status: 'pending'|'completed'|'skipped'|'rescheduled',
 *              createdAt, completedAt, proofUrl, source }
 *
 * Events fired on window:
 *   - 'coreTaskCreate'   { detail: task }
 *   - 'coreTaskComplete' { detail: { task, xpEarned } }
 *   - 'coreTaskSkip'     { detail: task }
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.coreTasks) return;
  const KEY = 'coreTasks.v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function write(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function fire(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {}
  }

  function newId() {
    return 'tk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  const CATEGORIES = {
    fitness:       { label: 'Fitness',       color: '#34D399', icon: 'M20 12c0 5-4 8-8 8s-8-3-8-8a8 8 0 0 1 16 0Z' },
    mind:          { label: 'Mind',          color: '#B388FF', icon: 'M12 2C7 2 3 6 3 11c0 3 1 5 3 6v3l3-2c.7.2 1.5.3 2.4.3h.6c5 0 9-4 9-9s-4-9-9-9z' },
    money:         { label: 'Money',         color: '#FFD05C', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6' },
    relationships: { label: 'Relationships', color: '#FF6BAA', icon: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z' },
    learning:      { label: 'Learning',      color: '#5CE1E6', icon: 'M2 7l10-5 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5' },
    health:        { label: 'Health',        color: '#FF7A45', icon: 'M3 12h4l3-9 4 18 3-9h4' },
    business:      { label: 'Business',      color: '#0A84FF', icon: 'M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    lifestyle:     { label: 'Lifestyle',     color: '#AF52DE', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
  };

  function create(input) {
    const task = Object.assign({
      id: newId(),
      title: 'Untitled task',
      category: 'mind',
      xp: 5,
      difficulty: 1,        // 1=easy, 2=medium, 3=hard
      deadline: null,       // ISO date string
      proofRequired: false,
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      proofUrl: null,
      source: 'manual'
    }, input || {});
    const list = read();
    list.push(task);
    write(list);
    fire('coreTaskCreate', task);
    try { if (window.coreAI) coreAI.logActivity('task_created', { id: task.id, category: task.category, title: task.title }); } catch (e) {}
    return task;
  }

  function update(id, patch) {
    const list = read();
    const i = list.findIndex(t => t.id === id);
    if (i < 0) return null;
    list[i] = Object.assign({}, list[i], patch);
    write(list);
    return list[i];
  }

  function remove(id) {
    const list = read().filter(t => t.id !== id);
    write(list);
  }

  function complete(id, proof) {
    const t = update(id, { status: 'completed', completedAt: Date.now(), proofUrl: proof?.url || null, proofVerdict: proof?.verdict || null });
    if (!t) return null;
    // Award XP via coreState if available
    try {
      if (window.coreState && coreState.earnXP) coreState.earnXP(t.xp || 0, 'task:' + (t.category || 'other'));
    } catch (e) {}
    fire('coreTaskComplete', { task: t, xpEarned: t.xp || 0 });
    try { if (window.coreAI) coreAI.logActivity('task_completed', { id: t.id, title: t.title, xp: t.xp }); } catch (e) {}
    return t;
  }

  function skip(id, reason) {
    const t = update(id, { status: 'skipped', skippedAt: Date.now(), skipReason: reason || '' });
    if (!t) return null;
    fire('coreTaskSkip', t);
    try { if (window.coreAI) coreAI.logActivity('task_skipped', { id: t.id, title: t.title, reason }); } catch (e) {}
    return t;
  }

  function reschedule(id, newDeadline) {
    return update(id, { status: 'pending', deadline: newDeadline });
  }

  function list(filter) {
    let l = read();
    if (filter) {
      if (filter.status) l = l.filter(t => t.status === filter.status);
      if (filter.category) l = l.filter(t => t.category === filter.category);
      if (filter.todayOnly) {
        const start = new Date(); start.setHours(0,0,0,0);
        const end   = new Date(); end.setHours(23,59,59,999);
        l = l.filter(t => {
          if (!t.deadline) return t.status === 'pending';
          const d = +new Date(t.deadline);
          return d >= start.getTime() && d <= end.getTime();
        });
      }
    }
    return l;
  }

  // Stats — completion rate over last N days, etc.
  function stats(daysBack) {
    const days = daysBack || 7;
    const since = Date.now() - days * 86400000;
    const l = read().filter(t => t.createdAt >= since);
    const done = l.filter(t => t.status === 'completed').length;
    const skipped = l.filter(t => t.status === 'skipped').length;
    return {
      total: l.length, done, skipped,
      completionRate: l.length ? done / l.length : 0,
      xpEarned: l.filter(t => t.status === 'completed').reduce((s, t) => s + (t.xp || 0), 0),
    };
  }

  function clearAll() { write([]); }

  window.coreTasks = {
    create, update, remove, complete, skip, reschedule,
    list, stats, clearAll, CATEGORIES,
    read, write
  };
})();
