/*
 * core-strength.js — strength progression engine shared across the strength system.
 *  - onboarding profile (goal / level / place), shown once
 *  - per-muscle score + colour level (grey -> low -> mid -> high/glow)
 *  - reward bridge into the real CORE economy (coreState XP + 'strength' stat)
 *  - camera rep helper (CORE+ aware: 0.01 vs 0.05 strength / rep)
 *
 * Depends on: core-gym-data.js (window.CoreGym). coreState/coreSfx optional (graceful).
 */
(function () {
  if (window.CoreStrength) return;
  var KEY = 'core.strength.v1';

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function state() {
    var s = read();
    s.profile = s.profile || null;
    s.muscles = s.muscles || {};
    s.totalReps = s.totalReps || 0;
    s.strengthScore = s.strengthScore || 0;
    s.workouts = s.workouts || 0;
    s.sets = s.sets || 0;
    s.history = s.history || [];
    return s;
  }

  function sfx(n) { try { window.coreSfx && window.coreSfx(n); } catch (e) {} }

  /* ---------------- economy bridge ---------------- */
  function xp() { try { return window.coreState.read().xp || 0; } catch (e) { return state().fxp || 0; } }
  function rank() { try { var s = window.coreState.read(); return window.coreState.rankFor(s.xp); } catch (e) { return { name: 'Stone' }; } }
  function strength() { try { return window.coreState.statValue('strength') || 0; } catch (e) { return Math.floor(state().strengthScore); } }
  function isPlus() { try { return !!(window.coreState && window.coreState.corePlusActive && window.coreState.corePlusActive()); } catch (e) { return false; } }
  function addXp(n) { try { if (window.coreState) { window.coreState.addXp(n, 'strength:workout'); return; } } catch (e) {} var s = state(); s.fxp = (s.fxp || 0) + n; write(s); }
  function addStrengthStat(n) { try { if (window.coreState) { window.coreState.addStat('strength', n, 'strength:gain'); } } catch (e) {} }

  /* ---------------- profile / onboarding ---------------- */
  function hasProfile() { var p = state().profile; return !!(p && p.done); }
  function getProfile() { return state().profile; }
  function setProfile(p) { var s = state(); s.profile = { goal: p.goal, level: p.level, place: p.place, done: true, ts: Date.now() }; write(s); return s.profile; }

  /* ---------------- muscle scoring ---------------- */
  var DIFF_MULT = { easy: 1, medium: 1.15, hard: 1.3 };
  // one set's contribution to a muscle's score
  function setScore(o) {
    var w = (o.weight && o.weight > 0) ? o.weight : 0;
    var reps = o.reps || 10;
    return (1 + w * 0.04) * (1 + reps * 0.02) * (DIFF_MULT[o.diff] || 1);
  }
  function addMuscleWork(id, o) {
    var s = state();
    var m = s.muscles[id] || { score: 0, workouts: 0, sets: 0 };
    m.score += (o.sets || 1) * setScore(o);
    m.sets += (o.sets || 1);
    s.muscles[id] = m;
    write(s);
    return m;
  }
  function getScore(id) { var m = state().muscles[id]; return m ? m.score : 0; }

  // colour level from a muscle's accumulated score
  var T_LOW = 1, T_MID = 12, T_HIGH = 35, T_MAX = 60;
  function levelInfo(id) {
    var score = getScore(id);
    var base = (window.CoreGym && window.CoreGym.muscle(id) && window.CoreGym.muscle(id).color) || '#FF6B6B';
    var level, t;
    if (score < T_LOW) { level = 'none'; t = 0; }
    else if (score < T_MID) { level = 'low'; t = 0.30 + 0.15 * (score / T_MID); }
    else if (score < T_HIGH) { level = 'mid'; t = 0.55 + 0.25 * ((score - T_MID) / (T_HIGH - T_MID)); }
    else { level = 'high'; t = 1; }
    return { id: id, score: Math.round(score * 10) / 10, level: level, t: Math.min(1, t), color: base, glow: level === 'high' };
  }
  function allLevels() {
    var out = {};
    (window.CoreGym ? window.CoreGym.MUSCLES : []).forEach(function (m) { out[m.id] = levelInfo(m.id); });
    return out;
  }

  /* ---------------- rewards ---------------- */
  // entries: [{ name, muscle, sets, reps, weight, diff }]  (all for the same muscle here)
  function completeWorkout(muscle, entries, meta) {
    meta = meta || {};
    var totalSets = entries.reduce(function (a, e) { return a + (e.sets || 0); }, 0);
    var totalReps = entries.reduce(function (a, e) { return a + (e.sets || 0) * (e.reps || 0); }, 0);
    var hardBonus = entries.reduce(function (a, e) { return a + (e.diff === 'hard' ? 2 : e.diff === 'medium' ? 1 : 0); }, 0);
    var xpGain = Math.max(30, Math.round(totalSets * 8 + hardBonus * 6 + entries.length * 5));
    var strGain = Math.max(1, Math.round(totalSets / 3 + hardBonus * 0.5));

    var s = state();
    s.workouts += 1; s.sets += totalSets; s.strengthScore += strGain;
    s.history.unshift({ ts: Date.now(), muscle: muscle, exercises: entries.length, sets: totalSets, reps: totalReps, ms: meta.ms || 0, xp: xpGain, str: strGain });
    if (s.history.length > 60) s.history.length = 60;
    write(s);

    entries.forEach(function (e) { addMuscleWork(e.muscle || muscle, e); });
    addXp(xpGain); addStrengthStat(strGain);
    return { xp: xpGain, str: strGain, sets: totalSets, reps: totalReps };
  }

  /* ---------------- camera reps ---------------- */
  function perRep() { return isPlus() ? 0.05 : 0.01; }
  function addReps(muscle, count, repInfo) {
    var s = state();
    var gain = count * perRep();
    s.totalReps += count;
    s.strengthScore += gain;
    // reps also nudge the muscle's colour score
    var m = s.muscles[muscle] || { score: 0, workouts: 0, sets: 0 };
    m.score += count * 0.12 * ((repInfo && DIFF_MULT[repInfo.diff]) || 1);
    s.muscles[muscle] = m;
    write(s);
    return { gain: gain, totalReps: s.totalReps };
  }
  // push accumulated rep-strength into the real stat at session end (rounded delta)
  function commitRepStrength(gain) { if (gain >= 1) addStrengthStat(Math.round(gain)); var x = Math.round(gain * 20); if (x > 0) addXp(x); }

  function stats() { var s = state(); return { workouts: s.workouts, sets: s.sets, totalReps: s.totalReps, strengthScore: Math.round(s.strengthScore * 100) / 100, history: s.history }; }

  window.CoreStrength = {
    hasProfile: hasProfile, getProfile: getProfile, setProfile: setProfile,
    levelInfo: levelInfo, allLevels: allLevels, addMuscleWork: addMuscleWork, getScore: getScore,
    completeWorkout: completeWorkout, addReps: addReps, perRep: perRep, commitRepStrength: commitRepStrength,
    xp: xp, rank: rank, strength: strength, isPlus: isPlus, stats: stats, sfx: sfx, _state: state
  };
})();
