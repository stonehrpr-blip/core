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
})();
