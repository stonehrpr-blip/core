# Focus page — HANDOFF (2026-06-06)

`previews/focus.html` — the CORE Focus trainer (brain zones, focus sessions, missions, streak, stats). Built as the **template** for the other score pages (greenlit to be replicated once solid). Committed clean on branch **`focus`** (off `main`), together with this file.

## Link status (both files owned by `lane/mmorpg`, edited in the shared worktree)

### 1. Dashboard → Focus — ✅ ALREADY WORKS, no action needed
`lane/mmorpg` made the life-card link data-driven: `previews/20-dashboard.html` now does
`card.href=(d.page || ('stat.html?s='+d.key))`, and `coreState.STAT_DEFS` (in `_lib/core-state.js`)
already carries `page: 'focus.html'` on the `focus` stat. So tapping the **Focus** life-card opens
`focus.html` automatically. My earlier manual special-case edit was both clobbered and superseded by
this cleaner approach — **do not re-add it.** (If the `page` field is ever dropped, restore
`page: 'focus.html'` on the `focus` entry in `core-state.js` STAT_DEFS — that's the single hook.)

### 2. `previews/24-more.html` — add a "Focus" row to the More menu (the one pending edit)
This row is mine and uncommitted in the shared worktree (the `Collection`-structured More menu is
`lane/mmorpg`'s uncommitted work, no clean base to commit against). If that menu is overwritten,
re-apply:
Immediately **after** `<div class="scroll">` and **before** `<div class="sec">Collection</div>`, insert:
```html
        <div class="sec">Training</div>
        <div class="menu">
          <a class="row" href="focus.html" style="--ic:#4A8FFF"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V4.5A2.5 2.5 0 0 0 9 4Z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0"/></svg></span><span class="tx"><b>Focus</b><span>Train your mind &amp; run focus sessions</span></span><span class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg></span></a>
        </div>
```
`focus.html` also carries its own bottom nav (Home/Quests/Shop/Profile/More) + back button → dashboard, so it's navigable independent of these edits.

## State integration (already wired in focus.html)
- Completing a session calls `coreState.addXp(xp,'focus:…')` + `coreState.addStat('focus', n, 'quest:focus-…')` → feeds real XP→Level→Rank and the Focus(Brain) stat.
- Focus-specific data lives in its own `localStorage` key `coreFocus.v1` (zones / sessions / streak / distractions / lastTick / lastRaise).

## Fixes applied this round (vs first cut)
- **Distraction penalty no longer trigger-happy.** Backgrounding (call / shade / auto-lock / app-switch) now **pauses** the timer with **no penalty** and resumes on return. The −5 XP light penalty fires **only** on a deliberate "End session" tap. Streak is never reset.
- **Brain zones decay over idle days.** `applyZoneTick()` mirrors `coreState.applyStatTick` — idempotent once/day, capped at 7 idle days, 24h grace per zone (a zone trained in the last day doesn't decay). Runs on load next to the shared stat tick. The brain now reflects **recent** focus, not lifetime totals. Rates: prefrontal/parietal/temporal −3/day, limbic/occipital −4/day.

## Parked (do NOT build yet — re-raise after other score pages exist)
ambient focus sound · stronger streak particle auras · Home quick-action tile · `97-gallery.html` entry · the other 5 score pages (Focus is the template).

## QA
`?fast=1` runs timers in seconds. Verified headlessly: alive render, focus-mode countdown, real session completion (+40 XP / +1 Focus), and zone decay (72→60 etc. after 4 idle days).
