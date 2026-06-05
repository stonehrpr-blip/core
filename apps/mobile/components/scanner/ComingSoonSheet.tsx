/**
 * ComingSoonSheet — honest bottom sheet shown when a scan mode is tapped.
 *
 * The AI vision pipeline is not live, so instead of a fake camera/result
 * flow we tell the truth: what the mode WILL do, and that nothing leaves the
 * device until the user explicitly captures (local-first, matches the
 * Privacy Policy). No capture happens here.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ScanMode } from "./ScanCard";

const ACCENT = "#4A8FFF";

const COPY: Record<ScanMode, { title: string; lead: string; bullets: string[] }> = {
  food: {
    title: "Food scan",
    lead: "Point your camera at a meal and CORE will estimate calories and macros, then let you log it in one tap.",
    bullets: ["Calorie + macro estimate", "Confidence score, never a guess dressed as fact", "Edit before it touches your day"],
  },
  body: {
    title: "Body scan",
    lead: "A private physique check-in — front and side photos to track composition trends over time.",
    bullets: ["Trends, not judgement", "Photos stay on your device", "You choose what to keep"],
  },
  outfit: {
    title: "Outfit scan",
    lead: "Snap a fit and get styling feedback and quick wins — colour, fit and balance.",
    bullets: ["Constructive styling notes", "On-device analysis", "Nothing posted anywhere"],
  },
};

type Props = {
  mode: ScanMode | null;
  onClose: () => void;
};

export function ComingSoonSheet({ mode, onClose }: Props) {
  const copy = mode ? COPY[mode] : null;
  return (
    <Modal visible={!!mode} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          {copy && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.iconWrap}>
                <Svg width={26} height={26} viewBox="0 0 24 24">
                  <Path d="M12 7v5l3 2" stroke={ACCENT} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M3 12a9 9 0 1 0 9-9" stroke={ACCENT} strokeWidth={1.8} fill="none" strokeLinecap="round" />
                </Svg>
              </View>
              <Text style={s.eyebrow}>ROLLS OUT SOON</Text>
              <Text style={s.title}>{copy.title}</Text>
              <Text style={s.lead}>{copy.lead}</Text>

              <View style={s.list}>
                {copy.bullets.map((b) => (
                  <View key={b} style={s.listItem}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path d="M20 6L9 17l-5-5" stroke={ACCENT} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={s.listText}>{b}</Text>
                  </View>
                ))}
              </View>

              <View style={s.privacyNote}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#9AA1B7" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={s.privacyText}>Local-first: photos are processed on your device and never uploaded without you tapping capture.</Text>
              </View>

              <Pressable style={s.cta} onPress={onClose} accessibilityRole="button">
                <Text style={s.ctaText}>GOT IT</Text>
              </Pressable>
              <View style={{ height: 12 }} />
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#06070A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", alignSelf: "center", marginBottom: 20 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,143,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.24)",
    alignSelf: "center",
    marginBottom: 16,
  },
  eyebrow: { color: "#6BA9FF", fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textAlign: "center" },
  title: { color: "#F8FAFE", fontSize: 24, fontWeight: "800", letterSpacing: -0.3, textAlign: "center", marginTop: 6 },
  lead: { color: "#9AA1B7", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10, paddingHorizontal: 4 },
  list: { gap: 10, marginTop: 22 },
  listItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  listText: { color: "#F8FAFE", fontSize: 13, flex: 1, letterSpacing: 0.2 },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 22,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  privacyText: { color: "#9AA1B7", fontSize: 11.5, lineHeight: 17, flex: 1, letterSpacing: 0.2 },
  cta: {
    marginTop: 22,
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(74,143,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.34)",
  },
  ctaText: { color: "#6BA9FF", fontSize: 13, fontWeight: "700", letterSpacing: 1.6 },
});
