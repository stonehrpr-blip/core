# Core — 90-item Finalization Checklist

**Goal:** Take the app from "decent preview" to "actually worth $3.99/mo." Every page redesigned, every button working, AI assistant that runs real tasks for the user, pricing built in.

**Method:** I work autonomously through this list once you say "go." Mark items ☑ as done.

---

## A. Foundation & global polish (1–8)

1. ☐ Lock the app name (rename across all 17+ files + bundle ID)
2. ☐ Extract phone-frame shell + grain + tab bar into a single shared component (kill ~400 lines of duplication across previews)
3. ☐ Unify back-button pattern (glass circle on every screen, consistent left-position)
4. ☐ Unify type scale + font weights — audit all 13 pages for drift
5. ☐ Add loading-skeleton states for every dynamic surface (dashboard cards, feed, leaderboard)
6. ☐ Add empty states ("No slips yet", "Add friends to see their journeys", "No achievements yet")
7. ☐ Add error states with retry buttons
8. ☐ Add `prefers-reduced-motion` fallbacks across every animation

## B. Welcome + onboarding (9–15)

9. ☐ Compress onboarding from 4 screens → 2 screens (welcome carries the pitch; combine baseline+permissions)
10. ☑ Build the missing **sign-in screen** (currently 404 from welcome) — `sign-in.html` shipped
11. ☐ Welcome: subtle stagger animation on orb appearance (instead of all-at-once)
12. ☐ Pick-habits: "We recommend starting with 1–2" guidance + per-habit privacy mode preview
13. ☐ Baseline: scroll-picker wheels for age/height (iOS-native feel) instead of plain inputs
14. ☐ Baseline: "Skip for now" option (let users defer details)
15. ☐ Permissions: rewrite as "Here's why" cards with visible benefit instead of a wall of asks

## C. Dashboard subtraction + clarity (16–23)

