import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { coreTrack } from "@/lib/analytics";

const AnimatedView = Animated.createAnimatedComponent(View);

type StatKey = "brain" | "lungs" | "wallet" | "willpower" | "body";

type OrbConfig = {
  key: StatKey;
  label: string;
  tagline: string;
  c: string;
  cLight: string;
  cDeep: string;
  position: { x: number; y: number }; // fractional
};

const ORBS: OrbConfig[] = [
  { key: "brain",     label: "BRAIN",     tagline: "Clarity · Calm · Focus",     c: "#B388FF", cLight: "#E6D7FF", cDeep: "#4F3A8A", position: { x: 0.50, y: 0.05 } },
  { key: "lungs",     label: "LUNGS",     tagline: "Breathe · Rinse · Reset",    c: "#FF6BAA", cLight: "#FFD3E4", cDeep: "#832D50", position: { x: 0.16, y: 0.20 } },
  { key: "wallet",    label: "WALLET",    tagline: "Earn · Save · Grow",         c: "#FFD05C", cLight: "#FFEEBF", cDeep: "#876619", position: { x: 0.84, y: 0.20 } },
  { key: "willpower", label: "WILLPOWER", tagline: "Discipline · Habits · Drive", c: "#FF7A45", cLight: "#FFCEB3", cDeep: "#813617", position: { x: 0.22, y: 0.58 } },
  { key: "body",      label: "BODY",      tagline: "Move · Fuel · Recover",      c: "#5CE1E6", cLight: "#C2F3F5", cDeep: "#1F7478", position: { x: 0.78, y: 0.58 } },
];

const STARS = Array.from({ length: 15 }, (_, i) => ({
  x: Math.random(),
  y: Math.random() * 0.65,
  size: 1.5 + Math.random() * 1.5,
  duration: 4000 + Math.random() * 3000,
  delay: Math.random() * 3000,
}));

function StatIcon({ k, size }: { k: StatKey; size: number }) {
  const stroke = "white";
  const props = { stroke, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (k) {
    case "brain":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v1a3 3 0 0 0 1 2.2A3 3 0 0 0 4 14v1a3 3 0 0 0 3 3 3 3 0 0 0 3 3h.5a1.5 1.5 0 0 0 1.5-1.5V4.5A1.5 1.5 0 0 0 10.5 3H9Z" {...props} />
          <Path d="M15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3v1a3 3 0 0 1-1 2.2A3 3 0 0 1 20 14v1a3 3 0 0 1-3 3 3 3 0 0 1-3 3h-.5a1.5 1.5 0 0 1-1.5-1.5V4.5A1.5 1.5 0 0 1 13.5 3H15Z" {...props} />
        </Svg>
      );
    case "lungs":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 4v12" {...props} />
          <Path d="M12 16c0 2-1.2 4-3 4-2.5 0-4-2-4-5 0-3 1-7 3-9 1-1 2-1 2 0v5" {...props} />
          <Path d="M12 16c0 2 1.2 4 3 4 2.5 0 4-2 4-5 0-3-1-7-3-9-1-1-2-1-2 0v5" {...props} />
        </Svg>
      );
    case "wallet":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="6" width="18" height="13" rx="2.5" {...props} />
          <Path d="M3 10h18" {...props} />
          <Circle cx="16.5" cy="14.5" r="1" {...props} />
        </Svg>
      );
    case "willpower":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2c1 3 3 4.5 3 7a3 3 0 1 1-6 0c0-1 .5-1.8 1-2.5" {...props} />
          <Path d="M5 14c0-2 1-4 3-5-.4 1.4 0 2.6 1 3.5-1 .5-1.5 1.5-1.5 2.5 0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-1.7-1-3-2.5-3.7 1 1.3 1.3 2.5 1 3.7C18 13 19 11 19 9" {...props} />
        </Svg>
      );
    case "body":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="5.5" r="2.5" {...props} />
          <Path d="M12 8.5v6" {...props} />
          <Path d="M8 11l4-2 4 2" {...props} />
          <Path d="M9 21l3-6 3 6" {...props} />
        </Svg>
      );
  }
}

