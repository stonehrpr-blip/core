# Hand-off — Score-page routing is now CENTRALIZED (read before editing routing)

**Branch:** `lane-wealth-routing` (commit `46dd796`, parent `a2234c0` = the shared
Lane6-polish base). Clean: diff vs base is exactly 4 files — `_lib/core-state.js`,
`20-dashboard.html`, `stat.html`, `wealth.html`. No other lane's work is in it.

## What changed & why
Routing from a stat to its page is now **data-driven off the single source of
truth** (`STAT_DEFS` in `_lib/core-state.js`). Each bespoke stat carries a
`page:` field:

```js
{ key: 'strength', page: 'strength.html', model: 'body',   ... },
{ key: 'focus',    page: 'focus.html',    model: 'brain',  ... },
{ key: 'wealth',   page: 'wealth.html',   model: 'wallet', ... },
// health / social / purpose have NO page → fall back to the generic stat detail
```

Both render sites now resolve the href the same way:

```js
// 20-dashboard.html (life-cards)  AND  stat.html (switcher)
href = d.page || ('stat.html?s=' + d.key);
```

### Why this was needed
- The dashboard life-card line had grown a **3-deep ternary**
  (`d.key==='wealth'?…:d.key==='focus'?…:d.key==='strength'?…`) — three lanes
  all editing **one shared line**. A clobber waiting to happen.
- `stat.html`'s switcher only had the **wealth** ternary, so its **Focus** and
  **Strength** chips opened the generic `stat.html?s=…` — inconsistent with the
  dashboard. That bug is now fixed (verified: switcher sends focus→focus.html,
  strength→strength.html, wealth→wealth.html).

## 🚫 DO NOT (focus / strength / any future score-page lane)
- **Do NOT re-add per-stat ternaries** to the dashboard life-card line or the
  `stat.html` switcher line. They are intentionally generic now.
- To wire a NEW bespoke score page, add **one field** in `core-state.js`
  `STAT_DEFS`: `page: 'yourpage.html'`. Nothing else. Both render sites pick it
  up automatically and can never disagree again.

## Notes
- `focus.html` and `strength.html` are **owned by their lanes** and are NOT in
  this branch (still untracked in the shared tree). This branch links to them;
  they arrive when those lanes' branches merge. `wealth.html` IS in this branch.
- The shared working tree still carries everyone's in-flight edits (incl. this
  routing change, live for local testing). Committed via private-index plumbing
  — shared HEAD/index/worktree untouched (per the concurrent-git rules).

Verified: dashboard renders 6 life-cards with hrefs
`strength.html | focus.html | wealth.html | stat.html?s=health | …social | …purpose`;
stat.html switcher matches. No JS console errors.
