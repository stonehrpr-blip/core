/**
 * Physique Scan entry on the Coach tab. Opens the real scanner instantly.
 * (Routing only — no autonomous action; the scan itself is consent + tap gated.)
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { coreTrack } from "@/lib/analytics";
import { ACCENT } from "./tokens";

export function PhysiqueScanCard() {
  const open = () => {
    Haptics.selectionAsync();
    coreTrack("physique_scan_opened", { from: "coach" });
    router.push("/scan/physique");
  };
  return (
    <Pressable onPress={open} style={s.card} accessibilityRole="button" accessibilityLabel="Open the Physique Scanner">
      <View style={s.icon}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" stroke={ACCENT} strokeWidth={1.7} fill="none" />
          <Path d="M6 22v-5l-2-3 2-4h8l2 4-2 3v5M9 9v13M15 9v13" stroke={ACCENT} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title}>Physique Scan</Text>
        <Text style={s.sub}>Scan your body → rank, weak points & a routine</Text>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke="#6BA9FF" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(74,143,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.22)",
    marginBottom: 12,
  },
  icon: {
    width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(74,143,255,0.10)", borderWidth: 1, borderColor: "rgba(74,143,255,0.24)",
  },
  title: { color: "#F8FAFE", fontSize: 15, fontWeight: "800", letterSpacing: -0.01 },
  sub: { color: "#9AA1B7", fontSize: 12, marginTop: 2 },
});
