# Design System — Core

## Aesthetic direction

**Jarvis × Visceral × Gen-Z**

- **Jarvis layer** — deep black background, glowing accents, glass cards, faint scanlines, futuristic typography
- **Visceral layer** — the smoke, the melting brain, the draining wallet — bright, physical, alive
- **Gen-Z layer** — playful micro-interactions, share-ready frames, dopamine in motion

The combination is the moat: nothing else looks like this.

---

## Color tokens

### Base (Jarvis aesthetic)
```
bg.primary    #050507   /* near-black, slightly cool */
bg.surface    #0E0F14   /* glass card base */
bg.elevated   #1A1C24   /* hover/active surface */
border        #2A2E3A   /* hairline glass border */
text.primary  #F5F7FB   /* primary text on dark */
text.muted    #8A92A6   /* secondary text */
text.dim      #4A5060   /* tertiary text */
```

### Accent — per stat (visceral colors)
```
lungs       #FF6BAA   /* healthy pink */
brain       #B388FF   /* electric purple */
wallet      #FFD05C   /* gold coin */
willpower   #FF7A45   /* flame orange */
body        #5CE1E6   /* vitality cyan */
```

### Status
```
success     #34D399   /* clean streak, recovery */
warning     #FBBF24   /* near-slip */
danger      #F87171   /* slip, decay */
info        #60A5FA   /* neutral info */
```

### Stat decay gradient
Each stat smoothly fades to grey as value drops. Implemented via interpolation between accent color and `#3A3D4A` at 0%.

---

## Typography

- **Display:** Space Grotesk (variable) — headings, stat numbers, large numerals
- **Body:** Inter (variable) — UI text, body copy, labels
- **Mono:** JetBrains Mono — for streak counters where digit width matters

Scale (mobile):
```
display.xl   48 / 56 / -0.02em
display.lg   36 / 44 / -0.02em
heading.lg   24 / 32 / -0.01em
heading.md   20 / 28
body.lg      17 / 26
body.md      15 / 22
body.sm      13 / 18
caption      11 / 16 / +0.04em uppercase
```

---

## Spacing

4-point base scale:
```
0.5  → 2px
1    → 4px
2    → 8px
3    → 12px
4    → 16px
5    → 20px
6    → 24px
8    → 32px
10   → 40px
12   → 48px
16   → 64px
20   → 80px
```

---

## Effects

### Glass card
```
bg: rgba(20, 22, 30, 0.6)
backdrop-filter: blur(24px) saturate(1.4)
border: 1px solid rgba(255, 255, 255, 0.06)
shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset
```

### Glow ring (around active stat)
```
filter: drop-shadow(0 0 24px {stat-color}66)
        drop-shadow(0 0 6px {stat-color})
```

### Scanlines (background ambience, very subtle)
```
linear-gradient(
  to bottom,
  transparent 0px,
  transparent 2px,
  rgba(255, 255, 255, 0.012) 3px
) repeat
```

---

## Motion

- **Micro:** 150 ms ease-out
- **Standard:** 250 ms ease-out
- **Large transitions:** 400 ms `cubic-bezier(0.2, 0.8, 0.2, 1)`
- **Smoke particle life:** 1.8 s, fade-out + drift upward
- **Stat decay animation:** 600 ms with bounce on the new value
- **Streak break:** 800 ms — crack appears in the streak badge, then re-forms at 1

Respect `prefers-reduced-motion` — replace particles with static smoke icon, replace decay bounce with fade.

---

## Per-habit visceral metaphors

| Habit | Background animation | Stat impact | Sound |
|-------|----------------------|-------------|-------|
| Vape | Grey smoke billows from bottom of screen, lungs avatar darkens | -lungs, -willpower | Soft exhale |
| Doom-scroll | Brain avatar melts, pixels distort | -brain, -willpower | Static glitch |
| Drink | Liver darkens, screen tints amber | -body, -willpower | Liquid pour |
| Spend | Coins fly out of wallet → off-screen | -wallet, -willpower | Coin clatter |
| Porn | Screen glitches, willpower flame dims | -willpower, -brain | Low buzz |
| Junk food | Body avatar bloats slightly | -body, -willpower | Soft crunch |
| Weed | Smoke + brain haze overlay | -lungs, -brain, -willpower | Inhale |
| Nicotine pouch | Mouth icon highlight, lungs decay slower | -lungs, -willpower | Soft hum |

---

## Component library

See `apps/mobile/components/ui/` for primitives:
- `Button` — primary, secondary, ghost, destructive
- `Card` — glass, solid, elevated
- `Sheet` — bottom sheet, side sheet
- `StatRing` — circular progress with glow
- `StatBar` — linear with gradient
- `TapToLog` — the signature big tap button
- `SmokeAnimation` — Skia particle system
- `StreakBadge` — number + icon + glow

---

## Accessibility

- Minimum 4.5:1 contrast for all text on backgrounds
- Touch targets minimum 44×44 pt
- Voice-over labels on every interactive
- Haptics paired with all major animations (do not rely on visual alone)
- Color is never the only signal (lungs avatar also visibly damages, not just turns grey)
- Dynamic Type support (Display sizes scale with system font setting)

---

## Inspiration references

- **Whoop** — health metric depth, ring aesthetic
- **Apple Fitness** — ring progress feel
- **Stripe** — typography hierarchy, glow gradients
- **Linear** — dark mode done right
- **Iron Man Jarvis UI** — overall vibe
- **BeReal** — single-tap simplicity for the slip log
- **Finch** — gamification warmth (we're colder, more visceral)
