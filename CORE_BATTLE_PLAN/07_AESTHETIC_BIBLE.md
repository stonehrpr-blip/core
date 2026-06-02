# 07 — AESTHETIC BIBLE

> Read `00`–`06` first.

This file is the **design system** for CORE. Colors, type, motion, sound, haptics, shadows, glass effects, every reusable component. When in doubt during implementation, reference here.

Brand frame: **Jarvis × Apple Vision Pro.** Deep black. Soft glow. Glass surfaces. Electric blue accent.

---

## §1. Color system

### Core palette (six colors total)

| Token | Hex | Usage |
|---|---|---|
| `--core-blue-500` | `#2F8FFF` | Primary brand. CTAs. Witness. Coach accents. |
| `--core-blue-300` | `#5BB1FF` | Calm. Breath ring. Cooler accent. |
| `--core-violet-500` | `#9F8FFF` | Celebration. Milestones. Promise teasers. |
| `--core-red-500` | `#FF4F6B` | Slip. Loss. Crisis. Never for promotion. |
| `--core-amber-500` | `#FFC857` | Warning. Today-deltas. Trial pill. |
| `--core-green-500` | `#3DDC97` | Pact (money). Success in transactions. |

Plus accents:
- `--core-letter-gold` `#E8C77E` — Promise Letter only.
- `--core-witness-cyan` `#5BB1FF` (same as blue-300, intentional unity).

### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `--bg-page` | `#000000` | Page background. Pure black. |
| `--bg-card` | `#0A0A0F` | Card / surface. |
| `--bg-elevated` | `#13131D` | Elevated card. |
| `--bg-overlay` | `#000000ee` | Modal overlay. |

### Borders

| Token | Hex | Usage |
|---|---|---|
| `--border-subtle` | `#FFFFFF14` | Default card border. |
| `--border-strong` | `#FFFFFF2A` | Active card border. |
| `--border-glow` | `#2F8FFF` | Focused / interactive. |

### Text

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#FFFFFF` | Body, headings. |
| `--text-secondary` | `#FFFFFFB3` | Secondary text. |
| `--text-disabled` | `#FFFFFF66` | Disabled. |
| `--text-soft` | `#FFFFFF80` | Captions, hints. |

### Rules

- **Never use a color not in this list.** Six brand colors + 4 backgrounds + 3 borders + 4 text shades.
- **Never use a color outside `core-theme.css`.** All other files reference the variables.
- **No drop shadows on text.** Glow only (via filter or text-shadow without offset).
- **No gradients on body text.** Reserved for: brand wordmark, primary CTA, milestone numbers, "you'd be" emphasis.

---

## §2. Gradients (the only allowed gradients)

| Name | CSS | Usage |
|---|---|---|
| Primary CTA | `linear-gradient(135deg, #2F8FFF 0%, #5B6AE6 100%)` | All primary buttons. |
| Brand wordmark | `linear-gradient(135deg, #5BB1FF 0%, #B388FF 50%, #FF6BAA 100%)` | "you'd be." emphasis. Brand mark in marketing. |
| Pact CTA | `linear-gradient(135deg, #3DDC97 0%, #2F8FFF 100%)` | Pact buttons. Money color in. |
| Letter | `linear-gradient(135deg, #E8C77E 0%, #FFFFFF 100%)` | Promise Letter envelope. |
| Crisis | `linear-gradient(135deg, #5BB1FF 0%, #9F8FFF 100%)` | Crisis breath ring. Calming. |
| Milestone | `linear-gradient(135deg, #9F8FFF 0%, #FFC857 100%)` | Celebration auroras. |

### Animated gradients

For Primary CTA:
```css
.btn.primary {
  background: linear-gradient(135deg, #2F8FFF 0%, #5B6AE6 100%);
  background-size: 200% 200%;
  animation: gradShift 5s ease infinite;
}
@keyframes gradShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

Use this for all `.btn.primary`, `.btn.pact`, milestone CTAs, paywall CTA.

---

## §3. Typography

### Family

- **Family:** SF Pro Display (headings), SF Pro Text (body). System stack fallback: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif`.
- **No serif anywhere.** Ever.
- **Numerics:** `font-variant-numeric: tabular-nums;` on every number display.

### Scale

