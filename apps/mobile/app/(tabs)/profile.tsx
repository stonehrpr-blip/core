import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

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

export default function Profile() {
  useCoreScreenView("profile");
  const name = useAuthStore((s) => s.trial.name) || "Stone";
  const stats = useGameStateStore((s) => s.stats);
  const streak = useGameStateStore((s) => s.streak);
  const xp = useGameStateStore((s) => s.xp);
  const lifeScore = useGameStateStore((s) => s.lifeScore());
  const rank = useGameStateStore((s) => s.rankFor());

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#0A0820", "#02020A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <View style={s.avatar} />
            <Text style={s.name}>{name}</Text>
            <Text style={s.handle}>@{name.toLowerCase()}</Text>
            <View style={[s.rankPill, { borderColor: `${rank.color}55`, backgroundColor: `${rank.color}1A` }]}>
              <Text style={[s.rankTxt, { color: rank.color }]}>
                {rank.label} · {xp.toLocaleString()} XP
              </Text>
            </View>
            <Text style={s.bio}>
              Day {streak.days} clean. Trying to figure out what to do with my hands when I'm bored.
            </Text>
          </View>

          <View style={s.trio}>
            <View style={s.trioCell}>
              <Text style={s.trioV}>{streak.days}</Text>
              <Text style={s.trioL}>DAY STREAK</Text>
            </View>
            <View style={s.trioCell}>
              <Text style={s.trioV}>{lifeScore}</Text>
              <Text style={s.trioL}>LIFE SCORE</Text>
            </View>
            <View style={s.trioCell}>
              <Text style={s.trioV}>7</Text>
              <Text style={s.trioL}>FRIENDS</Text>
            </View>
          </View>

          <View style={s.strip}>
            {(["lungs", "brain", "wallet", "willpower", "body"] as StatKey[]).map((k) => (
              <View key={k} style={s.stripCell}>
                <View style={[s.stripDot, { backgroundColor: STAT_COLORS[k], shadowColor: STAT_COLORS[k] }]} />
                <Text style={s.stripV}>{stats[k]}</Text>
                <Text style={s.stripN}>{k.slice(0, 4).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 30 },
  hero: { alignItems: "center", paddingBottom: 18 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 14, backgroundColor: "#2F8FFF", shadowColor: "#2F8FFF", shadowOpacity: 0.5, shadowRadius: 26, shadowOffset: { width: 0, height: 0 }, elevation: 18 },
  name: { color: "#fff", fontSize: 24, fontWeight: "700", letterSpacing: -0.6 },
  handle: { color: "#9AA1B7", fontSize: 13, marginTop: 2 },
  rankPill: { marginTop: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  rankTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  bio: { color: "#9AA1B7", fontSize: 13, marginTop: 12, textAlign: "center", maxWidth: 280, lineHeight: 19 },
  trio: { flexDirection: "row", gap: 8, marginTop: 18 },
  trioCell: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  trioV: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  trioL: { color: "#9AA1B7", fontSize: 10, letterSpacing: 1.8, marginTop: 4, fontWeight: "600" },
  strip: { flexDirection: "row", gap: 8, marginTop: 18 },
  stripCell: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 4 },
  stripDot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  stripV: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  stripN: { color: "#9AA1B7", fontSize: 9, letterSpacing: 1.4, fontWeight: "600" },
});
