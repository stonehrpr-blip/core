import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useAuthStore } from "../../stores/auth-store";

export default function TrialExpired() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const { trial, setSubscriptionActive } = useAuthStore((s) => ({
    trial: s.trial,
    setSubscriptionActive: s.setSubscriptionActive,
  }));

  const togglePlan = () => {
    Haptics.selectionAsync();
    setPlan((p) => (p === "monthly" ? "yearly" : "monthly"));
  };

  const resume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In live: trigger RevenueCat purchase. Preview: just unlock.
    setSubscriptionActive(true);
    router.replace("/(tabs)");
  };

  const price = plan === "monthly" ? "$9.99" : "$59.99";
  const unit = plan === "monthly" ? "/ month" : "/ year ($4.99/mo)";
  const label = plan === "monthly" ? "Monthly" : "Yearly · save 50%";
  const swap = plan === "monthly" ? "switch to yearly →" : "switch to monthly →";

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient
        colors={["#1a0a18", "#05050F", "#050510"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={s.topbar}>
          <View style={s.brand}>
            <View style={s.brandDot} />
            <Text style={s.brandTxt}>CORE</Text>
          </View>
          <Pressable onPress={() => router.push("/settings")}>
            <Text style={s.help}>Help</Text>
          </Pressable>
        </View>

        <View style={s.hero}>
          <View style={s.badge}>
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={9} stroke="#FF6BAA" strokeWidth={2} fill="none" />
              <Path d="M12 7v5l3 2" stroke="#FF6BAA" strokeWidth={2} fill="none" strokeLinecap="round" />
            </Svg>
            <Text style={s.badgeTxt}>Your 7 days are up</Text>
          </View>
          <Text style={s.title}>
            Don't lose{"\n"}<Text style={s.titleAccent}>14 clean days</Text>
          </Text>
          <Text style={s.copy}>Your streak, your stats, and your Coach are still here — but the dashboard's locked until you resume.</Text>
        </View>

        <View style={s.lockwrap}>
          <View style={s.miniphone}>
            <View style={s.miniRow}>
              <View>
                <Text style={s.miniGreet}>Morning, {trial.name || "Stone"}</Text>
                <Text style={s.miniDate}>SUN · 25 MAY</Text>
              </View>
              <View style={s.ringBox}>
                <View style={s.lifeRing} />
                <View style={s.lifeScoreCenter}><Text style={s.lifeScoreNum}>72</Text></View>
              </View>
            </View>
            <Text style={s.miniLs}><Text style={{ color: "#fff", fontWeight: "700" }}>Life Score </Text>+4 this week</Text>
            <View style={s.statsGrid}>
              {[
                { v: "64", c: "#FF6BAA" },
                { v: "78", c: "#B388FF" },
                { v: "58", c: "#FFD05C" },
                { v: "81", c: "#FF7A45" },
                { v: "67", c: "#5CE1E6" },
              ].map((st, i) => (
                <View key={i} style={s.miniStat}>
                  <View style={[s.miniDot, { backgroundColor: st.c, shadowColor: st.c }]} />
                  <Text style={s.miniStatV}>{st.v}</Text>
                </View>
              ))}
            </View>
          </View>
          <BlurView intensity={18} tint="dark" style={s.lockOverlay}>
            <View style={s.lockIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Rect x={5} y={11} width={14} height={10} rx={2} stroke="#fff" strokeWidth={1.8} fill="none" />
                <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" />
              </Svg>
            </View>
          </BlurView>
          <LinearGradient colors={["#FF6BAA", "#FF7A45"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.streakPill}>
            <Text style={s.streakPillTxt}>14-day streak frozen</Text>
          </LinearGradient>
        </View>

        <View style={s.offer}>
          <View style={{ flex: 1 }}>
            <Text style={s.offerLabel}>{label}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginTop: 4 }}>
              <Text style={s.offerBig}>{price}</Text>
              <Text style={s.offerUnit}>{unit}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={s.saveTag}><Text style={s.saveTxt}>Best value · 2 modes</Text></View>
            <Pressable onPress={togglePlan}>
              <Text style={s.swap}>{swap}</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.footer}>
          <Pressable onPress={resume}>
            <LinearGradient colors={["#2F8FFF", "#6F70FF", "#B388FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
              <Text style={s.ctaTxt}>Resume my account</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M5 12h14M13 5l7 7-7 7" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </LinearGradient>
          </Pressable>
          <View style={s.footerRow}>
            <Pressable><Text style={s.footerLink}>Restore purchase</Text></Pressable>
            <Pressable><Text style={s.footerLink}>Privacy</Text></Pressable>
            <Pressable><Text style={s.footerLink}>Delete account</Text></Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  topbar: { paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2F8FFF", shadowColor: "#2F8FFF", shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  brandTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 4, color: "rgba(255,255,255,0.92)" },
  help: { fontSize: 11, color: "#9AA1B7", padding: 6 },

  hero: { paddingHorizontal: 26, paddingTop: 8, alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,107,170,0.10)", borderWidth: 1, borderColor: "rgba(255,107,170,0.35)" },
  badgeTxt: { fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: "700", color: "#FF6BAA" },
  title: { fontSize: 32, fontWeight: "700", letterSpacing: -1, lineHeight: 35, color: "#fff", textAlign: "center", marginTop: 18, marginBottom: 8 },
  titleAccent: { color: "#B388FF" },
  copy: { color: "#9AA1B7", fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 300 },

  lockwrap: { marginHorizontal: 26, marginTop: 22, position: "relative" },
  miniphone: { borderRadius: 24, padding: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  miniRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  miniGreet: { fontSize: 14, fontWeight: "700", color: "#fff" },
  miniDate: { fontSize: 9, color: "#9AA1B7", letterSpacing: 1.6 },
  ringBox: { width: 60, height: 60, position: "relative" },
  lifeRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 5, borderColor: "#2F8FFF" },
  lifeScoreCenter: { position: "absolute", inset: 0 as any, alignItems: "center", justifyContent: "center" },
  lifeScoreNum: { fontSize: 14, fontWeight: "800", color: "#fff" },
  miniLs: { fontSize: 11, color: "#9AA1B7" },
  statsGrid: { flexDirection: "row", gap: 6, marginTop: 10 },
  miniStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 9, paddingVertical: 8, paddingHorizontal: 6, alignItems: "center" },
  miniDot: { width: 6, height: 6, borderRadius: 3, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4, marginBottom: 4 },
  miniStatV: { fontSize: 11, fontWeight: "700", color: "#fff" },
  lockOverlay: { position: "absolute", inset: 0 as any, alignItems: "center", justifyContent: "center", borderRadius: 24, overflow: "hidden" },
  lockIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  streakPill: { position: "absolute", left: "50%", bottom: -14, transform: [{ translateX: -75 }], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, shadowColor: "#FF6BAA", shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  streakPillTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: "#fff" },

  offer: { marginHorizontal: 26, marginTop: 26, padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center", gap: 12 },
  offerLabel: { fontSize: 10, color: "#9AA1B7", letterSpacing: 1.8, textTransform: "uppercase", fontWeight: "600" },
  offerBig: { fontSize: 24, fontWeight: "800", letterSpacing: -0.8, color: "#fff" },
  offerUnit: { fontSize: 12, color: "#9AA1B7" },
  saveTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(92,225,230,0.12)" },
  saveTxt: { color: "#5CE1E6", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  swap: { fontSize: 11, color: "#9AA1B7", marginTop: 6, textDecorationLine: "underline" },

  footer: { paddingHorizontal: 26, paddingTop: 16, marginTop: "auto" },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 999, shadowColor: "#2F8FFF", shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  ctaTxt: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  footerLink: { color: "#9AA1B7", fontSize: 11 },
});
