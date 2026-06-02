# CORE — iPhone walkthrough QA

**URL:** https://resilient-cheesecake-4932d8.netlify.app
**Date:** 2026-05-29 · 21 pages in scope

Open the URL on iPhone Safari. Walk top-to-bottom. ✓ = works, ✗ = broken, ⚠ = ugly/needs polish.

---

## A. Cold landing (no login state)

| # | Step | Expected | Status |
|---|---|---|---|
| 1 | `/` | Black bg matching logo · no scroll · brand at top · "Start journey" CTA · sign-in link below | |
| 2 | Tap "Start journey" | Goes to `/trial.html` step 0 (PROMISE) | |

## B. Trial flow (5 steps + XP tab)

| # | Step | Expected | Status |
|---|---|---|---|
| 3 | Type `PROMISE` → tap Sign | Advances to step 1, XP chip top right shows +5 | |
| 4 | Type `admin` as name | Red ✗ "Reserved name" · 3 suggestions appear | |
| 5 | Type `nigger` as name | Red ✗ "That name isn't allowed" | |
| 6 | Type `stone` | Green ✓ "Available" · CTA enables | |
| 7 | Next → step 2 (profile m/f) | Male/female split icons render from `assets/profile-male-female.png` | |
| 8 | Pick one → step 3 (coach tone) | 4 cards: gentle / balanced / direct / drill — **dark mysterious** palette, not neon | |
| 9 | Step 4 (check-in) | Time options + reminder toggle | |
| 10 | Step 5 (Apple Pay) | Copy reads `$0 due today · then $4.99/mo · cancel any time` | |

## C. Invite-discount

| # | Step | Expected | Status |
|---|---|---|---|
| 11 | Open `/trial.html?ref=BUDDY` | Purple badge "🎁 50% OFF APPLIED · REF: BUDDY" appears above CTA | |
| 12 | Scroll to Apple Pay step | Price shows `$2.50` (halved from $4.99) | |

## D. Dashboard

| # | Step | Expected | Status |
|---|---|---|---|
| 13 | Finish trial → land on `/dashboard.html` | Greeting + 6-row routine including a **17:30 Gym session** row | |
| 14 | After first scroll/tap | Tour coach-mark fires: "Welcome to CORE …" — Got it / Skip tour | |
| 15 | Tap the gym row | Opens `/gym.html` with workout + form videos | |
| 16 | **Long-press the tab bar (1 second)** | Customize sheet slides up · 12 tabs · pick exactly 5 | |

## E. Settings menu (cog → "More")

| # | Step | Expected | Status |
|---|---|---|---|
| 17 | Tap cog → tap "More" | Sub-list expands · "Layout" section at bottom | |
| 18 | Tap "Customize tab bar" | Same sheet as long-press | |
| 19 | Tap "Edit page" | Dashed blue outlines on each widget · ↑↓ buttons · "Edit page" bar at top with Reset / Done | |
| 20 | Reorder a widget → Done | Order persists on reload | |
| 21 | Tap "Theme" | Whole UI flips dark ↔ light | |
| 22 | In light mode: walk profile / feed / dashboard | Backgrounds white, text dark, tabbar inverted, cards readable | |

## F. Content moderation

| # | Step | Expected | Status |
|---|---|---|---|
| 23 | Go to feed → tap a post → comments | Comment input visible | |
| 24 | Type `you fucking idiot` → send | Alert: "Comment blocked — language not allowed. Warning 1 of 2." | |
| 25 | Try 2 more slurs | 3rd time → alert "Your account is paused" → redirects to `/banned.html` | |
| 26 | On banned page | Red icon · "30 days" countdown · "Lifts on Jun 28, 2026" · 3 recent flags listed | |
| 27 | Try to navigate anywhere | Always redirects back to `/banned.html` | |

## G. Recover / reset (for re-testing)

To clear the ban for further testing, open browser DevTools console:
```js
localStorage.removeItem('coreModBan');
localStorage.removeItem('coreModWarnings');
location.reload();
```

To reset everything (start over from cold):
```js
Object.keys(localStorage).filter(k=>k.startsWith('core')).forEach(k=>localStorage.removeItem(k));
location.replace('/');
```

---

## Known gaps (flagged, not bugs)

- Light mode shows ~20% of pages with residual dark chrome — full per-page rewrite is multi-session work (#52)
- Apple Pay is a preview stub — real StoreKit integration needs the iOS shell project
- Notification permission ask is mentioned in trial flow but not wired
- Page edit mode only supports the dashboard's widget set today; other pages show an alert
