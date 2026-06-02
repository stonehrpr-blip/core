# 09 — DATA MODELS

> Read `00`–`08` first.

This file is the **canonical data shape** for CORE. State schemas, storage keys, migrations, analytics events, sync protocols. When implementing persistence or analytics, reference here.

---

## §1. Storage keys

### Web (localStorage)

| Key | Schema | Purpose |
|---|---|---|
| `coreState.v2` | `CoreState` | Master state object (v2, all new features). |
| `coreOnboardTrial` | `OnboardTrial` | Onboarding artifacts (kept for back-compat). |
| `coreOnboardComplete` | `'1'` or absent | Onboarding completion flag. |
| `coreSelectedHabits` | `string[]` | Active habit IDs. |
| `coreMilestoneSeen` | `{[tier]: boolean}` | Tracks which milestone celebrations shown. |
| `coreNextGoalPicked` | `'1'` or absent | Goal-set flow completion. |
| `coreLastSeen` | `number` (timestamp) | Last seen for welcome-back routing. |
| `coreSocialProofSeen` | `'1'` or absent | Trial day 4-5 social-proof one-shot. |
| `coreLikes` | `{[postId]: 1}` | Liked posts. |
| `coreReferralGift` | `{ref, claimedAt}` | Referral gift state. |
| `coreSubscriptionActive` | `'1'` or absent | Pro tier status. |
| `coreLifetime` | `LifetimeState` | Lifetime purchase state. |
| `coreStreakInsurance` | `'1'` or absent | Streak insurance addon. |
| `coreCrisisMode` | `CrisisState` | Crisis mode active state. |
| `coreLockdown` | `LockdownState` | Lockdown active state. |
| `coreShield` | `ShieldState` | Shield config. |
| `coreWitness` | `WitnessState` | Witness config + patterns. |
| `corePromiseLetter` | `PromiseLetter` | The Promise Letter. |
| `coreCoachConversations` | `CoachMessage[]` | Last 50 Coach messages. |
| `coreInsightDismissed` | `{[ruleId]: timestamp}` | Dismissed insight cards. |
| `coreToneTestResult` | `ToneTestResult` | Last tone test outcome. |
| `coreBedtimeLog` | `{[dateString]: BedtimeEntry}` | Bedtime check-ins. |
| `coreMorningLog` | `{[dateString]: MorningEntry}` | Morning check-ins. |
| `coreAid` | `string` (UUID) | Anonymous analytics ID. |
| `coreSid` | `string` (UUID) | Session ID. |
| `coreAnalyticsRing` | `Event[]` | Last 500 analytics events (sessionStorage). |
| `coreStoneAccess` | `'1'` or absent | Gallery owner access flag. |

### React Native (AsyncStorage)

Same keys with `core.` prefix:
- `core.gameState.v2` — mirror of `coreState.v2`
- `core.auth` — auth-related state
- `core.lastSeen`
- etc.

---

## §2. CoreState v2 (master schema)

