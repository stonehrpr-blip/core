import { useState, useMemo, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { useAuthStore, type CoachTone, type CheckinSlot } from "../../stores/auth-store";
import { scheduleCheckinsFromTrial } from "../../lib/notifications";

const AnimatedView = Animated.createAnimatedComponent(View);

const TONES: { key: CoachTone; label: string; desc: string; c: string }[] = [
  { key: "gentle",   label: "Gentle",   desc: "Warm, patient, kind. Like a quiet friend.",  c: "#5CE1E6" },
  { key: "balanced", label: "Balanced", desc: "Honest, fair, no fluff. Tells it straight.", c: "#B388FF" },
  { key: "direct",   label: "Direct",   desc: "Sharp and to the point. No excuses, no hugs.", c: "#FF7A45" },
  { key: "drill",    label: "Drill",    desc: "Tough love. Pushes harder when you slip.",   c: "#FF6BAA" },
];

const TOTAL = 4;

export default function Trial() {
  const insetsW = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);

  const { trial, setTrial, startTrial } = useAuthStore((s) => ({
    trial: s.trial,
    setTrial: s.setTrial,
    startTrial: s.startTrial,
  }));

  const slideX = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({
    opacity: slideX.value === 0 ? 1 : 0.001,
    transform: [{ translateX: slideX.value }],
  }));

  const animateToStep = (next: number) => {
    slideX.value = withTiming(-28, { duration: 180, easing: Easing.out(Easing.quad) }, () => {
      slideX.value = 28;
    });
    setTimeout(() => {
      setStep(next);
      slideX.value = withSpring(0, { damping: 14, stiffness: 140 });
    }, 200);
  };

  const ctaConfig = useMemo(() => {
    if (step === 0) {
      return {
        label: "Continue",
        disabled: !trial.committed,
        helper: trial.committed ? "Let's go." : "Toggle the promise to continue",
      };
    }
    if (step === 1) {
      const len = trial.name.trim().length;
      return {
        label: "Next",
        disabled: len < 2,
        helper: len < 2 ? "Enter your name to continue" : "Tap next",
      };
    }
    if (step === 2) {
      return {
        label: "Next",
        disabled: !trial.tone,
        helper: trial.tone ? `Coach will sound "${trial.tone}"` : "Pick a tone to continue",
      };
    }
    if (step === 3) {
      return {
        label: "Next",
        disabled: !trial.checkin,
        helper: trial.checkin ? `You'll be nudged · ${trial.checkin}` : "Pick a check-in time",
      };
    }
    return {
      label: "Start free trial",
      disabled: false,
      helper: "$0 today. Cancel anytime before day 7.",
    };
  }, [step, trial]);

  const onNext = () => {
    if (ctaConfig.disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL) {
      animateToStep(step + 1);
    } else {
      startTrial();
      // Schedule local notifications based on the picked check-in slot.
      // Fails silently if the user denies permissions — they can opt in later in Settings.
      scheduleCheckinsFromTrial({ ...trial, trialStartedAt: new Date().toISOString() }).catch(() => {});
      router.push("/(auth)/onboarding/quiz");
    }
  };

  const onBack = () => {
    Haptics.selectionAsync();
    if (step > 0) animateToStep(step - 1);
    else setExitOpen(true);
  };

  const toggleCommit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTrial({ committed: !trial.committed });
  };

  const exitConfirm = () => setExitOpen(true);
  const exitDismiss = () => setExitOpen(false);
  const exitNow = () => router.replace("/(auth)");

  // commit toggle anim
  const knob = useSharedValue(0);
  useEffect(() => {
    knob.value = withSpring(trial.committed ? 1 : 0, { damping: 18, stiffness: 200 });
  }, [trial.committed]);
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value * 20 }] }));

  return (
    <View style={s.root}>
      <LinearGradient colors={["#100828", "#02020A", "#050510"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={s.topbar}>
          <Pressable onPress={onBack} style={s.iconBtn} hitSlop={10}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={s.brand}>
            <View style={s.brandDot} />
            <Text style={s.brandTxt}>CORE</Text>
          </View>
          <Pressable onPress={exitConfirm} style={s.iconBtn} hitSlop={10}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>

        <View style={s.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[s.dot, i <= step && s.dotOn]} />
          ))}
        </View>

        <AnimatedView style={[{ flex: 1 }, slideStyle]}>
          <ScrollView contentContainerStyle={s.stepBody} showsVerticalScrollIndicator={false}>
            {step === 0 && (
              <>
                <Text style={s.kicker}>Before we start</Text>
                <Text style={s.title}>This only{"\n"}<Text style={s.titleAccent}>works if you mean it.</Text></Text>
                <Text style={s.copy}>CORE isn't a tracker — it's a witness. Tap the promise that's true for you. You can take this back later.</Text>

                <Pressable onPress={toggleCommit} style={[s.commitBox, trial.committed && s.commitBoxOn]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.commitTitle}>I'm doing this for me.</Text>
                      <Text style={s.commitSub}>Not for a partner, parent, or doctor. For me.</Text>
                    </View>
                    <View style={[s.toggle, trial.committed && s.toggleOn]}>
                      <AnimatedView style={[s.knob, knobStyle]} />
                    </View>
                  </View>
                  <Text style={[s.commitMeta, trial.committed && { color: "#5BB1FF" }]}>
                    {trial.committed ? "// promise locked" : "// not yet committed"}
                  </Text>
                </Pressable>
              </>
            )}

            {step === 1 && (
              <>
                <Text style={s.kicker}>Step 1 of 4</Text>
                <Text style={s.title}>What should we{"\n"}<Text style={s.titleAccent}>call you?</Text></Text>
                <Text style={s.copy}>First name only. This is how your coach will greet you each day, and how your wins appear on the leaderboard.</Text>
                <TextInput
                  value={trial.name}
                  onChangeText={(v) => setTrial({ name: v })}
                  placeholder="Your first name"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  autoFocus
                  maxLength={24}
                  autoComplete="given-name"
                  style={s.field}
                />
              </>
            )}

            {step === 2 && (
              <>
                <Text style={s.kicker}>Step 2 of 4</Text>
                <Text style={s.title}>How should your{"\n"}<Text style={s.titleAccent}>coach talk to you?</Text></Text>
                <Text style={s.copy}>Pick the tone that'll keep you honest. You can change it any time.</Text>
                <View style={s.toneGrid}>
                  {TONES.map((t) => {
                    const sel = trial.tone === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => { Haptics.selectionAsync(); setTrial({ tone: t.key }); }}
                        style={[s.toneCard, sel && s.toneCardSel]}
                      >
                        <View style={[s.toneIco, { backgroundColor: t.c, shadowColor: t.c }]}>
                          <ToneIcon k={t.key} />
                        </View>
                        <Text style={s.toneName}>{t.label}</Text>
                        <Text style={s.toneDesc}>{t.desc}</Text>
                        {sel && <View style={s.toneCheck} />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={s.kicker}>Step 3 of 4</Text>
                <Text style={s.title}>When should I{"\n"}<Text style={s.titleAccent}>check in on you?</Text></Text>
                <Text style={s.copy}>A single, calm nudge — once or twice a day. Stays in Notification Center. No streak guilt, no spam.</Text>
                <View style={{ marginTop: 6, gap: 10 }}>
                  {([
                    { key: "morning", label: "Morning", desc: "Anchor the day at 8:30 AM", c: "#FFD05C" },
                    { key: "evening", label: "Evening", desc: "Reflect on the day at 9:00 PM", c: "#B388FF" },
                    { key: "both",    label: "Both",    desc: "Anchor the day and reflect at night", c: "#2F8FFF", rec: true },
                  ] as { key: CheckinSlot; label: string; desc: string; c: string; rec?: boolean }[]).map((opt) => {
                    const sel = trial.checkin === opt.key;
                    return (
                      <Pressable
                        key={opt.key as string}
                        onPress={() => { Haptics.selectionAsync(); setTrial({ checkin: opt.key }); }}
                        style={[s.toneCard, { width: "100%", flexDirection: "row", alignItems: "center", gap: 14 }, sel && s.toneCardSel]}
                      >
                        <View style={[s.toneIco, { backgroundColor: opt.c, shadowColor: opt.c, marginBottom: 0 }]}>
                          <Svg width={18} height={18} viewBox="0 0 24 24">
                            {opt.key === "morning" && (
                              <Path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke="white" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                            {opt.key === "evening" && (
                              <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="white" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                            {opt.key === "both" && (
                              <>
                                <Circle cx={12} cy={12} r={9} stroke="white" strokeWidth={1.7} fill="none" />
                                <Path d="M12 3v9l5 3" stroke="white" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </>
                            )}
                          </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={s.toneName}>{opt.label}</Text>
                            {opt.rec && (
                              <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "rgba(47,143,255,0.12)", borderRadius: 4 }}>
                                <Text style={{ color: "#2F8FFF", fontSize: 9, letterSpacing: 0.8, fontWeight: "700" }}>RECOMMENDED</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.toneDesc}>{opt.desc}</Text>
                        </View>
                        {sel && <View style={s.toneCheck} />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {step === 4 && (
              <>
                <Text style={s.kicker}>Step 4 of 4</Text>
                <Text style={s.title}>Start your{"\n"}<Text style={s.titleAccent}>7-day free trial.</Text></Text>
                <Text style={s.copy}>No card now. We'll ask before anything's charged. Cancel any time in Settings.</Text>
                <LinearGradient
                  colors={["rgba(47,143,255,0.10)", "rgba(179,136,255,0.08)", "rgba(255,107,170,0.06)"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.trialCard}
                >
                  <View style={s.trialBadge}>
                    <Svg width={10} height={10} viewBox="0 0 24 24">
                      <Circle cx={12} cy={12} r={9} stroke="#2F8FFF" strokeWidth={2} fill="none" />
                      <Path d="M12 7v5l3 2" stroke="#2F8FFF" strokeWidth={2} fill="none" strokeLinecap="round" />
                    </Svg>
                    <Text style={s.trialBadgeTxt}>7 days free</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 14 }}>
                    <Text style={s.trialPrice}>$7.99</Text>
                    <Text style={s.trialUnit}>/ month after trial</Text>
                  </View>
                  <Text style={s.trialSub}>Or $44.99/year (save 53%) — chosen later.</Text>
                  {[
                    "Tap-to-log slip with visceral lungs feedback",
                    "5-stat life score that grows when you don't",
                    "AI Coach trained on your tone choice",
                    "Streak widget, leaderboard, recovery quests",
                    "A letter from you on day 7 — Coach writes it",
                  ].map((line) => (
                    <View key={line} style={s.bullet}>
                      <View style={s.bulletCk}>
                        <Svg width={10} height={10} viewBox="0 0 24 24">
                          <Path d="M5 13l4 4L19 7" stroke="#2F8FFF" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                      <Text style={s.bulletTxt}>{line}</Text>
                    </View>
                  ))}
                  <Text style={s.smallPrint}>Cancel in Settings any time before day 7 and pay $0.</Text>
                </LinearGradient>
              </>
            )}
          </ScrollView>
        </AnimatedView>

        <View style={s.footer}>
          <Pressable onPress={onNext} disabled={ctaConfig.disabled} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
            <LinearGradient
              colors={ctaConfig.disabled ? ["#3a3a4a", "#2a2a3a"] : ["#2F8FFF", "#6F70FF", "#B388FF"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.cta, ctaConfig.disabled && { opacity: 0.5 }]}
            >
              <Text style={s.ctaTxt}>{ctaConfig.label}</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M5 12h14M13 5l7 7-7 7" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </LinearGradient>
          </Pressable>
          <Text style={s.footerNote}>{ctaConfig.helper}</Text>
        </View>
      </SafeAreaView>

      {exitOpen && (
        <>
          <Pressable onPress={exitDismiss} style={s.sheetBack} />
          <View style={s.sheet}>
            <View style={s.sheetGrab} />
            <Text style={s.sheetTitle}>Skip your free trial?</Text>
            <Text style={s.sheetCopy}>
              If you leave now and come back, you'll be charged <Text style={{ color: "#fff", fontWeight: "700" }}>$7.99/mo</Text> immediately — the 7-day free window only applies the first time.
            </Text>
            <Pressable onPress={exitDismiss}>
              <LinearGradient colors={["#2F8FFF", "#6F70FF", "#B388FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sheetStay}>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Stay — claim my 7 days free</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={exitNow} style={s.sheetLeave}>
              <Text style={{ color: "#9AA1B7", fontSize: 13 }}>No thanks, leave</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function ToneIcon({ k }: { k: CoachTone }) {
  const p = { stroke: "white", strokeWidth: 1.7, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (k) {
    case "gentle":
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M20 12c0 5-4 8-8 8s-8-3-8-8a8 8 0 0 1 16 0Z" {...p} />
          <Circle cx={9} cy={11} r={1} {...p} />
          <Circle cx={15} cy={11} r={1} {...p} />
          <Path d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5" {...p} />
        </Svg>
      );
    case "balanced":
      return <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 3v18M4 8h16M4 16h16" {...p} /></Svg>;
    case "direct":
      return <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12h14M13 5l7 7-7 7" {...p} /></Svg>;
    case "drill":
      return <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 2L4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-5Z" {...p} /></Svg>;
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#02020A" },
  topbar: { paddingHorizontal: 22, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2F8FFF", shadowColor: "#2F8FFF", shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  brandTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 4, color: "rgba(255,255,255,0.92)" },

  progress: { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 14 },
  dot: { width: 24, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  dotOn: { width: 32, backgroundColor: "#6F70FF", shadowColor: "#6F70FF", shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },

  stepBody: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 24, gap: 14 },
  kicker: { fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", color: "#9AA1B7", fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.8, lineHeight: 32, color: "#fff" },
  titleAccent: { color: "#B388FF" },
  copy: { color: "#9AA1B7", fontSize: 14, lineHeight: 21, letterSpacing: -0.1 },

  field: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 17, marginTop: 6 },

  commitBox: { marginTop: 6, padding: 22, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", gap: 14 },
  commitBoxOn: { borderColor: "rgba(47,143,255,0.40)", backgroundColor: "rgba(47,143,255,0.06)" },
  commitTitle: { fontSize: 15, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  commitSub: { fontSize: 12, color: "#9AA1B7", marginTop: 3, lineHeight: 16 },
  toggle: { width: 52, height: 32, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", padding: 3 },
  toggleOn: { backgroundColor: "#2F8FFF" },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  commitMeta: { fontSize: 11, color: "#4F5570", letterSpacing: 0.4 },

  toneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  toneCard: { width: "47%", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", position: "relative" },
  toneCardSel: { borderColor: "#2F8FFF", backgroundColor: "rgba(47,143,255,0.08)" },
  toneIco: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8, marginBottom: 10 },
  toneName: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  toneDesc: { fontSize: 11, color: "#9AA1B7", marginTop: 4, lineHeight: 15 },
  toneCheck: { position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: "#2F8FFF", shadowColor: "#2F8FFF", shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },

  trialCard: { marginTop: 6, padding: 22, borderRadius: 24, borderWidth: 1, borderColor: "rgba(111,112,255,0.30)" },
  trialBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  trialBadgeTxt: { fontSize: 9, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: "700", color: "#fff" },
  trialPrice: { fontSize: 36, fontWeight: "800", letterSpacing: -1.5, color: "#fff" },
  trialUnit: { fontSize: 13, color: "#9AA1B7", fontWeight: "500" },
  trialSub: { fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 6, lineHeight: 18 },
  bullet: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginTop: 8 },
  bulletCk: { width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(47,143,255,0.16)", borderWidth: 1, borderColor: "rgba(47,143,255,0.45)", alignItems: "center", justifyContent: "center", marginTop: 1 },
  bulletTxt: { fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 18, flex: 1 },
  smallPrint: { fontSize: 10, color: "#4F5570", textAlign: "center", marginTop: 12 },

  footer: { paddingHorizontal: 26, paddingTop: 12 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 999, shadowColor: "#2F8FFF", shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  ctaTxt: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  footerNote: { textAlign: "center", color: "#9AA1B7", fontSize: 11, marginTop: 10 },

  sheetBack: { position: "absolute", inset: 0 as any, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 40 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 41, backgroundColor: "#0E0E1B", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 24, paddingBottom: 36, gap: 8 },
  sheetGrab: { width: 40, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 10 },
  sheetTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5, color: "#fff" },
  sheetCopy: { fontSize: 13, color: "#9AA1B7", lineHeight: 18, marginTop: 4 },
  sheetStay: { paddingVertical: 16, borderRadius: 999, alignItems: "center", marginTop: 14 },
  sheetLeave: { paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginTop: 8 },
});