| Token | Size | Line height | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | 56px | 1.05 | 700 | Brand wordmark, day-7 letter signature. |
| `display-lg` | 40px | 1.1 | 700 | Hero "Become" lines. Milestone numbers. |
| `display-md` | 32px | 1.15 | 600 | Section heading. Trial pitch. |
| `display-sm` | 24px | 1.2 | 600 | Stat card values (when large). |
| `headline` | 20px | 1.3 | 600 | Page heading. Modal heading. |
| `subhead` | 18px | 1.3 | 500 | Card heading. Subtitle. |
| `body` | 16px | 1.5 | 400 | Body text. Default. |
| `body-sm` | 14px | 1.4 | 400 | Secondary text. |
| `caption` | 12px | 1.3 | 500 | Pills, badges, taglines. |
| `mono` | 14px | 1.3 | 500 | "PROMISE" input. Code-ish. |

### Special

- **PROMISE input:** SF Mono. 18px. Letter-spacing 0.15em.
- **Stat orb taglines:** `caption`, uppercase, letter-spacing 0.1em, color `text-secondary`.

### Rules

- No font over 56px.
- No font under 12px.
- No italic unless quoting.
- No underline except on text-link CTAs.
- Bold (700) reserved for `display-*` only. Body bold uses 600.

---

## §4. Spacing

### Scale (4px base)

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-6` | 32px |
| `space-7` | 48px |
| `space-8` | 64px |

### Component spacing

- Card padding: `space-5` (24px) all sides.
- Section gap: `space-6` (32px).
- Element gap within a card: `space-3` (12px).
- Button padding: vertical `space-3` (12px), horizontal `space-5` (24px).

---

## §5. Corner radii

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 8px | Pills, small badges. |
| `radius-md` | 12px | Standard buttons, small cards. |
| `radius-lg` | 16px | Cards. |
| `radius-xl` | 24px | Elevated cards (Coach bubbles, modals). |
| `radius-pill` | 9999px | Pill buttons, chips. |
| `radius-circle` | 50% | Avatars, orbs. |

---

## §6. Shadows + glows

CORE uses glow, not drop-shadow.

### Glow tokens

| Token | CSS | Usage |
|---|---|---|
| `glow-blue-sm` | `0 0 12px rgba(47, 143, 255, 0.4)` | Subtle interactive hint. |
| `glow-blue-md` | `0 0 24px rgba(47, 143, 255, 0.5)` | Active CTA. |
| `glow-blue-lg` | `0 0 48px rgba(47, 143, 255, 0.6)` | Focus state. |
| `glow-violet-md` | `0 0 24px rgba(159, 143, 255, 0.5)` | Milestone. |
| `glow-red-md` | `0 0 24px rgba(255, 79, 107, 0.5)` | Slip / Crisis. |
| `glow-green-md` | `0 0 24px rgba(61, 220, 151, 0.5)` | Pact. |
| `glow-gold-md` | `0 0 24px rgba(232, 199, 126, 0.5)` | Letter. |

### Card shadow

For cards on dark background:
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.06),  /* top highlight */
    0 2px 24px rgba(0,0,0,0.6);            /* depth */
}
```

### Rules

- **Never combine drop-shadow + glow.** Pick one.
- **Glow is for interactive / important.** Static cards get inset highlight only.

---

## §7. Glass surfaces

CORE's glass effect:

```css
.glass {
  background: rgba(20, 20, 30, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
}
```

For specular highlight (Apple Vision Pro feel):
```css
.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.12) 0%, 
    transparent 40%
  );
  pointer-events: none;
}
```

### Rules

- Glass requires backdrop-filter support. Fall back to solid `bg-elevated` on older browsers.
- Don't stack two glass surfaces — visual chaos.
- Use glass for: Coach reply bubbles, modal overlays, action cards, key CTAs.

---

## §8. Motion

### Easing curves