```typescript
type CoreState = {
  version: 2;
  appVersion: string; // semver
  installedAt: number;
  
  // Profile (synced from onboarding)
  profile: {
    name: string;
    age: number;
    avatarUrl: string | null;
    timezone: string; // IANA
    region: 'US' | 'AU' | 'UK' | 'CA' | 'NZ' | 'IE' | 'OTHER';
  };
  
  // Trial / commitment
  trial: {
    committed: boolean;
    signedAt: number | null;
    tone: 'gentle' | 'balanced' | 'direct' | 'drill';
    checkin: 'morning' | 'evening' | 'both' | null;
    trialStartedAt: number | null;
  };
  
  // Stats (0-100 each)
  stats: {
    lungs: number;
    brain: number;
    wallet: number;
    willpower: number;
    body: number;
  };
  
  // Streak
  streak: {
    days: number;
    previousDays: number; // for restore
    lostAt: number | null;
    longestEver: number;
    freezes: {
      availableThisWeek: number;
      weekResetAt: number;
    };
  };
  
  // XP + ranks
  xp: number;
  rank: string; // computed but stored for fast read
  
  // Slips (capped at 500 most recent)
  slips: Slip[];
  slipHistorySummary: SlipSummary | null; // aggregated when > 500
  
  // Active habits
  activeHabits: string[]; // ['vape'] always; bonus habits added at unlocks
  bonusHabits: BonusHabit[];
  
  // Witness
  witness: WitnessState;
  
  // Promise Letter
  promiseLetter: PromiseLetter | null;
  promiseLetter365: PromiseLetter | null; // generated at day 365
  
  // Pacts
  pacts: Pact[];
  
  // Body Receipts (capped at 26 = 6 months)
  bodyReceipts: BodyReceipt[];
  
  // Calm Library
  calmLibrary: {
    sessions: CalmSession[];
    favorites: string[]; // script IDs
    totalSessions: number;
    totalMinutes: number;
  };
  
  // Coach
  coachConversations: CoachMessage[]; // capped at 50
  coachActions: CoachAction[]; // history of proposed actions
  
  // Sessions (focus sessions)
  sessions: FocusSession[];
  
  // Shield
  shield: ShieldState;
  
  // Lockdown
  lockdown: LockdownState;
  
  // Crisis
  crisisMode: CrisisState;
  
  // Insights
  insights: {
    dismissedRules: { [ruleId: string]: number }; // ruleId -> timestamp
  };
  
  // Permissions (cached from system)
  permissions: {
    notifications: 'granted' | 'denied' | 'not_determined';
    screenTime: 'granted' | 'denied' | 'not_determined';
    location: 'granted' | 'denied' | 'not_determined';
    health: 'granted' | 'denied' | 'not_determined';
    contacts: 'granted' | 'denied' | 'not_determined';
  };
  
  // Subscription
  subscription: {
    active: boolean;
    tier: 'free' | 'monthly' | 'yearly' | 'lifetime';
    activatedAt: number | null;
    expiresAt: number | null;
    autoRenew: boolean;
  };
  
  // Lifetime
  lifetime: {
    eligibleAt: number | null; // when day-30 hit
    offeredAt: number[]; // timestamps of each offer surface
    purchased: boolean;
    purchasedAt: number | null;
    price: number | null; // $89 or $59
  };
  
  // Streak Insurance addon
  streakInsurance: {
    active: boolean;
    activatedAt: number | null;
  };
  
  // Settings (user preferences)
  settings: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    coachVoiceEnabled: boolean;
    calmAmbientEnabled: boolean;
    bodyReceipts: {
      frequency: 'weekly' | 'biweekly' | 'off';
      defaultDay: number; // 0 = Sunday
      defaultTime: string; // 'HH:MM'
      photoOptIn: boolean;
      appleHealthSync: boolean;
      shareIncludeStats: boolean;
      shareIncludePhoto: boolean;
    };
    notifications: {
      coachCheckins: boolean;
      streakRisk: boolean;
      weeklyReview: boolean;
      friendActivity: boolean;
      milestones: boolean;
      witnessPings: boolean;
      pactUpdates: boolean;
      bodyReceiptPrompts: boolean;
      doNotDisturb: {
        enabled: boolean;
        startHour: number;
        endHour: number;
      };
    };
    privacy: {
      profileVisibility: 'public' | 'friends' | 'private';
      postsDefault: 'public' | 'friends' | 'private';
      shareBodyReceiptsByDefault: boolean;
    };
  };
  
  // Activity log (capped at 200 most recent)
  activity: ActivityEntry[];
  
  // Achievements
  achievements: {
    unlocked: string[]; // achievement IDs
    progress: { [achievementId: string]: number }; // 0-1
  };
  
  // Stat targets (user-set goals)
  statTargets: { [stat: string]: number };
  
  // Last sync timestamps (for server sync v2)
  lastSeenAt: number;
  lastSyncedAt: number | null;
  
  // Coach memory (what Coach knows about user)
  coachMemory: {
    quizAnswers: { [key: string]: any };
    vapeProfile: VapeProfile;
    triggers: string[];
    statHistory: { [stat: string]: number[] }; // last 30 days
    coachToneHistory: { tone: string, changedAt: number }[];
  };
};
```

