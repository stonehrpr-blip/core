# CORE — Launch Readiness Checklist

_Last updated by an overnight polish pass. Tick items as they're verified on a real phone._

## 🚪 Onboarding / Trial (`previews/07-trial.html`)
- [x] All steps fit on one screen (no scroll)
- [x] Colors unified to the index blue (`#0A84FF`)
- [x] Coach-tone, tackle-first, and 30-day cards restyled (Apple-frosted)
- [x] Final connect step rebuilt as the cinematic portal subscription gate
- [x] Inline JS parses clean
- [ ] Walk the whole flow on a real phone, every habit path (vape/alcohol/porn/doomscroll/spend/build)
- [ ] Confirm progress bar + chapter labels after the reorder
- [ ] Confirm portal gate → rank-reveal → first-chest → dashboard chain end to end

## 🏠 Core App Pages
- [x] Every internal nav link resolves (no 404s in real app navigation)
- [x] Bottom nav consistent across main pages (Dashboard/Quests/More/Coach/Community)
- [x] Inline JS on all 38 pages parses clean
- [ ] Dashboard stats seed correctly from trial answers
- [x] Coach: every button/scanner box opens a page (verified — all 7 scan cards navigate; Coach Chat + Mind open the chat surface)
- [ ] Pillars (Strength/Focus/Health/Wealth/Social/Willpower) reviewed on device
- [x] `social.html` bottom nav — already has the full tab bar (stale item)
- [x] No JS errors on load OR interaction across all pages (fuzz-tested)
- [x] Fixed: dynamically-injected scripts (AI/tasks/moderation/tour/settings) 404'd via a bad path prefix in core-theme.js — now resolve on every host path
- [x] Fixed: sound/mute toggle threw `sfxToast is not defined` on every page (core-sfx.js)
- [x] Fixed: profile re-render crashed on null `#bgEl` (core-background.js removes it)

## 🎨 Consistency & Polish
- [x] Apple-touch-icon + favicons on every page (home-screen install)
- [x] `theme-color` meta on every page (mobile browser chrome matches the dark app)
- [x] Gallery (`97-gallery.html`) — unbuilt pages auto-marked "Soon" (no dead links)
- [x] Every shipped page includes `core-responsive.css` (scales 390×844 to real phones)
- [x] Player ID (`CORE-XXXX-XXXX`) confirmed generated at rank-reveal (not a stuck placeholder)
- [ ] One palette everywhere (index blue + dashboard pillar colors)
- [ ] No clipped buttons / cut-off content on any screen (device check)

## 💳 Payment flow (single point)
- [x] Payment collected once — at the final portal gate (paywall no longer opens a 2nd Apple Pay sheet)
- [x] Stale `corePayPending` cleared when the card is captured (no downstream re-prompt)
- [x] Price is consistent everywhere (**$7.99/mo · $44.99/yr**) — the old $4.99 was only a wallet shard-pack, not the subscription (stale item)
- [ ] Wire to real billing (currently a mockup)

## 🔌 Data & Accounts
- [ ] Decide: stay localStorage-only or wire real cloud sync (Supabase)
- [ ] Sign-in pages (`04/05/06`) persist an account
- [ ] Trial data survives reload / new device (currently local-only)
- [ ] Payment is a mockup — must be wired to real billing before launch

## 🚀 Deployment & Legal
- [x] Live on GitHub Pages
- [x] Legal / Refund / Community-guidelines pages exist and are linked
- [ ] Custom domain (optional)
- [ ] App logo + share preview finalized

## 🐛 Pre-launch QA
- [ ] iPhone Safari + Android Chrome pass
- [x] No broken internal links between shipped pages
- [ ] Sound/haptics respect mute + reduced-motion
- [ ] Animations smooth on mid-range phones

---
### Notes from the audit
- 84 dead links existed only in the owner-only gallery index; now auto-dimmed as "Soon".
- No broken `_lib/` or `assets/` references (earlier "missing" hits were query-string or dynamic-JS false positives).
- All 38 pages' inline scripts parse without syntax errors.
