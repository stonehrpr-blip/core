/**
 * ScanCard — one mode tile in the Scan hub (Food / Body / Outfit).
 *
 * Presentational only. The AI capture pipeline is NOT live yet, so every
 * card carries a "SOON" badge and tapping it opens the honest coming-soon
 * sheet — we never fake a capture/result flow. Visual language mirrors the
 * ranks/dashboard cards (dark glass + accent glow, accent #4A8FFF).
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const ACCENT = "#4A8FFF";

export type ScanMode = "food" | "body" | "outfit";

type Props = {
  mode: ScanMode;
  title: string;
  blurb: string;
  onPress: () => void;
};

function ModeIcon({ mode }: { mode: ScanMode }) {
  if (mode === "food") {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M4 11h16a8 8 0 0 1-16 0z" stroke={ACCENT} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 11h16M8 4c0 1.5-1 1.5-1 3s1 1.5 1 3M12 4c0 1.5-1 1.5-1 3s1 1.5 1 3M16 4c0 1.5-1 1.5-1 3s1 1.5 1 3" stroke={ACCENT} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (mode === "body") {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Circle cx="12" cy="5" r="2.4" stroke={ACCENT} strokeWidth={1.7} fill="none" />
        <Path d="M12 8v8m0-5l-5 2m5-2l5 2M9 21l3-5 3 5" stroke={ACCENT} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M8 3l4 3 4-3 4 4-3 2v12H7V9L4 7z" stroke={ACCENT} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ScanCard({ mode, title, blurb, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${title} scan — rolling out soon`}
    >
      <View style={s.iconWrap}>
        <ModeIcon mode={mode} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.titleRow}>
          <Text style={s.title}>{title}</Text>
          <View style={s.soonBadge}>
            <Text style={s.soonText}>SOON</Text>
          </View>
        </View>
        <Text style={s.blurb}>{blurb}</Text>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M9 6l6 6-6 6" stroke="#4F5570" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,143,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.24)",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: "#F8FAFE", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  soonBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(74,143,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.30)",
  },
  soonText: { color: "#6BA9FF", fontSize: 8, fontWeight: "800", letterSpacing: 1.6 },
  blurb: { color: "#9AA1B7", fontSize: 12, marginTop: 4, lineHeight: 16, letterSpacing: 0.2 },
});