---

## §3. Sub-schemas

### `Slip`

```typescript
type Slip = {
  id: string;
  habit: string; // 'vape', 'doomscroll', etc.
  at: number; // timestamp
  magnitude: 1 | 2 | 3; // 1 = puff, 2 = several puffs, 3 = full session
  triggers: string[]; // ['stress', 'after_meal', ...]
  note: string | null;
  recoveryQuestCompleted: boolean;
  recoveryAt: number | null;
  promiseLetterShown: boolean;
};
```

### `SlipSummary`

```typescript
type SlipSummary = {
  totalSlips: number;
  byHabit: { [habit: string]: number };
  byTrigger: { [trigger: string]: number };
  byHour: { [hour: number]: number };
  byDayOfWeek: { [day: number]: number };
  firstSlipAt: number;
  lastSlipAt: number;
};
```

### `BonusHabit`

```typescript
type BonusHabit = {
  id: string; // 'doomscroll', 'spend', ...
  addedAt: number;
  primaryStat: 'lungs' | 'brain' | 'wallet' | 'willpower' | 'body';
  secondaryStat: 'lungs' | 'brain' | 'wallet' | 'willpower' | 'body';
  color: string; // hex
  particleTheme: string;
  slipsAllTime: number;
  currentStreak: number;
};
```

### `WitnessState`

```typescript
type WitnessState = {
  enabled: boolean;
  permissions: {
    screenTime: boolean;
    location: boolean;
    streakPatterns: boolean; // always true
  };
  apps: { id: string, label: string, addedAt: number }[];
  places: { id: string, label: string, lat: number, lng: number, radius: number }[];
  volume: 'whisper' | 'calm' | 'steady';
  patterns: {
    timeOfDay: { [hour: number]: number }; // probability
    dayOfWeek: { [day: number]: number };
    appsBeforeSlip: { [appId: string]: number };
    placesBeforeSlip: { [placeId: string]: number };
    streakStressIndicators: {
      decliningStats3Days: number;
      lastSlipWithin48h: number;
      lowSleepLast2Nights: number;
    };
  };
  pingHistory: WitnessPing[];
  dismissedCategories: { [category: string]: number }; // category -> until_timestamp
  modelVersion: 1;
};

type WitnessPing = {
  id: string;
  at: number;
  confidence: number;
  signals: string[]; // which weights contributed
  action: 'engaged' | 'dismissed' | 'not_relevant' | null;
  actionAt: number | null;
  userMood: number | null; // 1-5 if collected
};
```

### `PromiseLetter`

```typescript
type PromiseLetter = {
  generated: boolean;
  writtenAt: number | null;
  deliveredAt: number | null;
  resurfacedAt: { at: number, context: string }[];
  openedCount: number;
  closedAt: number | null;
  body: {
    salutation: string;
    reason: string;
    trigger: string;
    whatYouMightForget: string;
    whyItsWorthIt: string;
    signoff: string;
    signature: string;
    tone: 'gentle' | 'balanced' | 'direct' | 'drill';
  };
};
```

### `Pact`

```typescript
type Pact = {
  id: string;
  partnerId: string; // user ID
  partnerName: string;
  partnerAvatarUrl: string | null;
  duration: 7 | 14 | 30;
  strict: boolean;
  startedAt: number | null; // null if pending
  endsAt: number | null;
  stake: 1 | 5;
  note: string | null;
  status: 'pending' | 'active' | 'won_both' | 'won_self' | 'lost_self' | 'lost_both' | 'aborted';
  cheersSent: { at: number, template: string }[];
  cheersReceived: { at: number, template: string }[];
  yourSlips: number; // count during pact
  partnerSlips: number;
  escrowId: string | null; // Stripe ID
  invitedAt: number;
  invitationExpiresAt: number;
  acceptedAt: number | null;
  declinedAt: number | null;
  abortedAt: number | null;
  abortReason: string | null;
};
```