/**
 * Per-orb idle animation profile, matched to 07_AESTHETIC_BIBLE §8:
 *   Brain     pulse 1Hz       (1000ms cycle)
 *   Lungs     breathe 4-4-4-4 (16000ms cycle)
 *   Wallet    pulse 0.5Hz     (2000ms cycle)
 *   Willpower firm tick 1.2Hz (833ms cycle, sharp ease)
 *   Body      static
 */
function getIdleProfile(key: StatKey) {
  switch (key) {
    case "brain":     return { amp: 1.06, dur: 500,   easing: Easing.inOut(Easing.quad),  enabled: true };
    case "lungs":     return { amp: 1.10, dur: 4000,  easing: Easing.inOut(Easing.sin),   enabled: true, hold: 4000 };
    case "wallet":    return { amp: 1.04, dur: 1000,  easing: Easing.inOut(Easing.quad),  enabled: true };
    case "willpower": return { amp: 1.08, dur: 70,    easing: Easing.bezier(0.25, 0, 0.1, 1), enabled: true, gap: 763 };
    case "body":      return { amp: 1.00, dur: 0,                                          enabled: false } as any;
  }
}

function Orb({ config, fieldWidth, fieldHeight, onPress }: { config: OrbConfig; fieldWidth: number; fieldHeight: number; onPress: (k: StatKey) => void }) {
  const pulse = useSharedValue(1);
  const ringScale = useSharedValue(0.9);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    const p = getIdleProfile(config.key);
    if (p.enabled) {
      if (config.key === "lungs") {
        // 4-4-4-4 cadence: scale up 4s · hold 4s · scale down 4s · hold 4s
        pulse.value = withRepeat(
          withSequence(
            withTiming(p.amp,  { duration: p.dur, easing: p.easing }),
            withTiming(p.amp,  { duration: p.hold ?? 4000 }),
            withTiming(1,      { duration: p.dur, easing: p.easing }),
            withTiming(1,      { duration: p.hold ?? 4000 }),
          ),
          -1,
        );
      } else if (config.key === "willpower") {
        // Firm tick: quick scale up, snap back, hold static
        pulse.value = withRepeat(
          withSequence(
            withTiming(p.amp, { duration: p.dur, easing: p.easing }),
            withTiming(1,     { duration: p.dur, easing: p.easing }),
            withTiming(1,     { duration: p.gap ?? 700 }),
          ),
          -1,
        );
      } else {
        pulse.value = withRepeat(
          withSequence(
            withTiming(p.amp, { duration: p.dur, easing: p.easing }),
            withTiming(1,     { duration: p.dur, easing: p.easing }),
          ),
          -1,
        );
      }
    }
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 3000, easing: Easing.out(Easing.quad) }),
        withTiming(0.9, { duration: 0 }),
      ),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0.5, { duration: 1200 }),
        withTiming(0, { duration: 1800 }),
      ),
      -1,
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const { width: w } = useWindowDimensions();
  // Cap at 64 on viewports < 460, shrink to 56 if extra-short, full 84 otherwise
  const orbSize = w < 460 ? 64 : 84;
  const left = fieldWidth * config.position.x - orbSize / 2;
  const top = fieldHeight * config.position.y;

  return (
    <Pressable
      onPress={() => onPress(config.key)}
      hitSlop={8}
      style={({ pressed }) => [
        { position: "absolute", left, top, alignItems: "center", width: orbSize, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
      accessibilityLabel={`${config.label}. ${config.tagline.replace(/·/g, ',')}.`}
    ><AnimatedView
      pointerEvents="none"
      style={[
        { alignItems: "center", width: orbSize },
        orbStyle,
      ]}
    >
      {/* outer halo */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: orbSize + 56,
          height: orbSize + 56,
          left: -28,
          top: -28,
          borderRadius: (orbSize + 56) / 2,
          backgroundColor: config.c + "33",
          opacity: 0.7,
        }}
      />
      {/* pulsing ring */}
      <AnimatedView
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: orbSize + 16,
            height: orbSize + 16,
            left: -8,
            top: -8,
            borderRadius: (orbSize + 16) / 2,
            borderWidth: 1,
            borderColor: config.c,
          },
          ringStyle,
        ]}
      />
      {/* orb body */}
      <View
        style={{
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          backgroundColor: config.c,
          shadowColor: config.c,
          shadowOpacity: 0.95,
          shadowRadius: 35,
          shadowOffset: { width: 0, height: 0 },
          elevation: 30,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* highlight crescent */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: orbSize / 2,
            backgroundColor: "transparent",
            ...{
              shadowColor: "rgba(255,255,255,0.4)",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
            },
          } as any}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          start={{ x: 0.32, y: 0.18 }}
          end={{ x: 0.7, y: 0.6 }}
          style={{ position: "absolute", inset: 0, borderRadius: orbSize / 2 } as any}
        />
        <StatIcon k={config.key} size={40} />
      </View>

      {/* label */}
      <Text style={styles.statName}>{config.label}</Text>
      <Text style={styles.statTag}>{config.tagline}</Text>
    </AnimatedView>
    </Pressable>
  );
}