| Token | Cubic bezier | Usage |
|---|---|---|
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard. |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter. |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit. |
| `ease-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce on confirm. |
| `ease-spring` | `cubic-bezier(0.5, 0, 0.5, 2)` | Custom spring. |

### Duration tokens

| Token | Value | Usage |
|---|---|---|
| `dur-instant` | 100ms | Press response. |
| `dur-fast` | 200ms | Hover. |
| `dur-base` | 300ms | Most transitions. |
| `dur-slow` | 600ms | Stat value tween. |
| `dur-very-slow` | 1200ms | Letter unfold. |

### Animation rules

- **Stat values:** tween 600ms on data change.
- **Page transitions (HTML preview):** 400ms slide left for forward, slide right for back.
- **Modal open:** spring up 350ms.
- **Confetti:** 2s burst, then fade.
- **Idle loops:** must be subtle, max 0.5 amplitude on opacity.
- **Reduced motion:** all animations clamp to 0.01s, idle loops disable.

### Idle animations (per element)

| Element | Animation | Cadence |
|---|---|---|
| Lungs orb | scale + opacity breathe | 4-4-4-4 (16s cycle) |
| Brain orb | gentle pulse | 1Hz |
| Wallet orb | slow pulse | 0.5Hz |
| Willpower orb | firm tick | 1.2Hz, sharp ease |
| Body orb | steady glow | static |
| Primary CTA | gradient shift | 5s ease |
| Promise Letter envelope | subtle gold shimmer | 8s |
| Pact strip border | pulse if partner online | 2s |
| Streak count | gentle scale pop on tier reach | 200ms |

---

## §9. Sound

CORE uses sound deliberately. **Muted by default.** Users enable in Settings.

### Sound assets

| Event | Sound | Length | Vibe |
|---|---|---|---|
| Slip confirmed | `slip.wav` | 200ms | Honest, soft, "ugh" |
| Recovery completed | `recovery.wav` | 400ms | Gentle resolve, lift |
| Streak milestone | `milestone-7.wav` etc. | 800ms | Triumph but calm |
| Promise Letter open | `paper-open.wav` | 600ms | Paper unfold |
| Panic completed | `panic-done.wav` | 400ms | Soft bell |
| Witness ping | `witness-ping.wav` | 200ms | Low chime |
| Pact accepted | `pact-lock.wav` | 500ms | Stamp + lift |
| Pact completed (win) | `pact-win.wav` | 800ms | Triumph |
| Coach typing | (silent) | — | — |
| Coach voice mode | (TTS engine) | — | Coach voice |
| Calm Library | (TTS engine + ambient) | — | — |

### File format

- WAV or AAC. 44.1kHz, 16-bit.
- Max 1 sec per UI sound.
- Calm Library scripts can be longer (90-120s) with ambient bed.

### Rules

- Never auto-play sound on app open.
- Settings toggle: "Sound effects" / "Coach voice" / "Calm Library ambient" — three separate toggles.
- If user has phone on silent (iOS), respect it — don't play through silent mode.

---

## §10. Haptics

CORE uses haptics for **emotion**. Strong haptics are reserved.

### Haptic patterns

| Event | Pattern | Strength |
|---|---|---|
| Button press | Single soft tap | light |
| Slip confirmed | Long-short-long warning | medium |
| Recovery completed | Soft tap | light |
| Streak milestone | Double tap with delay | medium |
| Promise signed (typed "PROMISE") | Confirm tap | medium |
| Pact accepted | Stamp pattern (firm-soft) | strong |
| Witness ping (notification) | Long-short-long | medium |
| Panic breath phase | Pulse per phase | very light |
| Crisis mode activate | Single firm tap | medium |
| Error / rejection | Sharp denial pattern | medium |

### Rules

- iOS: use `UIImpactFeedbackGenerator` (light/medium/heavy) or `UINotificationFeedbackGenerator` (success/warning/error).
- React Native: use `expo-haptics`.
- **Never haptic on every tap.** Reserve for important events.
- Settings toggle: "Haptic feedback" — single master toggle.
- Some users dislike haptics — respect.

---

## §11. Iconography

CORE uses **outlined icons** (1.5px stroke), no fills, with subtle glow on active states.

### Icon library

- **Source:** Phosphor Icons (regular weight).
- **Style:** Outline. No solid fills.
- **Color:** matches text color of context.
- **Size tokens:** 16px / 20px / 24px / 32px.

### Icon naming

Use specific Phosphor names in code:
- `<Lungs />` for lung icon (yes, it exists)
- `<Brain />` for brain
- `<Wallet />` for wallet
- `<Lightning />` for willpower
- `<Person />` for body
- `<ShieldCheck />` for Shield active
- `<HandHeart />` for Pact
- `<Note />` for Promise Letter
- `<Eye />` for Witness
- `<Heartbeat />` for Coach
- `<Fire />` for streak
- `<Snowflake />` for streak freeze
- `<ArrowClockwise />` for restore
- `<Sparkle />` for milestones
- `<Lock />` for owner-only / locked features

### Rules

- **Never combine outline + fill** in the same screen.
- Active state: solid color + subtle glow.
- Inactive: `text-secondary` color.

---

## §12. Avatars

### Coach avatars

The Coach has 4 visual variants — one per tone. Same face, different mood/lighting:
- **Gentle:** soft eyes, slight smile, warm light from below.
- **Balanced:** neutral expression, even light.
- **Direct:** stern but kind eyes, side light.
- **Drill:** sharp expression, hard light.

Plus 4 emotion variants per tone (16 total):
- Default
- Listening (eyes slightly closed)
- Speaking (mouth open subtly)
- Reflecting (looking up-left)

Stored as SVG sprite. Each is 200x200 viewport.

### User avatars

- Default: gradient circle with user initials.
- Custom upload: max 5MB, square crop, 200x200 storage.
- Privacy: stored locally by default.

### Habit avatars

Each habit has its own avatar (animated SVG):
- Vape: smoke-emitting figure
- Doomscroll: pixelated phone
- Spend: dollar bill silhouette
- Drink: glass silhouette
- Etc.

---

## §13. Component anatomy

### Card

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
    <span class="card-meta">Meta</span>
  </div>
  <div class="card-body">
    Body content.
  </div>
  <div class="card-footer">
    <button class="btn primary">Action</button>
  </div>
</div>
```