### `BodyReceipt`

```typescript
type BodyReceipt = {
  id: string;
  weekOf: string; // ISO date (Sunday)
  completedAt: number;
  lungHoldSeconds: number;
  apple_health: AppleHealthData | null;
  photoBase64: string | null; // local-only
  mood: 1 | 2 | 3 | 4 | 5;
  bodyNote: string;
  noticeNote: string;
  delta: {
    lungHoldDelta: number;
    sleepDelta: number;
    weightDelta: number;
    moodDelta: number;
  } | null;
};

type AppleHealthData = {
  sleepAvgHours: number;
  weightLbs: number;
  hrvAvg: number;
  mindfulnessMinutes: number;
};
```

### `CalmSession`

```typescript
type CalmSession = {
  id: string;
  scriptId: string;
  tone: string;
  startedAt: number;
  completedAt: number | null;
  durationSec: number;
  completed: boolean;
  trigger: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late';
};
```

### `CoachMessage`

```typescript
type CoachMessage = {
  id: string;
  at: number;
  role: 'user' | 'coach';
  text: string;
  tone: 'gentle' | 'balanced' | 'direct' | 'drill' | null;
  isInsight: boolean;
  actionCards: ActionCard[] | null;
};

type ActionCard = {
  type: string; // COACH_ACTION_TYPES
  title: string;
  params: any;
};
```

### `CoachAction`

```typescript
type CoachAction = {
  at: number;
  type: string; // COACH_ACTION_TYPES enum
  params: any;
  proposed: boolean;
  tapped: boolean;
  confirmed: boolean;
  executed: boolean;
  cancelledAt: number | null;
};
```

### `FocusSession`

```typescript
type FocusSession = {
  id: string;
  intensity: 'whisper' | 'calm' | 'steady' | 'locked' | 'trenches';
  durationMin: number;
  startedAt: number;
  endedAt: number | null;
  completed: boolean;
  pauseCount: number;
  whitelistedApps: string[];
  note: string | null;
  xpEarned: number;
};
```

### `ShieldState`

```typescript
type ShieldState = {
  enabled: boolean;
  mode: 'always' | 'windowed' | 'session' | 'lockdown';
  windows: { start: string, end: string, days: string[] }[];
  blocklists: {
    vapeDefault: boolean;
    socialRisk: boolean;
    custom: { type: 'app' | 'site', id: string, label: string }[];
  };
  shieldTheme: 'coach_face' | 'streak_count' | 'promise' | 'black';
  attempts: { at: number, target: string, mode: string }[];
};
```

### `LockdownState`

```typescript
type LockdownState = {
  active: boolean;
  startedAt: number | null;
  endsAt: number | null;
  emergencyInvocations: number;
};
```

### `CrisisState`

```typescript
type CrisisState = {
  active: boolean;
  startedAt: number | null;
  endsAt: number | null;
  reason: string | null;
  extendedCount: number;
};
```

### `ActivityEntry`

```typescript
type ActivityEntry = {
  at: number;
  type: 'slip' | 'recovery' | 'milestone' | 'rank_promotion' | 'pact_event' | 'body_receipt' | 'session' | 'calm';
  amount: number; // XP delta if applicable
  source: string; // related entity ID
  description: string;
};
```

### `VapeProfile`

```typescript
type VapeProfile = {
  lastPuffCategory: 'less_than_hour' | 'less_than_day' | '1_3_days' | '4_plus_days' | 'never_started';
  peakDailyPuffs: number;
  triggers: string[];
};
```

### `OnboardTrial` (legacy compat key)

```typescript
type OnboardTrial = {
  name: string;
  tone: string;
  checkin: string;
  committed: boolean;
  signedAt: number;
  trialStartedAt: number;
};
```

### `LifetimeState`

```typescript
type LifetimeState = {
  eligibleAt: number | null;
  offeredAt: number[];
  purchased: boolean;
  purchasedAt: number | null;
  price: number | null;
};
```

