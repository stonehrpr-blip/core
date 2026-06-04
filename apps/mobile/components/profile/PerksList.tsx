/**
 * PerksList — every perk unlocked up to the current rank, plus a locked preview
 * of the next rank's perk. Reads the shared TIER_REWARDS registry.
 */
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { GAME_RANKS } from "@/stores/game-state-store";
import { TIER_REWARDS } from "@/components/Crest";

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M5 12l5 5L19 7" stroke="#34D399" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function LockIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Rect x="5" y="11" width="14" height="9" rx="2" stroke="#9AA1B7" strokeWidth={2} fill="none" />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#9AA1B7" strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function PerksList({ currentIdx }: { currentIdx: number }) {
  const unlocked = GAME_RANKS.slice(0, currentIdx + 1)
    .map((r) => TIER_REWARDS[r.name]?.text)
    .filter(Boolean) as string[];
  const next = GAME_RANKS[currentIdx + 1];
  const lockedText = next ? TIER_REWARDS[next.name]?.text : null;

  return (
    <View style={{ gap: 8 }}>
      {unlocked.map((text, i) => (
        <View key={`u-${i}`} style={s.row}>
          <View style={[s.icon, { backgroundColor: "rgba(52,211,153,0.12)" }]}>
            <CheckIcon />
          </View>
          <Text style={s.text}>{text}</Text>
        </View>
      ))}
      {next && lockedText && (
        <View style={[s.row, s.rowLocked]}>
          <View style={[s.icon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
            <LockIcon />
          </View>
          <Text style={[s.text, { color: "#9AA1B7" }]}>{lockedText}</Text>
          <Text style={s.nextTag}>{next.name.toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  rowLocked: { opacity: 0.7 },
  icon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  text: { color: "#F8FAFE", fontSize: 13, flex: 1, letterSpacing: 0.1 },
  nextTag: { color: "#6BA9FF", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
});
