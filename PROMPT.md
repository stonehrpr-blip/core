# CORE — Master Context Prompt

You are working on **CORE**, a premium iOS-style life-optimization app ("life OS") built by Stone Harper. It gamifies becoming a better person: users quit a destructive habit (or build discipline from scratch), get a personalized 30-day plan, an AI coach named **Corbit**, daily quests, XP, ranks, streaks, chests, and a "Life Score." Think *Duolingo's game loop × Apple's design language × a quit-vaping/porn/doomscrolling coach*.

## Tech reality (do not fight this)
- The whole app is **self-contained HTML/CSS/vanilla-JS pages** (no React, no build step) served statically. One file per screen, numbered by flow order. Shared code lives in `_lib/` (accounts, ranks, i18n, analytics, AI proxy, SFX, push, habit engine, etc.).
- Every page renders inside a **390×844 iPhone frame** (`.phone`) with notch + home indicator on desktop, and goes full-bleed responsive on real phones (works down to 320×568).
- Backend: **Supabase** (already configured in `_lib/core-config.js`) for auth (email OTP works; Apple/Google OAuth pending dashboard setup) and a `profiles` table (display_name, onboarded, trial_state jsonb, coreId, timestamps). Preview/offline mode falls back to a localStorage account simulator. AI chat goes through a Cloudflare Worker proxy (`core-ai`), and Corbit's in-trial chat can use a user-supplied OpenAI key (localStorage `corbApiKey`).
- State that matters is in **localStorage**: `coreOnboardTrial` (all trial answers), `coreOnboardComplete`, `coreSubscribed`, `coreXP`, `coreRank`, `coreName`, `coreIdNumber`, `coreFaceAvatar` (selfie data-URL), `coreVoiceLinked`, `corePasskeyCred`, `coreLang`, `corbitIntroDone`, `coreEmailSkipped`.

