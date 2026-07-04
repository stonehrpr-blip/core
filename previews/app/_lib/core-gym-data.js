/*
 * core-gym-data.js — exercise/muscle reference data for the CORE strength system.
 * Used by core-strength.js → strength-camera.html (the Live Rep Counter).
 *
 * Each exercise: { name, cat, diff, emoji, anim, sets, reps, video, tips }
 *   cat   : compound | isolation | machine | bodyweight   (grouping)
 *   diff  : easy | medium | hard
 *   anim  : press | pull | squat | curl | core            (looping form diagram archetype)
 *   video : YouTube ID placeholder — swap for verified IDs to enable embeds
 */
(function () {
  if (window.CoreGym) return;

  var MUSCLES = [
    { id: 'chest',     name: 'Chest',     emoji: '', color: '#FF6B6B' },
    { id: 'back',      name: 'Back',      emoji: '', color: '#4A8FFF' },
    { id: 'shoulders', name: 'Shoulders', emoji: '', color: '#FFD05C' },
    { id: 'arms',      name: 'Arms',      emoji: '', color: '#B388FF' },
    { id: 'legs',      name: 'Legs',      emoji: '', color: '#34D399' },
    { id: 'core',      name: 'Core',      emoji: '', color: '#FF7A45' }
  ];

  var EX = {
    chest: [
      { name: 'Bench Press',        cat: 'compound',   diff: 'hard',   emoji: '', anim: 'press', sets: 4, reps: 8,  video: 'rT7DgCr-3pg', tips: ['Plant feet, squeeze shoulder blades', 'Lower bar to mid-chest, controlled', 'Drive up explosively, elbows tucked'] },
      { name: 'Incline DB Press',   cat: 'compound',   diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 10, video: '8iPEnn-ltC8', tips: ['Bench at ~30°', 'Press up and slightly in', 'Full stretch at the bottom'] },
      { name: 'Cable Fly',          cat: 'isolation',  diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 12, video: 'Iwe6AmxVf7o', tips: ['Soft bend in the elbows', 'Hug the weight together', 'Squeeze chest at the middle'] },
      { name: 'Chest Press Machine',cat: 'machine',    diff: 'easy',   emoji: '', anim: 'press', sets: 3, reps: 12, video: 'xUm0BiZCWlQ', tips: ['Set seat so handles are chest-height', 'Press smoothly, no lockout slam', 'Control the negative'] },
      { name: 'Push-Up',            cat: 'bodyweight', diff: 'easy',   emoji: '', anim: 'press', sets: 3, reps: 15, video: 'IODxDxX7oi4', tips: ['Body in one straight line', 'Hands just wider than shoulders', 'Lower until chest nearly touches'] },
      { name: 'Chest Dip',          cat: 'bodyweight', diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 10, video: '2z8JmcrW-As', tips: ['Lean forward to hit chest', 'Lower until you feel the stretch', 'Press up under control'] }
    ],
    back: [
      { name: 'Deadlift',           cat: 'compound',   diff: 'hard',   emoji: '', anim: 'squat', sets: 4, reps: 5,  video: 'op9kVnSso6Q', tips: ['Bar over mid-foot', 'Brace your core hard', 'Hips and chest rise together'] },
      { name: 'Bent-Over Row',      cat: 'compound',   diff: 'medium', emoji: '', anim: 'pull',  sets: 3, reps: 10, video: '9efgcAjQe7E', tips: ['Hinge at the hips, flat back', 'Row to your lower ribs', 'Squeeze the shoulder blades'] },
      { name: 'Straight-Arm Pulldown',cat:'isolation', diff: 'easy',   emoji: '', anim: 'pull',  sets: 3, reps: 14, video: 'G9uNaXGTJ4w', tips: ['Slight bend, keep arms straight', 'Drive the bar to your thighs', 'Feel the lats stretch up top'] },
      { name: 'Lat Pulldown',       cat: 'machine',    diff: 'easy',   emoji: '', anim: 'pull',  sets: 3, reps: 12, video: 'CAwf7n6Luuc', tips: ['Pull the bar to your collarbone', 'Drive elbows down and back', 'No swinging'] },
      { name: 'Seated Cable Row',   cat: 'machine',    diff: 'easy',   emoji: '', anim: 'pull', sets: 3, reps: 12, video: 'GZbfZ033f74', tips: ['Tall chest, pull to your belly', 'Lead with the elbows', 'Squeeze and hold a beat'] },
      { name: 'Pull-Up',            cat: 'bodyweight', diff: 'hard',   emoji: '', anim: 'pull',  sets: 4, reps: 6,  video: 'eGo4IYlbE5g', tips: ['Start from a dead hang', 'Lead with your chest', 'Control the way down'] }
    ],
    shoulders: [
      { name: 'Overhead Press',     cat: 'compound',   diff: 'medium', emoji: '', anim: 'press', sets: 4, reps: 8,  video: '2yjwXTZQDDI', tips: ['Brace glutes and core', 'Press in a straight line', 'Lock out, head through'] },
      { name: 'Arnold Press',       cat: 'compound',   diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 10, video: '6Z15_WdXmVw', tips: ['Start palms facing you', 'Rotate as you press up', 'Control the rotation back'] },
      { name: 'Lateral Raise',      cat: 'isolation',  diff: 'easy',   emoji: '', anim: 'curl',  sets: 3, reps: 15, video: '3VcKaXpzqRo', tips: ['Lead with the elbows', 'Raise to shoulder height', 'Slow on the way down'] },
      { name: 'Face Pull',          cat: 'isolation',  diff: 'easy',   emoji: '', anim: 'pull',  sets: 3, reps: 15, video: 'rep-qVOkqgk', tips: ['Pull toward your forehead', 'Keep elbows high', 'Great for posture'] },
      { name: 'Shoulder Press Machine',cat:'machine',  diff: 'easy',   emoji: '', anim: 'press', sets: 3, reps: 12, video: 'Wqq43dKW1TU', tips: ['Seat so handles are at shoulders', 'Press without shrugging', 'Smooth control down'] },
      { name: 'Pike Push-Up',       cat: 'bodyweight', diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 10, video: 'x7_I1Ms0Yxc', tips: ['Hips high, head between hands', 'Lower the crown of your head', 'Press back up tall'] }
    ],
    arms: [
      { name: 'Close-Grip Bench',   cat: 'compound',   diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 10, video: 'nEF0bv2FW94', tips: ['Hands shoulder-width', 'Elbows tucked tight', 'Drive through the triceps'] },
      { name: 'Bicep Curl',         cat: 'isolation',  diff: 'easy',   emoji: '', anim: 'curl',  sets: 3, reps: 12, video: 'ykJmrZ5v0Oo', tips: ['Elbows pinned to your sides', 'Curl with control', 'Squeeze hard at the top'] },
      { name: 'Hammer Curl',        cat: 'isolation',  diff: 'easy',   emoji: '', anim: 'curl',  sets: 3, reps: 12, video: 'zC3nLlEvin4', tips: ['Neutral grip, thumbs up', 'No swinging', 'Builds forearms and biceps'] },
      { name: 'Skull Crusher',      cat: 'isolation',  diff: 'medium', emoji: '', anim: 'curl',  sets: 3, reps: 10, video: 'd_KZxkY_0cM', tips: ['Upper arms stay vertical', 'Lower to your forehead', 'Extend without flaring'] },
      { name: 'Tricep Pushdown',    cat: 'machine',    diff: 'easy',   emoji: '', anim: 'curl',  sets: 3, reps: 14, video: '2-LAMcpzODU', tips: ['Elbows glued to your sides', 'Push down to full lockout', 'Slow on the way up'] },
      { name: 'Tricep Dip',         cat: 'bodyweight', diff: 'medium', emoji: '', anim: 'press', sets: 3, reps: 12, video: '0326dy_-CzM', tips: ['Keep chest up', 'Lower to 90° at the elbow', 'Press through your palms'] }
    ],
    legs: [
      { name: 'Back Squat',         cat: 'compound',   diff: 'hard',   emoji: '', anim: 'squat', sets: 4, reps: 8,  video: 'ultWZbUMPL8', tips: ['Brace, chest tall', 'Sit between your hips', 'Drive up through mid-foot'] },
      { name: 'Romanian Deadlift',  cat: 'compound',   diff: 'hard',   emoji: '', anim: 'squat', sets: 3, reps: 10, video: 'JCXUYuzwNrM', tips: ['Soft knees, hinge the hips', 'Bar stays close to legs', 'Feel the hamstring stretch'] },
      { name: 'Calf Raise',         cat: 'isolation',  diff: 'easy',   emoji: '', anim: 'squat', sets: 4, reps: 15, video: 'JbyjNymZOt0', tips: ['Full stretch at the bottom', 'Rise onto the big toe', 'Pause and squeeze at the top'] },
      { name: 'Leg Press',          cat: 'machine',    diff: 'medium', emoji: '', anim: 'squat', sets: 3, reps: 12, video: 'IZxyjW7MPJQ', tips: ['Feet shoulder-width', 'Lower until 90°', "Don't lock the knees hard"] },
      { name: 'Leg Extension',      cat: 'machine',    diff: 'easy',   emoji: '', anim: 'curl',  sets: 3, reps: 14, video: 'YyvSfVjQeL0', tips: ['Toes up, drive to lockout', 'Squeeze the quads', 'Control the negative'] },
      { name: 'Walking Lunge',      cat: 'bodyweight', diff: 'medium', emoji: '', anim: 'squat', sets: 3, reps: 12, video: 'L8fvypPrzzs', tips: ['Long step, tall torso', 'Back knee toward the floor', 'Push through the front heel'] }
    ],
    core: [
      { name: 'Ab Rollout',         cat: 'compound',   diff: 'hard',   emoji: '', anim: 'core',  sets: 3, reps: 10, video: 'XdROTNFWiHM', tips: ['Brace, ribs down', 'Roll out as far as you can hold', 'Pull back with the abs'] },
      { name: 'Russian Twist',      cat: 'isolation',  diff: 'medium', emoji: '', anim: 'core',  sets: 3, reps: 20, video: 'wkD8rjkodUI', tips: ['Lean back, brace the core', 'Rotate from the torso', 'Tap each side'] },
      { name: 'Cable Crunch',       cat: 'machine',    diff: 'medium', emoji: '', anim: 'core',  sets: 3, reps: 15, video: '2fbujpVTUjQ', tips: ['Crunch with the abs, not arms', 'Round the spine down', 'Slow return'] },
      { name: 'Plank',              cat: 'bodyweight', diff: 'easy',   emoji: '', anim: 'core',  sets: 3, reps: 45, video: 'pSHjTRCQxIw', tips: ['Straight line head to heels', 'Squeeze glutes and abs', "Don't let hips sag"] },
      { name: 'Crunch',             cat: 'bodyweight', diff: 'easy',   emoji: '', anim: 'core',  sets: 3, reps: 20, video: 'Xyd_fa5zoEU', tips: ['Curl the ribs toward hips', "Don't yank your neck", 'Slow and controlled'] },
      { name: 'Hanging Leg Raise',  cat: 'bodyweight', diff: 'hard',   emoji: '', anim: 'core',  sets: 3, reps: 12, video: 'Pr1ieGZ5atk', tips: ['Hang from the bar', 'Raise legs with control', 'Avoid swinging'] }
    ]
  };

  var CAT_ORDER = ['compound', 'isolation', 'machine', 'bodyweight'];
  var CAT_LABEL = { compound: 'Compound', isolation: 'Isolation', machine: 'Machines', bodyweight: 'Bodyweight' };

  // reps for plank-style core moves are seconds, not reps
  function repUnit(ex) { return (ex.reps >= 30 && ex.anim === 'core') ? 's' : ''; }

  function muscle(id) { return MUSCLES.find(function (m) { return m.id === id; }); }
  function list(id) { return (EX[id] || []).map(function (e) { e.muscle = id; return e; }); }
  function find(id, name) { return list(id).find(function (e) { return e.name === name; }); }
  function groups(id) {
    var byCat = {};
    list(id).forEach(function (e) { (byCat[e.cat] = byCat[e.cat] || []).push(e); });
    return CAT_ORDER.filter(function (c) { return byCat[c]; }).map(function (c) { return { cat: c, label: CAT_LABEL[c], items: byCat[c] }; });
  }

  window.CoreGym = {
    MUSCLES: MUSCLES, EX: EX, CAT_ORDER: CAT_ORDER, CAT_LABEL: CAT_LABEL,
    muscle: muscle, list: list, find: find, groups: groups, repUnit: repUnit
  };
})();
