/**
 * Craving SOS — a calm, full-screen "Coach has the floor" mode for riding out
 * an urge. Ported from previews 40/41-coach-during-craving.
 *
 * SAFETY: nothing here happens automatically. The two outcomes ("I rode it
 * out" / "I slipped") only fire when the user explicitly taps them — that tap
 * IS the confirmation. The component reports the outcome up; it never mutates
 * state or sends anything on its own.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import type { CoachTone } from "@/stores/auth-store";
import { ACCENT, ACCENT_DEEP } from "./tokens";

const LINES: Record<CoachTone, string> = {
  gentle: "I'm here. Breathe with me. It will pass — you don't have to decide anything.",
  balanced: "Cravings peak around three minutes then crash. You don't have to decide anything right now.",
  direct: "Three minutes and it's gone. Don't negotiate with it. Breathe — I've got you.",
  drill: "180 seconds. Hold the line. Breathe in, breathe out. Talk to me after.",
};

export function CravingSOS({
  visible,
  tone,
  onClose,
  onPassed,
  onSlipped,
}: {
  visible: boolean;
  tone: CoachTone | null;
  onClose: () => void;
  onPassed: () => void;
  onSlipped: () => void;
}) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(breath, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });
  const glow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  const line = LINES[tone ?? "balanced"];

  const handlePassed = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onPassed();
  };
  const handleSlipped = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSlipped();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <LinearGradient colors={["#051026", "#02020A"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.banner}>
            <View style={s.bannerDot} />
            <Text style={s.bannerText}>Craving mode · Coach has the floor</Text>
          </View>

          <View style={s.center}>
            <Animated.View style={[s.glow, { opacity: glow, transform: [{ scale }] }]} />
            <Animated.View style={[s.orb, { transform: [{ scale }] }]}>
              <LinearGradient colors={["#DCEBFF", ACCENT, ACCENT_DEEP]} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Text style={s.breathLabel}>BREATHE</Text>
            <Text style={s.line}>{line}</Text>
          </View>

          <View style={s.actions}>
            <Pressable onPress={handlePassed} style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.pressed]}>
              <Text style={s.btnPrimaryText}>I rode it out</Text>
            </Pressable>
            <HoldToConfirm label="Hold to log a slip — honestly" onConfirm={handleSlipped} />
            <Pressable onPress={onClose} hitSlop={10} style={s.dismiss}>
              <Text style={s.dismissText}>Back to chat</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(74,143,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.30)",
  },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  bannerText: { color: "#CFE0FF", fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  glow: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: ACCENT },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    shadowColor: ACCENT,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  breathLabel: { color: "#5BB1FF", fontSize: 12, fontWeight: "700", letterSpacing: 3, marginTop: 28 },
  line: { color: "#F5F7FB", fontSize: 16, lineHeight: 24, textAlign: "center", marginTop: 14 },
  actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  btn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  btnPrimary: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  btnGhostText: { color: "#8A92A6", fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  dismiss: { alignItems: "center", paddingVertical: 10 },
  dismissText: { color: "#4A5060", fontSize: 13, fontWeight: "500" },
  hold: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  holdFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(248,113,113,0.22)" },
  holdText: { color: "#8A92A6", fontSize: 15, fontWeight: "600" },
});

/**
 * Press-and-hold to confirm a slip — matches the Habits tab's "hold-to-confirm
 * in production" pattern so an honest log is never a fat-finger. The action
 * only fires after a deliberate ~1.2s hold; lifting early cancels it.
 */
const HOLD_MS = 1200;

function HoldToConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const start = (_e: GestureResponderEvent) => {
    animRef.current?.stop();
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) onConfirm();
    });
  };

  const cancel = () => {
    animRef.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: false }).start();
  };

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={s.hold}
    >
      <Animated.View style={[s.holdFill, { width: fillWidth }]} />
      <Text style={s.holdText}>{label}</Text>
    </Pressable>
  );
}