CSS:
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.card-title {
  font: 600 18px/1.3 SF Pro Text;
  color: var(--text-primary);
}
.card-meta {
  font: 500 12px/1.3 SF Pro Text;
  color: var(--text-soft);
}
```

### Button (primary)

```html
<button class="btn primary">Start my 7-day free trial</button>
```

CSS:
```css
.btn {
  font: 600 16px/1 SF Pro Text;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-pill);
  border: none;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.btn:active {
  transform: scale(0.97);
}
.btn.primary {
  background: linear-gradient(135deg, #2F8FFF 0%, #5B6AE6 100%);
  background-size: 200% 200%;
  color: white;
  animation: gradShift 5s ease infinite;
  box-shadow: var(--glow-blue-md);
  position: relative;
}
.btn.primary::after {
  /* inner highlight */
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%);
  pointer-events: none;
}
```

### Stat ring

```html
<div class="stat-ring" data-stat="lungs" data-value="78">
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" class="ring-bg" />
    <circle cx="50" cy="50" r="45" class="ring-fill" />
  </svg>
  <div class="ring-value">78</div>
  <div class="ring-label">Lungs</div>
</div>
```

CSS:
```css
.ring-bg {
  fill: none;
  stroke: var(--border-subtle);
  stroke-width: 6;
}
.ring-fill {
  fill: none;
  stroke: var(--core-blue-300);
  stroke-width: 6;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  /* stroke-dasharray set by JS: 2 * π * r * value/100 */
  transition: stroke-dasharray var(--dur-slow) var(--ease-default);
  filter: drop-shadow(0 0 8px rgba(91, 177, 255, 0.5));
}
```

### Coach message bubble

```html
<div class="coach-msg">
  <div class="avatar"><img src="coach-gentle.svg"/></div>
  <div class="bubble">
    <p>Hey. I'm here.</p>
  </div>
</div>
```

CSS:
```css
.coach-msg {
  display: flex;
  gap: var(--space-3);
  margin: var(--space-3) 0;
}
.avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}
.bubble {
  background: rgba(20, 20, 30, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(47, 143, 255, 0.2);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  position: relative;
  animation: bubbleBreathe 4s ease infinite;
}
@keyframes bubbleBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-0.5px); }
}
```

### Witness ping card

```html
<div class="witness-ping">
  <div class="ping-header">
    <Eye />
    <span>Coach</span>
  </div>
  <p class="ping-body">Heads up. This is one of your slip windows.</p>
  <div class="ping-actions">
    <button class="btn primary">Walk me through it</button>
    <button class="btn secondary">I'm steady</button>
    <button class="btn ghost">Not a real pattern</button>
  </div>
</div>
```

Use `glow-blue-md` on card edge. Subtle cyan-tinted border.

### Promise Letter envelope

```html
<div class="letter-envelope">
  <svg viewBox="0 0 100 100">
    <!-- envelope SVG -->
  </svg>
</div>
```

Gold glow `glow-gold-md`. Shimmer animation 8s.

### Pact strip

```html
<div class="pact-strip">
  <div class="partner">
    <img class="avatar" />
    <span class="name">Alex</span>
  </div>
  <div class="status">
    <span class="day-count">Day 4/14</span>
    <div class="indicators">
      <span class="dot you-clean"></span>
      <span class="dot partner-clean"></span>
    </div>
  </div>