### `ToneTestResult`

```typescript
type ToneTestResult = {
  tone: string;
  takenAt: number;
  picks: number[]; // raw answers
  scores: { [tone: string]: number };
};
```

### `BedtimeEntry`

```typescript
type BedtimeEntry = {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  slipCount: number;
  reflection: string;
};
```

### `MorningEntry`

```typescript
type MorningEntry = {
  date: string;
  mood: number;
  sleepHours: number;
  intention: string;
};
```

---

## §4. Migration

When loading `coreState`, run version check:

```typescript
function migrate(raw: any): CoreState {
  if (!raw) return defaultState();
  if (raw.version === 2) return raw;
  if (raw.version === undefined || raw.version === 1) {
    return migrateV1ToV2(raw);
  }
  throw new Error(`Unknown version: ${raw.version}`);
}

function migrateV1ToV2(v1: any): CoreState {
  return {
    version: 2,
    appVersion: '...',
    installedAt: v1.installedAt || Date.now(),
    profile: {
      name: v1.coreOnboardTrial?.name || '',
      age: v1.profile?.age || 0,
      avatarUrl: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      region: 'OTHER',
    },
    trial: v1.coreOnboardTrial ? { ...v1.coreOnboardTrial } : defaultTrial(),
    stats: v1.stats || { lungs: 50, brain: 50, wallet: 50, willpower: 50, body: 50 },
    streak: v1.streak || defaultStreak(),
    xp: v1.xp || 0,
    rank: 'Focus',
    slips: v1.slips || [],
    // ... etc — fill in defaults for new fields
    witness: defaultWitness(),
    promiseLetter: null,
    pacts: [],
    bodyReceipts: [],
    calmLibrary: defaultCalm(),
    coachConversations: v1.coachConversations || [],
    coachActions: [],
    sessions: [],
    shield: defaultShield(),
    lockdown: defaultLockdown(),
    crisisMode: defaultCrisis(),
    // ...
  };
}
```

---

## §5. Analytics events catalogue

Complete event list (with payload shape) — see also `02_EXISTING_FILES_AUDIT.md` §0.

### Event shape

```typescript
type Event = {
  name: string;
  at: number;
  sessionId: string;
  anonId: string;
  appVersion: string;
  props: { [key: string]: any };
};
```

### Categorized events

#### Lifecycle (8)

- `app_first_open` — `{}`
- `app_install_completed` — `{platform}`
- `app_foreground` — `{timeSinceBackground}`
- `app_background` — `{timeInForeground}`
- `session_start` — `{}`
- `session_end` — `{duration, screensViewed}`
- `screen_view` — `{screen, path, sessionDuration}`
- `error_boundary` — `{component, message, stack}`

#### Onboarding (24)

- `splash_viewed` — `{}`
- `splash_routed_to` — `{target}`
- `splash_skipped` — `{}`
- `index_viewed` — `{}`
- `index_cta_tapped` — `{cta}`
- `index_orb_tapped` — `{stat}`
- `walkthrough_viewed` — `{}`
- `walkthrough_tab_changed` — `{tab}`
- `walkthrough_exited` — `{viaExitIntent}`
- `trial_viewed` — `{}`
- `trial_step_view` — `{step}`
- `trial_step_complete` — `{step, durationMs}`
- `promise_typed` — `{lengthSoFar}` (debounced)
- `promise_paste_attempted` — `{}`
- `promise_hint_shown` — `{}`
- `promise_signed` — `{}`
- `name_entered` — `{length}`
- `coach_tone_selected` — `{tone, viaTest}`
- `coach_tone_test_started` — `{}`
- `coach_tone_test_completed` — `{result, picks}`
- `tone_preview_tapped` — `{tone}`
- `checkin_time_selected` — `{time}`
- `trial_started` — `{}`
- `trial_skipped` — `{atStep}`
- `exit_intent_shown` — `{atStep}`
- `exit_intent_dismissed` — `{}`
- `exit_intent_left` — `{}`

