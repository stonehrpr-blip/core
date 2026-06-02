import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useGameStateStore } from "@/stores/game-state-store";
import { useCoreScreenView } from "@/lib/analytics";

export default function Habits() {
  useCoreScreenView("habits");
  const stats = useGameStateStore((s) => s.stats);
  const streak = useGameStateStore((s) => s.streak);
  const recoverable = useGameStateStore((s) => s.isStreakRecoverable());
  const logSlip = useGameStateStore((s) => s.logSlip);

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#1a0814", "#02020A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Habits</Text>

          <View style={s.habitCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <View style={s.flame}>
                <Text style={{ fontSize: 22 }}>🚭</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.habitName}>Quit Vaping</Text>
                <Text style={s.habitMeta}>{recoverable ? "Slip — restore in dashboard" : `${streak.days}-day clean streak`}</Text>
              </View>
            </View>

            <View style={s.statRow}>
              <View style={s.statBlock}>
                <Text style={s.statLabel}>LUNGS</Text>
                <Text style={[s.statValue, { color: "#FF6BAA" }]}>{stats.lungs}<Text style={s.statSub}>/100</Text></Text>
              </View>
              <View style={s.divider} />
              <View style={s.statBlock}>
                <Text style={s.statLabel}>STREAK</Text>
                <Text style={s.statValue}>{streak.days}<Text style={s.statSub}> days</Text></Text>
              </View>
              <View style={s.divider} />
              <View style={s.statBlock}>
                <Text style={s.statLabel}>FREEZES</Text>
                <Text style={s.statValue}>{streak.freezes.availableThisWeek}<Text style={s.statSub}>/1</Text></Text>
              </View>
            </View>

            <Pressable onPress={() => logSlip("vape")} style={({ pressed }) => [s.tapBtn, pressed && { opacity: 0.85 }]}>
              <Text style={s.tapBtnTxt}>Mark a puff</Text>
            </Pressable>
            <Text style={s.tapHint}>Hold-to-confirm in production. Honest logs feed willpower.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 30 },
  title: { color: "#fff", fontSize: 26, fontWeight: "700", letterSpacing: -0.6, marginBottom: 16 },
  habitCard: { padding: 18, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,107,170,0.30)" },
  flame: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255,107,170,0.16)", alignItems: "center", justifyContent: "center", shadowColor: "#FF6BAA", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  habitName: { color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  habitMeta: { color: "#9AA1B7", fontSize: 12, marginTop: 3 },
  statRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 18 },
  statBlock: { flex: 1, alignItems: "center" },
  statLabel: { color: "#9AA1B7", fontSize: 9, letterSpacing: 1.6, fontWeight: "700", marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statSub: { color: "#4F5570", fontSize: 12, fontWeight: "500" },
  divider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.06)" },
  tapBtn: { padding: 16, borderRadius: 14, backgroundColor: "rgba(255,107,170,0.10)", borderWidth: 1, borderColor: "rgba(255,107,170,0.40)", alignItems: "center" },
  tapBtnTxt: { color: "#FF6BAA", fontSize: 15, fontWeight: "700" },
  tapHint: { color: "#4F5570", fontSize: 11, textAlign: "center", marginTop: 10 },
});