</div>
```

Green border if both clean. Mixed if one slipped. Red if both slipped.

---

## §14. Empty states

Every page must have a clean empty state.

| Page | Empty state |
|---|---|
| Dashboard (day 0) | Subdued. "First day. Just be here." |
| Feed | "Your feed is quiet. Add friends or join a Pact." |
| Notifications | "Quiet for now. Coach will reach when there's reason." |
| Pacts | "No Pacts yet. Start one when you're ready." |
| Body Receipts | "Your first Receipt unlocks at week 3." |
| Activity | "Your XP timeline will show up here." |
| Achievements | "Achievements unlock as you go. First one's coming." |
| Calm Library favorites | "No favorites yet. Save what works." |
| Witness history | "Witness hasn't pinged you yet. It's listening." |

### Rules

- Empty states use `text-soft` color.
- No CTAs in empty states (unless explicit).
- No images / illustrations — minimal aesthetic.

---

## §15. Error states

| Type | Visual |
|---|---|
| Validation error (inline) | Red text below input + amber `--core-amber-500` border on input. |
| Network error | Toast (bottom, 3s) with retry button. |
| State load failure | Modal with "Reset state?" + safe fallback. |
| Permission denied | Inline notice with "Open Settings" deep link. |
| Subscription required | Soft paywall card, not blocking modal. |

### Rules

- Never use red for non-error (e.g., "delete" button can be red, but "save" never).
- Errors should explain what went wrong AND what to do.
- Never blame the user. "Something's stuck" not "You entered something wrong."

---

## §16. Loading states

CORE rarely has spinners. Most operations are local + instant.

- **Coach typing:** 3 pulsing dots.
- **Async (rare):** subtle progress bar at top of screen (1-2px).
- **TTS loading:** "Coach is thinking..." text.
- **Stripe processing:** modal with progress bar + "We're processing your stake. Hang tight." copy.

### Rules

- Avoid skeleton screens (overengineered for our scope).
- Never show "Loading..." text — use indeterminate motion (dots, bars).

---

## §17. Mobile-first responsive

### Breakpoints

| Width | Layout |
|---|---|
| < 360px | Compact mobile. Orb pentagon collapses, taglines hide. |
| 360–459px | Mobile. Default. |
| 460–767px | Wide mobile. Frame retains on preview. |
| 768–1023px | Tablet. Frame centered, no max width. |
| 1024+ | Desktop preview. Phone frame visible, gallery navigation. |

### Touch targets

- Min 44x44 px for any tappable element.
- Buttons: 48px tall by default.
- Padding around small icons: ensure 44x44 active area.

### Safe areas

- iOS notch: use `env(safe-area-inset-top)` for top padding.
- iOS home indicator: use `env(safe-area-inset-bottom)` for bottom padding.
- All persistent UI (headers, tab bars) respect safe areas.

---

## §18. Dark mode only

CORE is dark-mode-only. Light mode is **not supported**.

Why: the visceral aesthetic depends on deep black + glow. Light mode dilutes this.

Implementation:
```css
@media (prefers-color-scheme: light) {
  :root {
    color-scheme: dark;
    /* enforce dark */
  }
}
```

Add `<meta name="color-scheme" content="dark">` to all HTML.

---

## §19. Performance

### Asset budgets

- **HTML preview page:** < 500KB total (after gzip).
- **JS bundle (per page):** < 100KB.
- **Image assets:** under 200KB each. PNGs compressed; SVGs minified.
- **Font weights loaded:** SF Pro Display 600/700 + SF Pro Text 400/500/600 only. No 800, no 100.
- **Animation cost:** prefer CSS animations over JS. Use `transform` and `opacity` only.

### Frame rate

- Target: 60fps on iPhone 12+.
- Acceptable: 30fps on iPhone X (5 years old).
- Pre-emptive: throttle ambient animations on low-end (`navigator.deviceMemory < 4`).

---

## §20. Brand wordmark

### "core" wordmark

- All lowercase.
- SF Pro Display 700.
- Letter-spacing: -0.02em.
- In hero: gradient (brand wordmark gradient).
- In top bars: solid white.
- Always paired with brand dot:

```
[ • ] core
```

Brand dot:
- 6px diameter circle.
- `var(--core-blue-500)` solid.
- 4px gap before wordmark.

### "CORE" caps treatment

- Used in logos / icon / loading states.
- SF Pro Display 700.
- Letter-spacing: 0.05em.

### Forbidden treatments

- Italic
- Underline
- Outline
- Drop shadow
- Multi-color (only gradient or solid)
- Any background that's not pure black or transparent

---

## §21. Photography / illustration

- **No photography.** CORE is all-vector.
- **No illustration of human faces (other than Coach).** Avoids racial/identity assumptions.
- **Coach avatar:** stylized, neutral, abstract enough to feel universal.
- **User-uploaded photos (Body Receipts):** private, never displayed on shared/public surfaces.

---

## §22. Notification visuals

Push notifications use:
- **Title:** "Coach" (always, regardless of content)
- **Body:** tone-aware copy.
- **Icon:** brand dot + "C" letter.
- **Sound:** silent unless user enabled.

### Notification badge

- Number-only.
- Color: `--core-red-500` for urgent (Crisis, Pact partner slipped). `--core-blue-500` for standard.

---

## §23. Onboarding tour styling

The `tutorial.html` spotlight uses:
- Backdrop: `bg-overlay` (90% opaque black).
- Spotlight cutout: circle with ringed pulse.
- Tooltip: glass card with arrow pointer.
- CTA: "Got it" / "Skip tour."

Styled to feel like Coach pointing at things, not the app dictating.

---

## §24. Calm Library aesthetic

When a Calm Library session is playing:
- Background: subtle gradient flow (per script's `visual` property).
- Center: breathing orb (60px).
- Text: script displayed below orb, large readable.
- Controls: bottom bar with pause/restart/exit.

Visuals per script type:
- `calm_rays_blue`: radial cyan rays from center, drifting.
- `gradient_flow`: slow horizontal gradient sweep.
- `star_field`: subtle stars drift downward.
- `aurora`: green/violet auroras at low opacity.

---

## §25. Body Receipt visualization

When showing a Body Receipt:
- Breath-hold time as the **dominant number**, large.
- Delta from last week as colored chip (green up / amber stable / red down).
- Mini sparkline graph showing trend across last 4 weeks.
- Photo (if taken): small thumbnail, tap to expand.
- Reflection notes: italic, secondary color.

---

## §26. Streak heatmap

`streak-board.html` uses:
- 365-day grid (52 weeks × 7 days).
- Clean cell: `core-blue-300` filled.
- Slip cell: `core-red-500` filled.
- Freeze cell: `core-witness-cyan` filled (with snowflake icon).
- Future cell: empty with subtle border.
- Today: outlined ring around cell.

Cells: 12x12 px on mobile, 14x14 px on desktop. Gap 2px.

---

## §27. Edge cases — rare but important

- **iOS Low Power Mode:** ambient animations disable.
- **Reduce Motion:** all idle animations disable. Page transitions become 50ms fades.
- **Reduce Transparency:** glass becomes solid `bg-elevated`.
- **Increase Contrast:** borders go to `border-strong`.
- **Bold Text (iOS):** font weights jump up one level.

---

## §28. Component checklist (use as QA)

For every new component, verify:

- [ ] Uses tokens from this file (no raw hex).
- [ ] Touch target ≥ 44x44.
- [ ] Has hover state (desktop only).
- [ ] Has active/press state.
- [ ] Has focus-visible state (keyboard nav).
- [ ] Has disabled state.
- [ ] Has loading state (if async).
- [ ] Has empty state.
- [ ] Has error state.
- [ ] ARIA labels correct.
- [ ] VoiceOver tested.
- [ ] Reduced motion behaves.
- [ ] 320px viewport doesn't overflow.

---

## §29. References

When you need design inspiration outside this file:

- Apple Vision Pro UI patterns (glass surfaces, depth)
- Linear app's electric blue + dark
- Arc Browser's brand voice + ambient motion
- Things 3's typography clarity
- Apple Health's stat-card patterns (radial rings)
- Headspace's calm script visuals (for Calm Library)

**Do not reference:** Reload's app, Lock In's app, or any quit-vape app (don't accidentally absorb their pattern).

---

## §30. End-of-file verification

After applying this design system:

1. Random page audit: pick 5 pages, verify all colors come from tokens.
2. Animation budget audit: profile a page with idle animations playing — frame rate >55fps.
3. Accessibility audit with axe-core — zero color contrast failures.
4. Bold Text / Larger Text / Increase Contrast tests on iOS Simulator.

Commit. Next file: `08_COPY_LIBRARY.md`.