16. ☐ Subtract: pick what stays vs what moves to drilldowns (it's getting cluttered)
17. ☐ Make Life Score the unmistakable hero (currently competing with rank pill)
18. ☐ Each stat card gets a 7-day micro-sparkline inline
19. ☐ Quick actions: make copy stat-aware ("Log slip" → "Log vape slip" if vape is your only active habit)
20. ☐ Today feed: cap at 3 items, deep-link to /feed for more
21. ☐ Add "morning brief" card (collapsed by default, expands to show AI summary of yesterday)
22. ☐ Add floating action button (FAB) for "Log slip" — industry pattern, replaces fishing for the right habit
23. ☐ Pull-to-refresh visual with electric blue accent

## D. Habit pages redesign — finish the signature mechanic (24–33)

24. ☑ Reframe button copy: "I just took a puff" → "Mark a puff" (neutral, less shame)
25. ☑ All 8 habits handled by one universal template `habit.html` (#vape, #doomscroll, #drink, #spend, #porn, #junk_food, #weed, #nicotine_pouch)
26. ☑ Each habit gets its own avatar SVG + color + particle style + Coach insight + button copy
27. ☑ Added recent slips list (Today + history + trigger notes)
28. ☑ Added 7-day trend graph (SVG filled curve)
29. ☑ Added "Triggers spotted" section with hot/normal pill chips
30. ☑ Added "Protect streak" button (50 XP cost)
31. ☑ Added "Honest craving" log (+5 Willpower)
32. ☐ Per-habit settings sheet (pause / archive / change target / privacy mode)
33. ☑ Recovery prompt slides up immediately after slip

## E. Recovery quest improvements (34–38)

34. ☐ Add 3 quest variants: breath / journal / move (rotate so it doesn't feel repetitive)
35. ☐ AI coach response uses real Claude call (currently mock)
36. ☐ Animate XP recovery satisfyingly (number flies into stat ring)
37. ☐ Show "Honest streak" counter during the quest
38. ☐ Skippable but with a soft nudge ("This usually helps — even 30 seconds")

## F. AI Coach + Jarvis tasks (39–52) — biggest section

39. ☐ Voice input: tap mic → speak → live transcription appears in chat
40. ☐ **Coach can run actions** (confirmation-gated per your AI safety preference) — each requires a "Yes, do it" tap before execution
41. ☐   Action: "Log a [habit] slip" → confirms → logs + opens recovery
42. ☐   Action: "Show my [stat] stat" → opens drilldown
43. ☐   Action: "Pause my [habit] habit" → confirms → pauses + back to dashboard
44. ☐   Action: "Set a [time] nudge for [reason]" → confirms → creates scheduled notification
45. ☐   Action: "Draft a post about [topic]" → drafts → preview → posts on confirm
46. ☐   Action: "Add a new habit" → opens picker
47. ☐   Action: "Recover XP from [event]" → opens recovery quest
48. ☐   Action: "Summarize my week" → renders summary inline
49. ☐ Suggested prompts adapt to current state (not hardcoded)
50. ☐ Conversation history list (sidebar / previous chats)
51. ☐ Token-by-token streaming (feels alive)
52. ☐ "Coach knows" context pill showing what data the AI has access to

## G. Pricing + monetization (53–62)

53. ☑ Build `pricing.html` — full marketing page (hero, comparison table, FAQ, trust line)
54. ☑ **Free tier**: 1 habit · 1 visible stat · basic dashboard · NO widget / coach / social / scanners
55. ☑ **Pro Monthly**: **$3.99/mo** — unlimited habits + all 5 stats + widget + AI coach + recovery + social + scanners
56. ☑ **Pro Annual**: **$34.99/year** (= $2.92/mo · save 27%) with "Most popular" badge
57. ☑ 7-day free trial (no card required to start, ask on day 6)
58. ☑ Trust line: "Cancel anytime · Privacy-first · No data sale ever"
59. ☑ Feature comparison table (Free vs Pro)
60. ☑ FAQ section: "Can I switch plans?", "What's in the trial?", "Refunds?"
61. ☑ Paywall component (modal) — `paywall.html` shipped (4 perks + price pill + trial CTA)
62. ☑ Settings → Subscription row links to pricing

## H. Feed + privacy guards (63–72)

63. ☐ Per-habit privacy mode at creation: private / friends / public
64. ☐ Default SENSITIVE habits (porn, weed, drinking) to **private**
65. ☐ Anonymous post mode (post as "Anonymous" without rank/name)
66. ☐ Slip posts NEVER auto-publish (always manual)
67. ☐ Content-warning blur on certain post types (with "Show" tap)
68. ☐ Report button on every post (in the 3-dot menu)
69. ☐ "Hide this user" + "Mute this topic" options
70. ☐ Feed empty state: "Add friends to see their journeys" with action button
71. ☐ Word filter v2: simulate server-side moderation (loading spinner when posting)
72. ☐ Comments/thread screen (tap a post → see replies)

## I. Compose v2 (73–77)

73. ☐ Auto-suggest stat tags based on post content (NLP-lite)
74. ☐ Image upload UX (placeholder image picker)
75. ☐ Live preview as you type (see exactly how it'll appear in feed)
76. ☐ Visibility selector chip in header (public / friends / private / anonymous)
77. ☐ Anonymous toggle that visibly strips name + rank from preview

## J. Ranks + XP economy (78–82)

78. ☐ Define **actual XP economy** (currently undefined): list every action and its XP value
79. ☐ Rank thresholds visible on leaderboard: Focus 0–200 / Spark 200–600 / Flow 600–1200 / Forge 1200–2000 / Edge 2000–3000 / Peak 3000–5000 / Apex 5000+
80. ☐ Rank-up celebration screen (cross a tier → cinematic moment with the new badge)
81. ☐ Weekly XP visible reset (Sunday midnight) + weekly leaderboard distinct from all-time
82. ☐ Global leaderboard view (not just friends) with country filter

## K. Profile + stat drilldowns + bug fixes (83–90)

83. ☐ Profile: clickable achievements → modal with story (basic grid done, modal TBD)
84. ☑ Built `stat.html` universal drilldown — 5 stats via #hash · ring + 30-day chart + contributing modules + AI insight + recent activity
85. ☐ Profile: "Posts" tab shows your own posts in a grid (segmented tab exists, content TBD)
86. ☐ Profile: "Activity" tab shows XP timeline (segmented tab exists, content TBD)
87. ☑ `find-friends.html` shipped — search + QR + invite link + suggested contacts + same-habit suggestions + pending requests
88. ☑ `notifications.html` shipped — Today/Yesterday/Earlier groups + unread dots + tappable inline actions + friend requests
89. ☑ Wired major routes: dashboard stat cards → stat.html#x · settings → pricing/find-friends/notifications · welcome → quiz · feed comments → comments.html · feed menu → action sheet
90. ☑ Updated index.html gallery to 22 screens with status pills

---

## Pricing summary (for the page)

| Plan | Price | Per month equivalent | Habits | Coach | Widget | Social | Scanners |
|------|-------|----------------------|--------|-------|--------|--------|----------|
| Free | $0 | — | 1 | ❌ | ❌ | View only | ❌ |
| **Pro Monthly** | $3.99 / mo | $3.99 | Unlimited | ✅ | ✅ | ✅ | ✅ (S2+) |
| **Pro Annual** | $34.99 / yr | **$2.92** (save 27%) | Unlimited | ✅ | ✅ | ✅ | ✅ (S2+) |

7-day free trial · no card required to start · cancel anytime in Settings.

---

## What "done" looks like at the end

- 13 existing screens redesigned + cleaned (no clutter, no broken buttons)
- ~10 new screens added (sign-in, 7 habit pages, 5 stat drilldowns, pricing, paywall, comments, find-friends, rank-up celebration, notifications)
- Every button routes correctly
- AI Coach actually runs tasks (with confirmation gates)
- Pricing page live, free/pro/annual tiers explicit
- Privacy guards for sensitive habits
- Word filter v2 with simulated server moderation
- XP economy defined and visible
- Memory + README updated
- Final Safari tour: walk through entire app, every screen works
