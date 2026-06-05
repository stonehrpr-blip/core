/**
 * legal-strings.ts
 *
 * Canonical, single-source legal + consent + disclaimer copy for CORE.
 * The compliance-logic session imports from here — do NOT inline these strings
 * anywhere else. If a legal string is missing, add it here first, then use it.
 *
 * Lane: COPY & LEGAL (content only). Kept in sync with:
 *   - previews/82-legal.html      (Privacy / Terms / Refund / EULA)
 *   - previews/refund-policy.html
 *   - previews/community-guidelines.html
 *   - CORE_BATTLE_PLAN/08_COPY_LIBRARY.md
 *
 * Compliance notes:
 *   - CORE is an 18+ app (nicotine-related). MIN_AGE is 18 everywhere.
 *   - No absolute health-outcome claims. Recovery copy is subjective
 *     ("many people report…"), never guaranteed. TGA/ACCC risk in Australia.
 *   - "Core" is a PLACEHOLDER entity name pending ASIC registration.
 *     Replace ENTITY.legalName once the real entity is incorporated.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Entity & contact
// ─────────────────────────────────────────────────────────────────────────────

export const ENTITY = {
  /** Display + legal name. PLACEHOLDER — pending ASIC registration. */
  legalName: "Core",
  appName: "Core",
  /** Set to true once the real entity is registered with ASIC. */
  isRegisteredEntity: false,
  governingLaw: "New South Wales, Australia",
  currency: "AUD",
} as const;

export const SUPPORT_EMAIL = "corestudiosupport@gmail.com";

/** Minimum age to create an account or use CORE. */
export const MIN_AGE = 18 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Disclaimers (informational — surface in onboarding, settings, AI surfaces)
// ─────────────────────────────────────────────────────────────────────────────

export const DISCLAIMERS = {
  /** Top-level "this is not medical advice" disclaimer. */
  notMedicalAdvice:
    "Core is a self-help wellness tool. It is not medical, mental-health, " +
    "addiction, financial, or legal advice and does not guarantee any outcome. " +
    "If you are in crisis or experiencing a medical emergency, stop using Core " +
    "and contact your local emergency services. You use Core voluntarily and at " +
    "your own risk.",

  /** Shown on/near AI Coach surfaces. */
  aiCoach:
    "Coach is an AI assistant. AI-generated content can be inaccurate, " +
    "incomplete, or misleading, and is for informational and motivational " +
    "purposes only. It is not a clinician, therapist, doctor, lawyer, or " +
    "financial adviser. Verify anything important before acting on it.",

  /** Assumption-of-risk for habit/nicotine change. */
  healthRisk:
    "Changing habits — including reducing or stopping nicotine — can carry " +
    "health risks for some people, including withdrawal symptoms. Core does not " +
    "assess your individual medical history. Before making significant changes, " +
    "consider speaking with a qualified healthcare professional, especially if " +
    "you have a pre-existing condition, are pregnant or breastfeeding, or take " +
    "medication.",

  /** Crisis routing disclaimer. */
  crisis:
    "Core is not a crisis service. If you or someone else is in danger or " +
    "thinking about self-harm, contact local emergency services or a crisis " +
    "line right away.",

  /**
   * Approved framing for recovery/progress copy. Use this pattern instead of
   * absolute claims like "your lungs heal" or "breath capacity climbs by month 3".
   */
  recoveryFraming:
    "Everyone is different. Many people report feeling better over time, but " +
    "results vary and are not guaranteed.",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Consent strings (require explicit user action — gate flows on these)
// ─────────────────────────────────────────────────────────────────────────────

export const CONSENT = {
  /** Age gate. Block account creation unless confirmed. */
  ageConfirmation:
    "I confirm I am 18 years or older. Core deals with nicotine-related habits " +
    "and is intended only for adults.",

  /** Terms / Privacy / EULA acceptance at sign-up. */
  termsAcceptance:
    "By continuing, you agree to Core's Terms of Service, Privacy Policy, and " +
    "EULA, and confirm you are 18 or older.",

  /** Consent to AI processing of messages. */
  aiProcessing:
    "Messages you send to Coach are processed to generate responses. We do not " +
    "use your private habit logs or Coach messages to train our own AI models.",

  /** Optional health-data consent (Apple Health / breath timer). */
  healthData:
    "You're choosing to share health-related data (such as your breath-hold " +
    "timer or Apple Health metrics) so Core can show your progress over time. " +
    "This is optional and you can turn it off any time in Settings.",

  /** Subscription / auto-renew disclosure shown before purchase. */
  subscriptionDisclosure:
    "7 days free, then your subscription renews automatically through the app " +
    "store unless you cancel at least 24 hours before the period ends. Manage or " +
    "cancel any time in your app-store subscription settings. Prices in AUD.",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Refund / cancellation (mirrors previews/refund-policy.html)
// ─────────────────────────────────────────────────────────────────────────────

export const REFUND = {
  summary:
    "Cancel any time in your device's subscription settings — access continues " +
    "until the end of the period you've paid for. Purchases are processed by the " +
    "Apple App Store or Google Play, and refunds are handled under their policies.",
  cancelApple:
    "Settings → your name → Subscriptions → Core → Cancel Subscription.",
  cancelGoogle:
    "Google Play → profile → Payments & subscriptions → Subscriptions → Core → " +
    "Cancel subscription.",
  refundApple: "Request a refund at reportaproblem.apple.com.",
  refundGoogle: "Request a refund via your Google Play order history.",
  consumerLaw:
    "Nothing in this policy excludes or limits consumer guarantees that cannot " +
    "be excluded under the Australian Consumer Law or other mandatory " +
    "consumer-protection laws.",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Crisis lines (region-keyed; copy in sync with crisis.html in copy library §8)
// ─────────────────────────────────────────────────────────────────────────────

export type CrisisLine = { label: string; value: string };

export const CRISIS_LINES: Record<string, CrisisLine[]> = {
  AU: [
    { label: "Lifeline", value: "13 11 14" },
    { label: "Beyond Blue", value: "1300 22 4636" },
    { label: "Suicide Call Back Service", value: "1300 659 467" },
  ],
  US: [
    { label: "988 Suicide & Crisis Lifeline", value: "988" },
    { label: "Crisis Text Line", value: "Text HOME to 741741" },
  ],
  UK: [{ label: "Samaritans", value: "116 123" }],
  CA: [{ label: "Talk Suicide Canada", value: "988" }],
  NZ: [{ label: "Need to talk?", value: "1737" }],
  IE: [{ label: "Samaritans", value: "116 123" }],
};

/** Default region used when the user's region is unknown. */
export const DEFAULT_CRISIS_REGION = "AU" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Legal document references (relative to the previews/ web bundle)
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL_DOCS = {
  privacy: { title: "Privacy Policy", href: "82-legal.html#privacy" },
  terms: { title: "Terms of Service", href: "82-legal.html#terms" },
  refund: { title: "Refund & Cancellation", href: "refund-policy.html" },
  eula: { title: "EULA", href: "82-legal.html#eula" },
  community: {
    title: "Community Guidelines",
    href: "community-guidelines.html",
  },
} as const;

export const LEGAL_LAST_UPDATED = "2026-06-05" as const;