#### Quiz (8)

- `quiz_viewed` — `{}`
- `quiz_step_view` — `{step, key}`
- `quiz_step_complete` — `{step, key, answer}`
- `quiz_answer_edited` — `{step, oldAnswer, newAnswer}`
- `quiz_completed` — `{duration, age, mainGoal}`
- `quiz_abandoned` — `{atStep, duration}`
- `age_gate_triggered` — `{age}`
- `vape_profile_logged` — `{lastPuff, peakDaily, triggers}`

#### Permissions (10)

- `permissions_viewed` — `{}`
- `permissions_card_viewed` — `{permission}`
- `permissions_why_tapped` — `{permission}`
- `permissions_granted` — `{permission}`
- `permissions_denied` — `{permission}`
- `permissions_skipped` — `{permission}`
- `permissions_completed` — `{grantedCount, deniedCount, skippedCount}`
- `pick_habits_viewed` — `{}`
- `pick_habits_attempt_locked` — `{habit}`
- `pick_habits_completed` — `{selectedHabits}`

#### Dashboard / Habits (30+)

- `dashboard_viewed` — `{}`
- `dashboard_quickaction` — `{action}`
- `stat_card_tapped` — `{stat}`
- `streak_strip_tapped` — `{}`
- `freeze_pill_tapped` — `{}`
- `freeze_confirmed` — `{}`
- `freeze_cancelled` — `{}`
- `today_slips_pill_tapped` — `{}`
- `restore_banner_viewed` — `{minutesSinceSlip}`
- `restore_banner_dismissed` — `{}`
- `restore_banner_tapped` — `{}`
- `restore_purchased` — `{}`
- `streak_lost` — `{previousDays}`
- `streak_restored` — `{previousDays, daysSinceLoss}`
- `streak_freeze_used` — `{remainingThisWeek}`
- `habit_viewed` — `{habit}`
- `habit_slip_button_pressed` — `{habit}`
- `slip_confirm_viewed` — `{habit}`
- `slip_confirm_hold_start` — `{}`
- `slip_confirm_hold_release` — `{duration}`
- `slip_confirmed` — `{habit, magnitude}`
- `slip_almost` — `{mood, hasNote}`
- `slip_trigger_logged` — `{triggers, hasNote}`
- `slip_trigger_skipped` — `{}`
- `recovery_started` — `{slipId}`
- `recovery_step_completed` — `{step}`
- `recovery_completed` — `{duration, hasReflection, suggestion}`
- `recovery_skipped` — `{atStep}`
- `today_quest_tapped` — `{questId}`
- `today_quest_completed` — `{questId}`

(See `02_EXISTING_FILES_AUDIT.md` §0 for the rest.)

---

## §6. Sync protocol (v2 — deferred, v1 is local-only)

For v2 multi-device sync:

- `lastSyncedAt` timestamp on every state object.
- Conflict resolution: latest-write-wins per field.
- Sync endpoint: `POST /sync` with delta + ack.
- Fully local fallback if no network.

For v1 ship: NO server sync. Everything local. Storage is the source of truth.

---

## §7. Achievements registry

