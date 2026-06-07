/**
 * Threshold-cross insight cards, surfaced at the top of the Coach chat.
 * Same rules as the dashboard (ported from preview 39-coach.html). Read-only
 * over game-state; dismissals persist per-rule in AsyncStorage.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useGameStateStore } from "@/stores/game-state-store";
import type { Stats, Streak } from "@/stores/game-state-store";

type Rule = {
  id: string;
  color: string;
  title: string;
  body: string;
  test: (stats: Stats, streak: Streak) => boolean;
};

const RULES: Rule[] = [
  { id: "lungs_climb", color: "#FF6BAA", title: "Lungs in the green", body: "Capacity 80+ — that's the pivot. Keep it.", test: (s) => s.lungs >= 80 },
  { id: "will_dip", color: "#FF4F6B", title: "Willpower is low", body: "Below 30 — high-slip zone. One honest log feeds it back.", test: (s) => s.willpower < 30 },
  { id: "brain_climb", color: "#9F8FFF", title: "Brain over 85", body: "Sleep + focus are stacking. Protect tonight's wind-down.", test: (s) => s.brain >= 85 },
  { id: "wallet_low", color: "#FFC857", title: "Wallet drifting", body: "Try the 24h cart rule on your next order.", test: (s) => s.wallet < 40 },
  { id: "streak_close", color: "#FFC857", title: "One day from week one", body: "Day 7 unlocks the milestone screen.", test: (_s, st) => st.days >= 6 && st.days < 7 },
];

const DISMISS_KEY = "core.coach.insightDismissed.v1";

export function InsightCards() {
  const stats = useGameStateStore((s) => s.stats);
  const streak = useGameStateStore((s) => s.streak);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setDismissed(JSON.parse(raw) as Record<string, boolean>);
          } catch {
            /* ignore corrupt */
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: true };
    setDismissed(next);
    AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(next)).catch(() => {});
  };

  if (!loaded) return null;
  const active = RULES.filter((r) => r.test(stats, streak) && !dismissed[r.id]);
  if (active.length === 0) return null;

  return (
    <View style={s.wrap}>
      {active.map((r) => (
        <View key={r.id} style={s.card}>
          <View style={[s.swatch, { backgroundColor: r.color, shadowColor: r.color }]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>{r.title}</Text>
            <Text style={s.body}>{r.body}</Text>
          </View>
          <Pressable onPress={() => dismiss(r.id)} hitSlop={8} style={s.close}>
            <Text style={s.closeText}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 14, alignSelf: "stretch" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxWidth: "92%",
    alignSelf: "flex-start",
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 8,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { color: "#fff", fontSize: 12, fontWeight: "700" },
  body: { color: "#9AA1B7", fontSize: 11, marginTop: 2, lineHeight: 15 },
  close: { paddingHorizontal: 4 },
  closeText: { color: "#4F5570", fontSize: 16, lineHeight: 16 },
});
