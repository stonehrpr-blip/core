# Module Mapping — Legacy 14 → New 5 Stats

**Decision date:** 2026-05-25
**Status:** v0.1 architectural plan

The legacy CORE PWA (at `~/Desktop/Zilo-edit`) tracks 14 life modules, each with its own 0–100 score and a rolling Life Score. The new CORE (this repo) introduces a 5-stat model designed for visceral feedback and home-screen-widget summarization.

These two models need to coexist during migration and converge over time.

---

## Why 5 stats instead of 14 modules

The legacy 14-module model is great for *depth* (a serious user gets granular feedback per area) but bad for:
- **Glanceability** — 14 numbers don't fit a home-screen widget or an at-a-glance dashboard
- **Visceral storytelling** — "your gym score is 67" doesn't trigger the same response as "your lungs avatar is coming back to pink"
- **Onboarding** — picking 14 things to track at sign-up is overwhelming
- **Sharing** — TikTok-ready share cards need ONE strong number, not 14

The new 5 are **stat archetypes** that the legacy 14 modules *feed into*. Think Apple Health rings: many sources, one ring.

---

## The 5 stats

| Stat | Identity | Visual metaphor |
|------|----------|-----------------|
| **Lungs** | Capacity, recovery, clarity of breath | Pink lungs darken/heal |
| **Brain** | Focus, presence, dopamine regulation | Brain glow/melt |
| **Wallet** | Financial restraint and intention | Coins fill/drain |
| **Willpower** | The flame — discipline, consistency, follow-through | Flame bright/dim |
| **Body** | Composition, vitality, movement | Avatar physique |

---

## Legacy module → stat mapping

| Legacy module | Primary stat | Secondary stat(s) | Notes |
|---------------|--------------|-------------------|-------|
| **gym** | Body | Willpower | Sessions/week, training load |
| **food** | Body | Willpower, Wallet | Calories, macros; eating out cost → Wallet |
| **sleep** | Body | Brain | Hours vs 8h target; sleep debt → Brain decay |
| **health** | Body | Lungs | Water + steps + weight; activity → Lungs recovery |
| **skincare** | Body | — | Routine adherence (small contribution) |
| **style** | Body | — | Outfit tracking, fashion progression |
| **mind** | Brain | — | Meditation, journaling, reflection |
| **learning** | Brain | Willpower | Daily learning time |
| **relationships** | Brain | Willpower | Friend/family check-ins (consistency = WP) |
| **money** | Wallet | Willpower | Spending tracking, budget adherence |
| **career** | Wallet | Brain | Career goals, progression metrics |
| **discipline** | Willpower | — | Cold showers, hard things, commitments kept |
| **routine** | Willpower | — | Morning/evening routine completion |
| **plan** | Willpower | Brain | Daily task completion |

**Stat coverage (primary modules only):**
- Body: 6 modules (gym, food, sleep, health, skincare, style)
- Brain: 3 modules (mind, learning, relationships)
- Wallet: 2 modules (money, career)
- Willpower: 3 modules (discipline, routine, plan)
- Lungs: 0 legacy modules — all habit-driven (no legacy module covered breath/recovery from substances)

---

## Habit slip → stat impact

Per `apps/mobile/constants/habits.ts`, each habit slip costs XP on a primary stat and (usually) Willpower as a secondary. Summary:

| Habit | Primary impact | Secondary impact |
|-------|----------------|-------------------|
| vape | Lungs | Willpower |
| weed | Lungs | Brain, Willpower |
| nicotine_pouch | Willpower | Lungs |
| doomscroll | Brain | Willpower |
| porn | Willpower | Brain |
| spend | Wallet | Willpower |
| drink | Body | Willpower |
| junk_food | Body | Willpower |

**Note:** every slip costs Willpower — Willpower is the "spine" stat that runs through all behavior.

---

## Stat value computation

For each stat `s` at time `t`:

```
stat_value(s, t) = clamp(
    baseline (= 60)
  + 0.7 × weighted_avg(primary_module_scores_today(s))
  + 0.3 × weighted_avg(secondary_module_scores_today(s))
  − sum(habit_xp_lost_today(s))
  + recovery_xp_today(s)
  − daily_decay(s)
, 0, 100)
```

Where:
- `module_score` is the 0–100 score the legacy module already computes (reused verbatim from `core-store.js` SCORERS)
- `habit_xp_lost_today(s)` sums `xp_loss_per_slip` from all habit slips where habit's primary or secondary stat == s
- `recovery_xp_today(s)` is XP recovered from completed recovery quests
- `daily_decay(s)` is from `stats.decayPerDayWithoutSlip` (currently only Body has a non-zero default)

This is a **derivation** — the stat is always recomputable from underlying data. Same philosophy as legacy `core-store.js`: stats are derived, not stored as ground truth.

---

## UI implications

### Home screen (5-stat overview)
- 5 stat rings, one per stat
- Tap a ring → drill-down screen showing all contributing modules + recent habit slips affecting this stat

### Stat drill-down screen (`/stats/[stat]`)
- Big number for current value + trend graph (last 30 days)
- "Contributing modules" section — each contributing module's current 0–100 score + how it influences this stat
- "Recent slips" section — habits that have cost XP today/this week
- "Recovery actions" — what to do to nudge this stat up (uses AI coach)

### Widget
- Small: 1 stat ring + overall Life Score
- Medium: 4 stats + Life Score
- Large: all 5 stats + last slip time + streak

---

## Migration from legacy CORE PWA

If the user has data in legacy CORE (localStorage), we offer a one-shot import:

1. User signs into legacy CORE in browser → exports a JSON dump (legacy adds an "Export" button)
2. User opens new CORE app, taps "Import from old CORE" in onboarding
3. App reads JSON, runs legacy SCORERS to compute initial module scores
4. Module scores → initial stat values via the formula above
5. Habit data carries over as `user_habits` records
6. After import: user can stop using the PWA; both apps now in sync via export/import (no live sync — too complex)

This export/import path keeps the old PWA functional while users migrate at their own pace.

---

## Open questions

- Do we expose all 14 modules to free-tier users, or gate some behind Pro?
- Should Lungs auto-decay even without habit slips (e.g., for users who don't track substances)? Probably no — keep Lungs static at baseline 60 until first vape/weed habit is added.
- Style + Skincare are tiny contributors to Body — keep them as separate modules, or fold into a single "Appearance" sub-stat?
- Career might deserve its own stat eventually (separate from Wallet) — but for v1, bundling is fine.

---

## Implementation order

1. ✅ This mapping doc (you are here)
2. Add `apps/mobile/constants/modules.ts` with the 14 module slugs + their stat mappings
3. Update `apps/mobile/constants/stats.ts` to add `contributingModules: ModuleSlug[]` per stat
4. Build `lib/stats/stat-engine.ts` implementing the formula above
5. Wire the Home dashboard to render rings from the engine
6. Build stat drill-down screen reading contributing modules + slips
7. Build module-input screens (port one at a time from legacy PWA, starting with the most-used: gym, food, sleep)