```typescript
const ACHIEVEMENTS = {
  'first_day': { title: 'First day', description: 'You opened Core and stayed.', trigger: 'onboarding_completed' },
  'honest_slip': { title: 'Honest Slip', description: 'You logged it within 5 minutes.', trigger: 'slip_confirmed_within_5_min_of_real' },
  'the_recovery': { title: 'The Recovery', description: 'Complete a recovery quest within 10 minutes of a slip.', trigger: 'recovery_within_10_min' },
  'spark': { title: 'Spark', description: 'A full week.', trigger: 'streak_7' },
  'steady': { title: 'Steady', description: 'Two weeks.', trigger: 'streak_14' },
  'forge': { title: 'Forge', description: 'Habit-threshold crossed.', trigger: 'streak_30' },
  'edge': { title: 'Edge', description: 'Halfway to three months.', trigger: 'streak_60' },
  'peak': { title: 'Peak', description: 'Triple-digit.', trigger: 'streak_100' },
  'core': { title: 'Core', description: 'A year.', trigger: 'streak_365' },
  'first_pact': { title: 'First Pact', description: '$5 on a friend.', trigger: 'pact_completed_any' },
  'pact_keeper': { title: 'Pact Keeper', description: 'Both made it.', trigger: 'pact_completed_won_both' },
  'witness_listener': { title: 'Witness Listener', description: 'First Witness engaged.', trigger: 'witness_ping_engaged' },
  'witness_apprentice': { title: 'Witness Apprentice', description: '10 engaged.', trigger: 'witness_ping_engaged_count_10' },
  'receipt': { title: 'Receipt', description: 'First Body Receipt.', trigger: 'body_receipt_completed' },
  'receipt_streak': { title: 'Receipt Streak', description: '4 weeks.', trigger: 'body_receipt_streak_4' },
  'promise_reader': { title: 'Promise Reader', description: 'Opened the letter.', trigger: 'promise_letter_opened' },
  'promise_keeper': { title: 'Promise Keeper', description: 'Read 5x.', trigger: 'promise_letter_opened_5' },
  'calm_tap': { title: 'Calm Tap', description: 'First Calm session.', trigger: 'calm_session_completed' },
  'calm_practiced': { title: 'Calm Practiced', description: '10 sessions.', trigger: 'calm_session_completed_10' },
  'lifetime': { title: 'Lifetime', description: 'Settled in.', trigger: 'lifetime_purchased' },
  'first_90': { title: 'The First 90', description: 'Looked at the work.', trigger: 'report_90_viewed' },
  'layered': { title: 'Layered', description: 'Bonus habit added.', trigger: 'bonus_habit_added' },
  'word_out': { title: 'Word out', description: 'First share.', trigger: 'shared_any' }
};
```

---

## §8. Constants

```typescript
const MILESTONE_TIERS = [7, 14, 30, 60, 90, 100, 365];

const RANKS = [
  { id: 'focus', label: 'Focus', minDays: 0 },
  { id: 'spark', label: 'Spark', minDays: 7 },
  { id: 'steady', label: 'Steady', minDays: 14 },
  { id: 'flow', label: 'Flow', minDays: 21 },
  { id: 'forge', label: 'Forge', minDays: 30 },
  { id: 'iron', label: 'Iron', minDays: 45 },
  { id: 'edge', label: 'Edge', minDays: 60 },
  { id: 'crest', label: 'Crest', minDays: 80 },
  { id: 'peak', label: 'Peak', minDays: 100 },
  { id: 'summit', label: 'Summit', minDays: 150 },
  { id: 'apex', label: 'Apex', minDays: 200 },
  { id: 'beyond', label: 'Beyond', minDays: 300 },
  { id: 'core', label: 'Core', minDays: 365 },
];

const HABIT_PRIMARY = {
  vape: 'lungs',
  doomscroll: 'brain',
  spend: 'wallet',
  drink: 'willpower',
  porn: 'willpower',
  junk_food: 'body',
  weed: 'lungs',
  nicotine_pouch: 'lungs',
  phone_in_bed: 'brain',
  sugary_drinks: 'body',
};

const HABIT_SECONDARY = {
  vape: 'willpower',
  doomscroll: 'willpower',
  spend: 'willpower',
  drink: 'body',
  porn: 'brain',
  junk_food: 'willpower',
  weed: 'brain',
  nicotine_pouch: 'willpower',
  phone_in_bed: 'body',
  sugary_drinks: 'willpower',
};

const COACH_ACTION_TYPES = {
  CALM_LIBRARY: 'calm_library',
  FOCUS_SESSION: 'focus_session',
  PACT_DRAFT: 'pact_draft',
  WITNESS_WINDOW: 'witness_window',
  BODY_RECEIPT_REMINDER: 'body_receipt_reminder',
  PROMISE_LETTER: 'promise_letter',
  CHECKIN_SCHEDULE: 'checkin_schedule',
  WITNESS_MUTE: 'witness_mute',
  PAUSE_COACH: 'pause_coach',
  CRISIS: 'crisis',
};

const SESSION_INTENSITIES = {
  whisper: { /* see 03 §7 */ },
  calm: { /* */ },
  steady: { /* */ },
  locked: { /* */ },
  trenches: { /* */ },
};

const RANK_PERKS = {
  spark: ['pact_invitation'],
  steady: ['bonus_tone_preview'],
  flow: ['body_receipt_template'],
  forge: ['bonus_habit_slot_1'],
  iron: ['calm_library_customization'],
  edge: ['public_profile'],
  crest: ['veteran_badge'],
  peak: ['90_day_report_customization'],
  summit: ['bonus_habit_slot_2'],
  apex: ['coach_tone_mixing'],
  beyond: ['pact_host_mode'],
  core: ['lifetime_discount'],
};
```