function Star({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: duration / 2 }),
          withTiming(0.6, { duration: duration / 2 }),
        ),
        -1,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "white",
        },
        animatedStyle,
      ]}
    />
  );
}

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const fieldHeight = height * 0.46;
  const dotPulse = useSharedValue(1);
  const constOpacity = useSharedValue(0);

  useEffect(() => {
    // Analytics — fire once on mount.
    coreTrack("index_viewed", {});

    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1250, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );

    // Constellation lines fade in 800ms after pentagon stabilizes (~1400ms in).
    constOpacity.value = withDelay(1400, withTiming(1, { duration: 800 }));
  }, []);

  const dotAnim = useAnimatedStyle(() => ({ transform: [{ scale: dotPulse.value }] }));
  const constAnim = useAnimatedStyle(() => ({ opacity: constOpacity.value }));

  const onGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    coreTrack("index_cta_tapped", { cta: "start_trial" });
    router.push("/(auth)/trial");
  };
  const onSignIn = () => {
    Haptics.selectionAsync();
    coreTrack("index_cta_tapped", { cta: "sign_in" });
    router.push("/(auth)/sign-in");
  };
  const onWalkthrough = () => {
    Haptics.selectionAsync();
    coreTrack("index_cta_tapped", { cta: "walkthrough" });
    router.push("/(auth)/walkthrough" as never);
  };
  const onProfile = () => {
    Haptics.selectionAsync();
    coreTrack("index_cta_tapped", { cta: "sign_in" });
    router.push("/(auth)/sign-in");
  };
  const onOrbTap = (stat: StatKey) => {
    Haptics.selectionAsync();
    coreTrack("index_orb_tapped", { stat });
    router.push(`/(auth)/tone-detail?stat=${stat}` as never);
  };

  // Constellation lines connect orb centers (using fractional positions).
  // Pentagon edge order: brain → lungs → willpower → body → wallet → brain.
  const cLine = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x1: a.x * width, y1: a.y * fieldHeight + 30,
    x2: b.x * width, y2: b.y * fieldHeight + 30,
  });
  const POS = Object.fromEntries(ORBS.map((o) => [o.key, o.position])) as Record<StatKey, { x: number; y: number }>;

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#06061A", "#02020A", "#050510"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Twinkling stars */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
        {STARS.map((s, i) => (
          <Star key={i} x={s.x} y={s.y} size={s.size} duration={s.duration} delay={s.delay} />
        ))}
      </View>

      <SafeAreaView style={{ flex: 1, zIndex: 5 }} edges={["top", "bottom"]}>
        {/* Top bar — invisible spacer (left) · brand mark (center) · person icon (right).
            Spacer matches person-icon width so brand stays visually centered. */}
        <View style={styles.topbar}>
          <View style={styles.topSpacer} />

          <View style={styles.brandMark}>
            <AnimatedView
              style={[
                {
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#2F8FFF",
                  shadowColor: "#2F8FFF",
                  shadowOpacity: 1,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                },
                dotAnim,
              ]}
            />
            <Text style={styles.brandText}>CORE</Text>
          </View>

          <Pressable onPress={onProfile} style={styles.topIco} hitSlop={10} accessibilityLabel="Sign in">
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,0.88)" strokeWidth={1.6} fill="none" />
              <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.88)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>

        {/* Orb field — constellation lines + pentagon of orbs */}
        <View style={{ height: fieldHeight, position: "relative" }}>
          {/* Constellation lines (faded blue) — hide on viewports < 460 */}
          {width >= 460 && (
            <AnimatedView pointerEvents="none" style={[{ ...StyleSheet.absoluteFillObject }, constAnim]}>
              <Svg width="100%" height="100%">
                {[
                  cLine(POS.brain,     POS.lungs),
                  cLine(POS.lungs,     POS.willpower),
                  cLine(POS.willpower, POS.body),
                  cLine(POS.body,      POS.wallet),
                  cLine(POS.wallet,    POS.brain),
                ].map((c, i) => (
                  <Line key={i} {...c} stroke="#2F8FFF" strokeOpacity={0.18} strokeWidth={0.8} />
                ))}
              </Svg>
            </AnimatedView>
          )}
          {ORBS.map((o) => (
            <Orb key={o.key} config={o} fieldWidth={width} fieldHeight={fieldHeight} onPress={onOrbTap} />
          ))}
        </View>

        {/* Content bottom */}
        <View style={styles.content}>
          <Text style={styles.title}>
            Become{"\n"}who you said{"\n"}
            <Text style={styles.titleGrad}>you'd be.</Text>
          </Text>

          <Pressable
            onPress={onGetStarted}
            style={({ pressed }) => [{ marginTop: 24, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
            accessibilityLabel="Start my 7-day free trial"
          >
            <LinearGradient
              colors={["#2F8FFF", "#5B6AE6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Start my 7-day free trial</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </LinearGradient>
          </Pressable>

          <Text style={styles.subCta}>60 seconds to your first Coach message</Text>

          <View style={styles.altRow}>
            <Text style={styles.altLabel}>I have an account</Text>
            <Pressable onPress={onSignIn} hitSlop={8}>
              <Text style={styles.altLink}>Sign in</Text>
            </Pressable>
          </View>
          <View style={styles.altRow}>
            <Text style={styles.altLabel}>See it first</Text>
            <Pressable onPress={onWalkthrough} hitSlop={8}>
              <Text style={styles.altLink}>5-minute walkthrough</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingHorizontal: 28,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topIco:    { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  topSpacer: { width: 32, height: 32 },
  brandMark: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandText: { fontSize: 14, fontWeight: "700", letterSpacing: 4.8, color: "rgba(255,255,255,0.94)" },
  subCta:    { marginTop: 10, textAlign: "center", color: "rgba(255,255,255,0.50)", fontSize: 12, letterSpacing: 0.3 },
  altRow:    { marginTop: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  altLabel:  { color: "rgba(255,255,255,0.70)", fontSize: 13 },
  altLink:   { color: "#5BB1FF", fontSize: 13, fontWeight: "600" },

  statName: {
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.96)",
    fontWeight: "700",
    marginTop: 12,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  statTag: {
    fontSize: 9,
    letterSpacing: 1.3,
    color: "#9AA1B7",
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },

  content: { paddingHorizontal: 28, paddingBottom: 26, marginTop: "auto" },
  title: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.8,
    lineHeight: 42,
    color: "white",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  titleGrad: {
    // RN doesn't support gradient text natively; we use a glowing accent color instead
    color: "#B388FF",
    textShadowColor: "rgba(179,136,255,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 999,
    shadowColor: "#2F8FFF",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  ctaText: { color: "white", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
});
