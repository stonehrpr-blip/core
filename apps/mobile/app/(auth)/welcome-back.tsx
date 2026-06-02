import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useAuthStore } from "../../stores/auth-store";

const AnimatedView = Animated.createAnimatedComponent(View);

export default function WelcomeBack() {
  const { trial, daysIdle, touchLastSeen } = useAuthStore((s) => ({
    trial: s.trial,
    daysIdle: s.daysIdle(),
    touchLastSeen: s.touchLastSeen,
  }));

  const flicker = useSharedValue(1);
  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, []);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flicker.value }] }));

  const days = Math.max(1, Math.round(daysIdle));

  const keepGoing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    touchLastSeen();
    router.replace("/(tabs)");
  };
  const home = () => {
    Haptics.selectionAsync();
    touchLastSeen();
    router.replace("/(tabs)");
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#0C0530", "#02020A", "#050510"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={s.topbrand}>
          <View style={s.dot} />
          <Text style={s.wm}>CORE</Text>
        </View>

        <View style={s.hero}>
          <Text style={s.kicker}>Welcome back</Text>
          <Text style={s.title}>
            We kept{"\n"}your seat{"\n"}<Text style={s.titleG}>{trial.name ? `${trial.name}.` : "warm."}</Text>
          </Text>
          <Text style={s.copy}>
            You've been away <Text style={s.copyStrong}>{days === 1 ? "1 day" : `${days} days`}</Text>. Your streak is paused, not gone. Pick up where you left off — no shame, no reset.
          </Text>
        </View>

        <View style={s.streakCard}>
          <AnimatedView style={[s.streakFlame, flameStyle]}>
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3-.5 2 0 4 1 5" stroke="white" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5" stroke="white" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </AnimatedView>
          <Text style={s.streakNum}>14</Text>
          <Text style={s.streakLbl}>Day streak · frozen</Text>
          <Text style={s.streakMeta}>
            Resume in the next <Text style={s.streakMetaStrong}>48 hours</Text> to keep it.
          </Text>
        </View>

        <View style={s.missed}>
          <Row
            color="#B388FF"
            title="3 messages from Coach"
            sub="Read them before you log today's first slip"
            onPress={() => router.push("/(tabs)/coach")}
            icon={
              <>
                <Circle cx={12} cy={12} r={9} stroke="white" strokeWidth={1.7} fill="none" />
                <Path d="M8 12h8M12 8v8" stroke="white" strokeWidth={1.7} fill="none" strokeLinecap="round" />
              </>
            }
          />
          <Row
            color="#FFD05C"
            title="You dropped 2 ranks"
            sub="Forge II → Flow III"
            onPress={() => router.push("/(tabs)/coach")}
            icon={<Path d="M5 21v-7M12 21v-13M19 21v-10" stroke="white" strokeWidth={1.7} fill="none" strokeLinecap="round" />}
          />
          <Row
            color="#5CE1E6"
            title="Last week's review is waiting"
            sub="Brain +6 · Wallet +3 · Body −2"
            onPress={() => router.push("/(tabs)")}
            icon={
              <>
                <Rect x={4} y={4} width={16} height={16} rx={3} stroke="white" strokeWidth={1.7} fill="none" />
                <Path d="M9 10h6M9 14h6" stroke="white" strokeWidth={1.7} fill="none" strokeLinecap="round" />
              </>
            }
          />
        </View>

        <View style={s.footer}>
          <Pressable onPress={keepGoing}>
            <LinearGradient colors={["#2F8FFF", "#6F70FF", "#B388FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
              <Text style={s.ctaTxt}>Keep going</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={home}>
            <Text style={s.secondary}>Just take me home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Row({ color, title, sub, icon, onPress }: { color: string; title: string; sub: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <View style={[s.rowIco, { backgroundColor: color, shadowColor: color }]}>
        <Svg width={15} height={15} viewBox="0 0 24 24">{icon}</Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTtl}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Text style={s.chev}>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#02020A" },
  topbrand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, marginBottom: 28 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2F8FFF", shadowColor: "#2F8FFF", shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  wm: { fontSize: 12, fontWeight: "700", letterSpacing: 4, color: "rgba(255,255,255,0.92)" },
  hero: { paddingHorizontal: 28, alignItems: "center" },
  kicker: { fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase", color: "#9AA1B7", fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 34, fontWeight: "700", letterSpacing: -1, lineHeight: 36, color: "#fff", textAlign: "center" },
  titleG: { color: "#B388FF", textShadowColor: "rgba(179,136,255,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
  copy: { color: "#9AA1B7", fontSize: 15, lineHeight: 22, marginTop: 14, textAlign: "center", maxWidth: 320 },
  copyStrong: { color: "#fff", fontWeight: "700" },

  streakCard: { marginHorizontal: 28, marginTop: 28, padding: 22, borderRadius: 26, borderWidth: 1, borderColor: "rgba(179,136,255,0.30)", alignItems: "center", backgroundColor: "rgba(179,136,255,0.04)" },
  streakFlame: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", marginBottom: 12, shadowColor: "#FF7A45", shadowOpacity: 0.55, shadowRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 18, backgroundColor: "#FF7A45" },
  streakNum: { fontSize: 44, fontWeight: "800", letterSpacing: -1.5, color: "#fff", textShadowColor: "rgba(255,206,179,0.6)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  streakLbl: { fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase", color: "rgba(255,255,255,0.75)", fontWeight: "700", marginTop: 6 },
  streakMeta: { color: "#9AA1B7", fontSize: 12, marginTop: 14, textAlign: "center", lineHeight: 17 },
  streakMetaStrong: { color: "#fff" },

  missed: { marginHorizontal: 28, marginTop: 22, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  rowIco: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  rowTtl: { fontSize: 13, fontWeight: "600", color: "#fff", letterSpacing: -0.1 },
  rowSub: { fontSize: 11, color: "#9AA1B7", marginTop: 2 },
  chev: { color: "#4F5570", fontSize: 14 },

  footer: { paddingHorizontal: 28, paddingTop: 18, marginTop: "auto" },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 999, shadowColor: "#2F8FFF", shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  ctaTxt: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  secondary: { textAlign: "center", color: "#9AA1B7", fontSize: 13, padding: 14 },
});