---

## §9. Computed values (not stored)

These are derived from coreState on demand:

- `lifeScore()` — average of 5 stats
- `currentRank()` — finds rank where streak.days >= minDays
- `nextRank()` — next rank to unlock
- `daysToNextRank()` — `nextRank.minDays - streak.days`
- `isStreakRecoverable()` — `streak.lostAt && now - lostAt < 48h`
- `streakLost()` — `streak.days === 0 && streak.previousDays > 0`
- `trialDay()` — `(now - trial.trialStartedAt) / 86400000`
- `trialExpired()` — `trialDay() >= 7 && !subscription.active`
- `daysIdle()` — `(now - lastSeenAt) / 86400000`
- `accountAge()` — `(now - installedAt) / 86400000`
- `todayDeltas(state)` — slips in last 24h aggregated by primary stat
- `bonusHabitSlots()` — `floor((streak.days - 0) / 30)` capped at total available
- `lifetimeEligible()` — `accountAge() >= 30`
- `recoveryQualityScore()` — `(daysClean * 1.0) + (recoveriesCompleted * 0.5) - (slipsThisMonth * 0.3)`

---

## §10. Data limits + pruning

| Data type | Cap | Pruning strategy |
|---|---|---|
| Slips | 500 | When > 500, prune oldest. Move to `slipHistorySummary` aggregate. |
| Body Receipts | 26 (6 months) | Drop oldest receipt + photo when > 26. |
| Coach Conversations | 50 messages | Drop oldest message when > 50. |
| Pacts (completed) | Unlimited | Keep all (history matters). |
| Activity log | 200 entries | Drop oldest when > 200. |
| Witness ping history | 100 | Drop oldest when > 100. |
| Calm sessions | 200 | Drop oldest when > 200. |
| Focus sessions | 100 | Drop oldest when > 100. |
| Analytics ring | 500 | LIFO buffer (sessionStorage). |

### Photo handling (Body Receipts)

- Photos stored as base64 in localStorage.
- Each photo: ~50-200KB after compression.
- 26 receipts × 200KB max = ~5MB cap.
- Compress on capture: resize to 800x800, JPEG quality 0.7.

---

## §11. Privacy boundaries

- **Local-only:** Promise Letter, Body Receipt photos, Coach conversations, Witness model.
- **Server-synced (v2):** Subscription state, account info, Pact state (server is required for partner sync), achievements.
- **Anonymous analytics:** Aggregated to `coreAid` UUID. No PII.
- **Encrypted at rest:** Coach conversations (when synced).
- **Never collected:** GPS coordinates (we use bucketed places only), phone contacts (ephemeral match only), Body Receipt photo content (always local).

---

## §12. End-of-file verification

After implementing data models:

1. Migration: take a v1 state object, run through `migrate()`, verify v2 output.
2. Pruning: simulate 600 slips. Verify slips.length = 500 after pruning.
3. Computed values: spot-check `lifeScore()`, `currentRank()`, `recoveryQualityScore()`.
4. Storage quota: simulate filling with all max-sized data. Total should be < 10MB.

Next file: `10_VERIFICATION.md`.
