import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAuthStore } from "@/stores/auth-store";

const AnimatedView = Animated.createAnimatedComponent(View);

export default function Splash() {
  const onboardedAt = useAuthStore((s) => s.onboardedAt);
  const trialExpired = useAuthStore((s) => s.trialExpired());
  const daysIdle = useAuthStore((s) => s.daysIdle());
  const touchLastSeen = useAuthStore((s) => s.touchLastSeen);

  const dot = useSharedValue(1);
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);
  const wm = useSharedValue(0);
  const tag = useSharedValue(0);

  useEffect(() => {
    dot.value = withRepeat(
      withSequence(withTiming(1.18, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
    const ringLoop = () =>
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
        ),
        -1,
      );
    r1.value = ringLoop();
    r2.value = withDelay(400, ringLoop());
    r3.value = withDelay(800, ringLoop());
    wm.value = withDelay(450, withTiming(1, { duration: 700 }));
    tag.value = withDelay(850, withTiming(1, { duration: 600 }));

    const t = setTimeout(() => {
      if (!onboardedAt) {
        router.replace("/(auth)");
      } else if (trialExpired) {
        router.replace("/(auth)/trial-expired");
      } else if (daysIdle >= 3) {
        router.replace("/(auth)/welcome-back");
      } else {
        touchLastSeen();
        router.replace("/(tabs)");
      }
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  const dotS = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }] }));
  const r1S = useAnimatedStyle(() => ({ opacity: 1 - r1.value, transform: [{ scale: 0.5 + r1.value }] }));
  const r2S = useAnimatedStyle(() => ({ opacity: 1 - r2.value, transform: [{ scale: 0.5 + r2.value }] }));
  const r3S = useAnimatedStyle(() => ({ opacity: 1 - r3.value, transform: [{ scale: 0.5 + r3.value }] }));
  const wmS = useAnimatedStyle(() => ({ opacity: wm.value, transform: [{ translateY: (1 - wm.value) * 8 }] }));
  const tagS = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 6 }] }));

  return (
    <View style={s.root}>
      <LinearGradient colors={["#050518", "#02020A"]} locations={[0, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.center}>
        <View style={s.dotWrap}>
          <AnimatedView style={[s.ring, r1S]} />
          <AnimatedView style={[s.ring, r2S]} />
          <AnimatedView style={[s.ring, r3S]} />
          <AnimatedView style={[s.dot, dotS]} />
        </View>
        <Animated.Text style={[s.wm, wmS]}>
          COR<Text style={{ color: "#2F8FFF" }}>E</Text>
        </Animated.Text>
        <Animated.Text style={[s.tag, tagS]}>BECOME YOUR CORE</Animated.Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#02020A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  dotWrap: { width: 90, height: 90, alignItems: "center", justifyContent: "center", position: "relative" },
  ring: { position: "absolute", width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: "rgba(47,143,255,0.32)" },
  dot: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "#2F8FFF",
    shadowColor: "#2F8FFF", shadowOpacity: 1, shadowRadius: 32, shadowOffset: { width: 0, height: 0 }, elevation: 30,
  },
  wm: { fontSize: 28, fontWeight: "700", letterSpacing: 14, color: "#fff", paddingLeft: 14, fontFamily: "System" },
  tag: { fontSize: 11, letterSpacing: 3.5, color: "rgba(255,255,255,0.45)", fontFamily: "System" },
});

