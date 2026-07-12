/* ===========================================================================
   CORE — shared rank ladder (core-ranks.js)
   10 elemental tiers (Wood -> Core), each in 3 grades (I/II/III) = 30 ranks.
   The dashboard ring, the ranks page and the rank reveal all read THIS list so
   they mirror perfectly. Artwork: previews/assets/ranks/<key>.png
   Load this BEFORE each page's own script.
   =========================================================================== */
(function () {
  window.CORE_RANKS = [
    { name: 'Wood I', key: 'wood-1', color: '#9C6B3E', xp: 0, perks: ['Daily life score'] },
    { name: 'Wood II', key: 'wood-2', color: '#9C6B3E', xp: 55, perks: ['Daily life score', 'Streak tracking'] },
    { name: 'Wood III', key: 'wood-3', color: '#9C6B3E', xp: 253, perks: ['Daily life score', 'Streak tracking', 'Wood profile frame'] },
    { name: 'Silver I', key: 'silver-1', color: '#C7CBD3', xp: 617, perks: ['Custom quests'] },
    { name: 'Silver II', key: 'silver-2', color: '#C7CBD3', xp: 1161, perks: ['Custom quests', 'Weekly review'] },
    { name: 'Silver III', key: 'silver-3', color: '#C7CBD3', xp: 1897, perks: ['Custom quests', 'Weekly review', 'Silver profile frame'] },
    { name: 'Fire I', key: 'fire-1', color: '#FF6A45', xp: 2833, perks: ['Habit insights'] },
    { name: 'Fire II', key: 'fire-2', color: '#FF6A45', xp: 3977, perks: ['Habit insights', 'Streak freeze x1'] },
    { name: 'Fire III', key: 'fire-3', color: '#FF6A45', xp: 5335, perks: ['Habit insights', 'Streak freeze x1', 'Fire profile frame'] },
    { name: 'Water I', key: 'water-1', color: '#3F8CFF', xp: 6913, perks: ['Advanced stats'] },
    { name: 'Water II', key: 'water-2', color: '#3F8CFF', xp: 8717, perks: ['Advanced stats', 'Coach personalities'] },
    { name: 'Water III', key: 'water-3', color: '#3F8CFF', xp: 10750, perks: ['Advanced stats', 'Coach personalities', 'Water profile frame'] },
    { name: 'Earth I', key: 'earth-1', color: '#55B978', xp: 13019, perks: ['Focus tools'] },
    { name: 'Earth II', key: 'earth-2', color: '#55B978', xp: 15525, perks: ['Focus tools', 'Milestone rewards'] },
    { name: 'Earth III', key: 'earth-3', color: '#55B978', xp: 18274, perks: ['Focus tools', 'Milestone rewards', 'Earth profile frame'] },
    { name: 'Ice I', key: 'ice-1', color: '#8FE3FF', xp: 21270, perks: ['Leaderboards'] },
    { name: 'Ice II', key: 'ice-2', color: '#8FE3FF', xp: 24515, perks: ['Leaderboards', 'Streak freeze x2'] },
    { name: 'Ice III', key: 'ice-3', color: '#8FE3FF', xp: 28012, perks: ['Leaderboards', 'Streak freeze x2', 'Ice profile frame'] },
    { name: 'Lightning I', key: 'lightning-1', color: '#FFD84A', xp: 31766, perks: ['Bonus XP events'] },
    { name: 'Lightning II', key: 'lightning-2', color: '#FFD84A', xp: 35778, perks: ['Bonus XP events', 'Streak freeze x3'] },
    { name: 'Lightning III', key: 'lightning-3', color: '#FFD84A', xp: 40052, perks: ['Bonus XP events', 'Streak freeze x3', 'Lightning profile frame'] },
    { name: 'Dark I', key: 'dark-1', color: '#9B6BE0', xp: 44591, perks: ['Elite coach'] },
    { name: 'Dark II', key: 'dark-2', color: '#9B6BE0', xp: 49396, perks: ['Elite coach', 'Exclusive chests'] },
    { name: 'Dark III', key: 'dark-3', color: '#9B6BE0', xp: 54471, perks: ['Elite coach', 'Exclusive chests', 'Dark profile frame'] },
    { name: 'Light I', key: 'light-1', color: '#FFD24A', xp: 59817, perks: ['Season rewards'] },
    { name: 'Light II', key: 'light-2', color: '#FFD24A', xp: 65438, perks: ['Season rewards', 'Prestige badge'] },
    { name: 'Light III', key: 'light-3', color: '#FFD24A', xp: 71335, perks: ['Season rewards', 'Prestige badge', 'Light profile frame'] },
    { name: 'Core I', key: 'core-1', color: '#E7ECF2', xp: 77511, perks: ['Everything unlocked'] },
    { name: 'Core II', key: 'core-2', color: '#E7ECF2', xp: 83967, perks: ['Everything unlocked', 'Eternal legend'] },
    { name: 'Core III', key: 'core-3', color: '#E7ECF2', xp: 90706, perks: ['Everything unlocked', 'Eternal legend', 'Core profile frame'] }
  ];
})();
