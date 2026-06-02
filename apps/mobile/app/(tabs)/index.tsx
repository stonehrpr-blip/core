import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

import { useAuthStore } from "@/stores/auth-store";
import { useGameStateStore, type StatKey } from "@/stores/game-state-store";
import { useCoreScreenView } from "@/lib/analytics";

const STAT_COLORS: Record<StatKey, string> = {
  lungs: "#FF6BAA",
  brain: "#9F8FFF",
  wallet: "#FFC857",
  willpower: "#FF7A45",
  body: "#5CE1E6",
};

export default function Home() {
  useCoreScreenView("dashboard");
  const trial = useAuthStore((s) => s.trial);
  const trialDay = useAuthStore((s) => s.trialDay());
  const subscriptionActive = useAuthStore((s) => s.subscriptionActive);
  const stats = useGameStateStore((s) => s.stats);
  const streak = useGameStateStore((s) => s.streak);
  const xp = useGameStateStore((s) => s.xp);
  const lifeScore = useGameStateStore((s) => s.lifeScore());
  const rank = useGameStateStore((s) => s.rankFor());
  const recoverable = useGameStateStore((s) => s.isStreakRecoverable());
  const todayDeltas = useGameStateStore((s) => s.todayDeltas());
  const useFreezeAction = useGameStateStore((s) => s.useFreeze);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const part = h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
    const name = trial.name || "Stone";
    return `${part}, ${name}`;
  }, [trial.name]);

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient
        colors={["#0A0820", "#02020A", "#050510"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <View>
              <Text style={s.greet}>{greeting}</Text>
              <Text style={s.date}>SUN · 27 MAY</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {trialDay > 0 && trialDay <= 7 && !subscriptionActive && (
                <View style={s.trialPill}>
                  <Text style={s.trialPillTxt}>DAY {Math.min(7, Math.ceil(trialDay))}/7</Text>
                </View>
              )}
              <Pressable style={s.rankPill}>
                <View style={[s.rankDot, { backgroundColor: rank.color, shadowColor: rank.color }]} />
                <Text style={s.rankTxt}>
                  {rank.label} · {xp.toLocaleString()}
                </Text>
              </Pressable>
            </View>
          </View>

          {recoverable ? (
            <Pressable>
              <LinearGradient
                colors={["rgba(255,79,107,0.10)", "rgba(255,122,69,0.12)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.banner}
              >
                <View style={s.bannerFlame}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bannerTitle}>You lost your {streak.previousDays}-day streak</Text>
                  <Text style={s.bannerSub}>Restore for $0.99 · 48h window</Text>
                </View>
                <Text style={s.bannerChev}>›</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={s.streakStrip}>
              <View style={s.streakFlame}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M12 2c0 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-3" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M9 13c-2 1-3 3-3 5a6 6 0 0 0 12 0c0-2-1-4-3-5" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.streakDays}>{streak.days}-day streak</Text>
                <Text style={s.streakLbl}>QUIT VAPING</Text>
              </View>
              <Pressable onPress={() => useFreezeAction()}>
                <View style={s.freezePill}>
                  <Text style={s.freezeTxt}>FREEZE {streak.freezes.availableThisWeek}/1</Text>
                </View>
              </Pressable>
            </View>
          )}

          <View style={s.lifeCard}>
            <Text style={s.lifeLabel}>LIFE SCORE</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text style={s.lifeNum}>{lifeScore}</Text>
                <Text style={s.lifeNumSub}>/100</Text>
              </View>
              <Text style={s.lifeTrend}>▲ 4 this week</Text>
            </View>
          </View>

          <View style={s.statGrid}>
            {(["lungs", "brain", "wallet", "willpower", "body"] as StatKey[]).map((k) => {
              const delta = todayDeltas[k];
              const arrow = delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "— ";
              return (
                <Pressable
                  key={k}
                  style={s.statCell}
                  onPress={() => {
                    // wired when stat drilldown route exists
                  }}
                >
                  <View style={s.statTop}>
                    <View style={[s.statRing, { borderColor: STAT_COLORS[k], shadowColor: STAT_COLORS[k] }]} />
                    <Text style={[s.statTrend, delta > 0 && s.trendUp, delta < 0 && s.trendDown]}>
                      {arrow}
                      {Math.abs(delta)}
                    </Text>
                  </View>
                  <Text style={s.statName}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                  <Text style={s.statVal}>
                    {stats[k]}
                    <Text style={s.statValSub}>/100</Text>
                  </Text>
                  <View style={s.statBar}>
                    <View style={[s.statBarFill, { width: `${stats[k]}%`, backgroundColor: STAT_COLORS[k] }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greet: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  date: { color: "#9AA1B7", fontSize: 10, letterSpacing: 2.2, marginTop: 4, fontWeight: "600" },
  rankPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(159,143,255,0.12)", borderWidth: 1, borderColor: "rgba(159,143,255,0.30)" },
  trialPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,200,87,0.12)", borderWidth: 1, borderColor: "rgba(255,200,87,0.40)" },
  trialPillTxt: { color: "#FFC857", fontSize: 9, fontWeight: "700", letterSpacing: 1.4 },
  rankDot: { width: 6, height: 6, borderRadius: 3, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  rankTxt: { color: "#9F8FFF", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },

  banner: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,79,107,0.40)", flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  bannerFlame: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FF7A45", alignItems: "center", justifyContent: "center", shadowColor: "#FF7A45", shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  bannerTitle: { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: -0.1 },
  bannerSub: { color: "#FF7A45", fontSize: 11, marginTop: 2, letterSpacing: 0.4 },
  bannerChev: { color: "#FF7A45", fontSize: 18, fontWeight: "600" },

  streakStrip: { padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  streakFlame: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FF7A45", alignItems: "center", justifyContent: "center", shadowColor: "#FF7A45", shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  streakDays: { color: "#fff", fontSize: 14, fontWeight: "700" },
  streakLbl: { color: "#9AA1B7", fontSize: 10, letterSpacing: 1.8, marginTop: 2, fontWeight: "700" },
  freezePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(91,177,255,0.10)", borderWidth: 1, borderColor: "rgba(91,177,255,0.30)" },
  freezeTxt: { color: "#5BB1FF", fontSize: 9, fontWeight: "700", letterSpacing: 1.4 },

  lifeCard: { padding: 18, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 14 },
  lifeLabel: { color: "#9AA1B7", fontSize: 10, letterSpacing: 1.8, fontWeight: "700", marginBottom: 6 },
  lifeNum: { color: "#fff", fontSize: 56, fontWeight: "800", letterSpacing: -2.2, lineHeight: 56 },
  lifeNumSub: { color: "#9AA1B7", fontSize: 16, fontWeight: "500", marginLeft: 4 },
  lifeTrend: { color: "#34D399", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { width: "48%", padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  statTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  statRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  statTrend: { color: "#9AA1B7", fontSize: 10, fontWeight: "700" },
  trendUp: { color: "#34D399" },
  trendDown: { color: "#FF4F6B" },
  statName: { color: "#fff", fontSize: 12, fontWeight: "600", letterSpacing: -0.1 },
  statVal: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.6, marginTop: 2 },
  statValSub: { color: "#4F5570", fontSize: 12, fontWeight: "500" },
  statBar: { height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 8 },
  statBarFill: { height: "100%", borderRadius: 999 },
});