## Design system (sacred — never break it)
- **Matte black (#000–#08090C) + brushed steel.** Ink is white; accents are silver (#AEB6C4 / #C4C9D2 / #D6DBE2); glow is cool steel `rgba(206,212,222,…)`. Sparse twinkling starfield + film grain on every onboarding page. SF Pro (system font), tight letter-spacing, big display titles with a metallic sheen on the second line (`<span class="g">`).
- Color is used **only with intent**: rainbow ramp on the commitment meter (red→orange→yellow→green→blue), Apple-green (#30D158) for Face ID/success ticks, growth-green on the 30-day plan ring, tier colors on rank insignia, holographic foil on the CORE ID card. Everything else stays monochrome steel.
- Questions/copy sit in a **left-aligned editorial column**; controls are large tappable cards/chips with springy press animations (pop, ripple, glow ring), staggered entrances, particle bursts on selection, haptics (`navigator.vibrate`) everywhere.
- 11-language i18n via `_lib/core-i18n.js` (`data-i18n` / `data-i18n-html` attributes, RTL-aware); language picker is a globe button on the launch screen.

## THE FLOW (exact page chain)

**1. `01-index.html` — Launch.** Matte-black hero: floating CORE logo with halo, "Become your core.", typewriter subline, tap-anywhere-to-continue with particle-burst exit. Topbar: globe (language sheet) + profile icon (→ sign-in `04`). → `07-trial.html?fresh=1`.

**2. `07-trial.html` — The 9-step trial (the heart of the funnel).** Fresh-start guard wipes stale answers. Progress line + XP chip (+5 per step) at top. Steps (data-step ids in brackets):
   1. **Name + age** [1] — first name + age chips.
   2. **Profile** [2] — male/female/prefer-not, steel silhouettes, ripple+pop select, auto-advance.
   3. **What are you tackling first?** [4] — habit picker: Vape / Alcohol / Porn / Doom-scroll / Spending / "Just build". Branches all downstream copy.
   4. **What's this really for?** [9] — the emotional why: health / self-control / someone I love / money / just done.
   5. **Who do you want to become?** [23] — identity cards (Disciplined / Calm / Sharp / Free of it), 2×2 grid.
   6. **Meet Corbit** [24] — THE AI reveal. Corbit is a glossy dark robot head with glowing ice eyes and a smile (blinks, glances around, bobs). User taps mic and reads aloud: *"Hey Corbit — this is my voice. Let's get to work."* Web Speech API highlights each word white as it's heard; on ≥75% match the mic button flips green with a glow, the waveform flashes green, Corbit bounces + winks, sparks burst. Skippable. Corbit appears ONLY here during onboarding (plus a dockable chat orb w/ GPT sidebar available post-intro).
   7. **How committed?** [22] — 5 rainbow bars, tap/drag, sets plan intensity.
   8. **Your 30-day plan** [16] — personalized payoff: green life-score ring counting up (today → day-30, scaled by commitment), 4 stat bars per habit, money-saved card, "When it kicks in" day-3/7/14/30 milestone timeline per habit, their why quoted back.
   9. **The contract** [0] — "This only works if you mean it." Signature draws itself in ink, PROMISE rubber stamp slams, slide-to-commit slider (mid-screen).
   Then the **portal gate** [21]: "Your transformation starts here." — golden→steel portal with a leaping figure; **Start journey** (press squeeze + ring ripple) → cinematic pull-through.

**3. Face ID enrolment (inside 07, after the portal).** Apple-style: 64-tick ring around live selfie camera; MediaPipe FaceLandmarker (CDN, lazy) reads real head yaw/pitch — "Turn your head left/right, look up/down" — white ticks preview where you look, quadrants seal **green**, chevron arrows point the way, 4 progress dots, scan-line sweeps the feed; "Hold still…" captures a mirrored selfie → saved as their avatar. Green check draws. Fallbacks: motion-centroid → timed auto-pass → Skip; a 30s watchdog guarantees the card always appears.

**4. CORE ID card (same screen, phase 2).** A holographic ProfileCard-style membership card: 3D pointer tilt, rainbow foil shine + glare + behind-glow, idle sway; their selfie in a portrait ring, FACE-verified chip, name, "MEMBER SINCE", **achievement boxes** (RANK insignia / SCORE / DAY / MISSION), a minted-once ID number (persisted locally + to Supabase profile), and an **ADD PASSKEY** chip → jumps to `04-sign-in.html?passkey=1&return=…`, runs the WebAuthn ceremony, returns to the card with the chip glowing green "PASSKEY ON". **Enter CORE** → finishes onboarding, persists everything → `08-rank-reveal.html`.

**5. `08-rank-reveal.html` — Rank reveal.** Stage 1: mystery octagon socket, "Tap to reveal" → charge-up zoom + white flash. Stage 2: rank card slams in — SVG tier insignia (see rank system), letter-by-letter rank name, XP count-up, rank-colored embers rising, confetti, double shockwave, screen shake, pointer-tilt card, progress bar to next rank, unlock list. **Claim your rank** → `05-sign-in-email.html?next=10-subscribe.html`.

**6. `05-sign-in-email.html` — email capture (SKIPPABLE).** Send-code OTP via Supabase (`06-sign-in-otp.html` verifies). "Skip for now →" (only shown mid-chain) → `10-subscribe.html`.

**7. `10-subscribe.html` — membership paywall** ($7.99/mo or $44.99/yr after 7 days free; framed against their projected yearly savings). → `09-first-chest.html` — first loot chest opening → **`20-dashboard.html`**.

**8. The app proper (post-onboarding):** `20-dashboard` (Life Score ring, daily quests, rank bar, streak), `21-quests`, `22-inventory`, `23-profile`, `24-ranks` (full 21-rank ladder), `25-settings`, `26-friends`/`26-streak`, `27-shop`, `28-chest`, `29-core-plus`, plus feature pages: `coach` (AI chat), `focus`, `gym` + `strength-camera` (live rep counting), `health`, `wealth`/`wallet`, `willpower`, `social`/`community`, `stat` (Life Score detail), `scan`/`physique-scan`, `recipe`. Legal: `82-legal`, `refund-policy`, `community-guidelines`. Reload guards on every onboarding page route subscribed users → dashboard, half-finished users → start.

## Rank system
21 ranks, 7 tiers × 3 grades (I/II/III), shared ladder in `_lib/core-ranks.js` (`window.CORE_RANKS`): Novice(bronze) → Initiate(silver) → Achiever(gold) → Specialist(blue) → Strategist(steel) → Master(amber) → Vanguard(gold/ice), XP thresholds 0 → 100,000, each rank grants perks. Icons come from `CORE_RANK_ICON(rank, size)` — clean SVG insignia: shield outline + tier emblem (1/2/3 chevrons → diamond → diamond+chevron → star → winged star) + grade pips, in tier color. Never reintroduce the old PNG gems.

## Corbit (the AI) — identity rules
Friendly glossy-black robot head, glowing white/ice rounded-rectangle eyes, small smile, halo ring, voice waveform. Calm, confident, warm, brief (2-3 sentences), never robotic. He is introduced ONCE (trial step 6, the voice link) — no self-introductions elsewhere. Post-onboarding he lives as the docked orb → chat sidebar and the `coach` page. He never speaks aloud unprompted.

## Hard rules for any change
1. Never touch the launch screen's design (`01-index.html`) beyond additions Stone asks for.
2. Keep everything inside the `.phone` frame working at 320×568 through 430×932 — no clipped CTAs, no horizontal scroll.
3. Steel monochrome by default; saturated color only for the intentional moments listed above.
4. Every interactive element needs press feedback (scale/ripple/glow) and most need haptics.
5. All flows must link end-to-end with no dead buttons; onboarding pages need reload/resume guards; anything that navigates away mid-task must support `?return=` round-trips.
6. Permissions (mic/camera/notifications) are always asked in-context with a graceful skip — the flow NEVER blocks on a denial (auto-pass/watchdog patterns).
7. Persist meaningful state to localStorage immediately and mirror to the Supabase profile via `window.coreAccounts.updateCurrent()` (fire-and-forget with catch).
8. Version-stamp any new/changed `_lib/*.js` include (`?v=YYYYMMDD`) — the static server sends no cache headers.
