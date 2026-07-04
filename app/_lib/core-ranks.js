/* ===========================================================================
   CORE — shared rank ladder (core-ranks.js)
   21 ranks across 7 tiers (Novice → Vanguard), each in 3 grades (I/II/III).
   The dashboard ring, the ranks page and the rank reveal all read THIS list so
   they mirror perfectly. Artwork: previews/assets/ranks/<key>.png
   Load this BEFORE each page's own script.
   =========================================================================== */
(function () {
  window.CORE_RANKS = [
    { name: 'Novice I',      key: 'novice-1',     color: '#C77D3A', xp: 0,      perks: ['Daily life score', 'Streak tracking', 'AI Coach', 'Daily quests'] },
    { name: 'Novice II',     key: 'novice-2',     color: '#C77D3A', xp: 150,    perks: ['Custom quests', 'Weekly review'] },
    { name: 'Novice III',    key: 'novice-3',     color: '#C77D3A', xp: 400,    perks: ['Habit insights', 'Novice profile frame'] },
    { name: 'Initiate I',    key: 'initiate-1',   color: '#AFC0D6', xp: 800,    perks: ['Streak freeze ×1', 'Initiate frame'] },
    { name: 'Initiate II',   key: 'initiate-2',   color: '#AFC0D6', xp: 1400,   perks: ['Advanced stats', 'Coach personalities'] },
    { name: 'Initiate III',  key: 'initiate-3',   color: '#AFC0D6', xp: 2200,   perks: ['Focus tools', 'Milestone rewards'] },
    { name: 'Achiever I',    key: 'achiever-1',   color: '#FFC83D', xp: 3200,   perks: ['Leaderboards', 'Achiever aura'] },
    { name: 'Achiever II',   key: 'achiever-2',   color: '#FFC83D', xp: 4500,   perks: ['Bonus XP events', 'Gold frame'] },
    { name: 'Achiever III',  key: 'achiever-3',   color: '#FFC83D', xp: 6000,   perks: ['Premium quests', 'Streak freeze ×3'] },
    { name: 'Specialist I',  key: 'specialist-1', color: '#3F73E3', xp: 8000,   perks: ['Elite coach', 'Specialist aura'] },
    { name: 'Specialist II', key: 'specialist-2', color: '#3F73E3', xp: 10500,  perks: ['Exclusive chests', 'Custom titles'] },
    { name: 'Specialist III',key: 'specialist-3', color: '#3F73E3', xp: 13500,  perks: ['Advanced insights', 'Specialist frame'] },
    { name: 'Strategist I',  key: 'strategist-1', color: '#9FB0C4', xp: 17000,  perks: ['Strategist aura', 'Double-XP weekends'] },
    { name: 'Strategist II', key: 'strategist-2', color: '#9FB0C4', xp: 21000,  perks: ['Season rewards', 'Prestige badge'] },
    { name: 'Strategist III',key: 'strategist-3', color: '#9FB0C4', xp: 26000,  perks: ['Elite card effects', 'Guild access'] },
    { name: 'Master I',      key: 'master-1',     color: '#FFB23D', xp: 32000,  perks: ['Master aura', 'Legendary chests'] },
    { name: 'Master II',     key: 'master-2',     color: '#FFB23D', xp: 40000,  perks: ['Animated frame', 'Bonus rewards'] },
    { name: 'Master III',    key: 'master-3',     color: '#5AB0E8', xp: 50000,  perks: ['Master aura+', 'Seasonal endgame'] },
    { name: 'Vanguard I',    key: 'vanguard-1',   color: '#FFD24A', xp: 62000,  perks: ['Vanguard aura', 'Prestige rewards'] },
    { name: 'Vanguard II',   key: 'vanguard-2',   color: '#FFD24A', xp: 78000,  perks: ['Legend status', 'Everything unlocked'] },
    { name: 'Vanguard III',  key: 'vanguard-3',   color: '#7FE0FF', xp: 100000, perks: ['Apex Vanguard', 'Eternal legend'] }
  ];

  /* ── CORE_RANK_ICON(rank, size?) — clean SVG insignia, no PNGs needed ──
     Military-clear system: the TIER sets the emblem, the GRADE (I/II/III)
     sets the pips underneath. Stroke line-art in the tier colour.
       Novice     single chevron        Strategist  diamond + chevron
       Initiate   double chevron        Master      star
       Achiever   triple chevron        Vanguard    winged star
       Specialist diamond                                         */
  window.CORE_RANK_ICON = function (rank, size) {
    size = size || 64;
    var idx = window.CORE_RANKS.indexOf(rank);
    if (idx < 0) { for (var i = 0; i < CORE_RANKS.length; i++) if (CORE_RANKS[i].key === (rank && rank.key || rank)) { idx = i; rank = CORE_RANKS[i]; break; } }
    if (idx < 0) { idx = 0; rank = CORE_RANKS[0]; }
    var tier = Math.floor(idx / 3), grade = (idx % 3) + 1, c = rank.color;
    function chev(y, w) { return '<path d="M' + (32 - w) + ' ' + (y + 7) + ' L32 ' + y + ' L' + (32 + w) + ' ' + (y + 7) + '"/>'; }
    var em = '';
    if (tier === 0) em = chev(26, 12);
    else if (tier === 1) em = chev(22, 12) + chev(31, 12);
    else if (tier === 2) em = chev(18, 12) + chev(27, 12) + chev(36, 12);
    else if (tier === 3) em = '<path d="M32 16 L44 29 L32 42 L20 29 Z"/>';
    else if (tier === 4) em = '<path d="M32 14 L43 26 L32 38 L21 26 Z"/>' + chev(41, 11);
    else if (tier === 5) em = '<path d="M32 14 L36.7 24.6 L48 25.4 L39.4 32.9 L42.1 44 L32 37.8 L21.9 44 L24.6 32.9 L16 25.4 L27.3 24.6 Z"/>';
    else em = '<path d="M32 12 L36.4 22 L47 22.8 L38.9 29.8 L41.4 40 L32 34.4 L22.6 40 L25.1 29.8 L17 22.8 L27.6 22 Z"/>'
      + '<path d="M13 34 L20 30 M51 34 L44 30 M15 40 L22 36 M49 40 L42 36"/>';
    var pips = '';
    for (var g = 0; g < grade; g++) {
      var px = 32 + (g - (grade - 1) / 2) * 9;
      pips += '<circle cx="' + px + '" cy="52" r="2.4" fill="' + c + '" stroke="none"/>';
    }
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="' + c + '"'
      + ' stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
      + ' style="filter:drop-shadow(0 0 6px ' + c + '66)">'
      + '<path d="M32 3 L57 15 L57 38 C57 49 46 57.5 32 61 C18 57.5 7 49 7 38 L7 15 Z" stroke-opacity="0.45" stroke-width="2"/>'
      + em + pips + '</svg>';
  };
})();
