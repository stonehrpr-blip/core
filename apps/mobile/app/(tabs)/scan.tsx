/**
 * Scan tab — AI vision hub (Food / Body / Outfit).
 *
 * Ported intent from previews/_REVIEW_DELETE/36-scan-food, 37-scan-body,
 * 38-scan-outfit. The capture + AI pipeline is NOT live yet, so this is an
 * honest MVP hub: each mode is a card with a "SOON" badge that opens a
 * coming-soon sheet. We do NOT ship a fake camera/result flow.
 *
 * Privacy (matches the app Privacy Policy): the camera is strictly opt-in.
 * Enabling pre-approves access only; capture is local-first and nothing is
 * uploaded silently. Accent #4A8FFF (CORE electric blue).
 */
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { ScanCard, type ScanMode } from "@/components/scanner/ScanCard";
import { ComingSoonSheet } from "@/components/scanner/ComingSoonSheet";
import { BodyMap } from "@/components/scanner/BodyMap";
import { useGameStateStore } from "@/stores/game-state-store";
import { useScanHistoryStore } from "@/stores/scan-history-store";
import { useWorkoutStore } from "@/stores/workout-store";
import { useCoreScreenView } from "@/lib/analytics";

const ACCENT = "#4A8FFF";

const MODES: { mode: ScanMode; title: string; blurb: string }[] = [
  { mode: "food", title: "Food", blurb: "Estimate calories & macros from a photo, then log it." },
  { mode: "body", title: "Body", blurb: "Private physique check-in to track composition trends." },
  { mode: "outfit", title: "Outfit", blurb: "Styling feedback — colour, fit and quick wins." },
];

export default function ScanScreen() {
  useCoreScreenView("scan");
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState<ScanMode | null>(null);

  // Physique state — written by the scanner, read here so the muscle map +
  // routine persist and are visible between scans.
  const muscles = useGameStateStore((st) => st.muscles);
  const lastScan = useScanHistoryStore((st) => st.records[0] ?? null);
  const routine = useWorkoutStore((st) => st.routine);
  const hasScan = !!lastScan;

  const granted = permission?.granted ?? false;
  const canAsk = permission?.canAskAgain ?? true;

  const onEnableCamera = async () => {
    if (granted) return;
    if (!canAsk) {
      Linking.openSettings();
      return;
    }
    await requestPermission();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#0A0820", "#02020A", "#050510"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(74,143,255,0.14)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.eyebrow}>SCAN · AI VISION</Text>
            <Text style={s.h1}>Scan</Text>
            <Text style={s.sub}>Point, capture, log. AI scanning is rolling out soon.</Text>
          </View>

          {/* Camera permission / privacy card */}
          <View style={[s.permCard, granted && s.permCardOn]}>
            <View style={s.permHead}>
              <View style={[s.permIcon, granted && { backgroundColor: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.30)" }]}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                    stroke={granted ? "#34D399" : ACCENT}
                    strokeWidth={1.7}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={granted ? "#34D399" : ACCENT} strokeWidth={1.7} fill="none" />
                </Svg>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.permTitle}>{granted ? "Camera ready" : "Camera is off"}</Text>
                <Text style={s.permStatus}>
                  {granted
                    ? "Access granted · scans process on-device"
                    : canAsk
                    ? "Optional — turn on to pre-approve scanning"
                    : "Blocked — enable Camera in Settings"}
                </Text>
              </View>
            </View>

            <Text style={s.permBody}>
              CORE never opens your camera on its own. Photos you capture stay on your device and are never uploaded without you tapping capture.
            </Text>

            {!granted && (
              <Pressable style={s.permBtn} onPress={onEnableCamera} accessibilityRole="button">
                <Text style={s.permBtnText}>{canAsk ? "ENABLE CAMERA" : "OPEN SETTINGS"}</Text>
              </Pressable>
            )}
          </View>

          {/* Your physique — muscle map + latest score (updated by scans) */}
          {hasScan && (
            <>
              <Text style={s.sectionEyebrow}>YOUR PHYSIQUE</Text>
              <Pressable style={s.physCard} onPress={() => router.push("/scan/physique")} accessibilityRole="button">
                <BodyMap muscles={muscles} size={120} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.physTier}>{lastScan!.tier.toUpperCase()}</Text>
                  <Text style={s.physScore}>{lastScan!.score}</Text>
                  <Text style={s.physScoreLabel}>PHYSIQUE SCORE</Text>
                  <View style={s.physLegend}>
                    {(["weak", "ok", "strong"] as const).map((k) => (
                      <View key={k} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: k === "weak" ? "#FF7A45" : k === "ok" ? ACCENT : "#34D399" }]} />
                        <Text style={s.legendText}>{k === "weak" ? "Weak" : k === "ok" ? "Solid" : "Strong"}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.physCta}>Tap to rescan →</Text>
                </View>
              </Pressable>
            </>
          )}

          {/* Your plan — the routine saved by the last scan */}
          {routine && (
            <>
              <Text style={s.sectionEyebrow}>YOUR PLAN · {routine.days} DAYS/WK</Text>
              <View style={s.planCard}>
                <Text style={s.planTitle}>{routine.title}</Text>
                {routine.exercises.map((ex, i) => (
                  <View key={i} style={s.exRow}>
                    <Text style={s.exName}>{ex.name}</Text>
                    <Text style={s.exSets}>{ex.sets}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Mode cards */}
          <Text style={s.sectionEyebrow}>SCAN MODES</Text>
          {MODES.map((m) => (
            <ScanCard
              key={m.mode}
              mode={m.mode}
              title={m.title}
              blurb={m.blurb}
              // Body scan is live — it opens the real Physique Scanner instantly.
              onPress={() => (m.mode === "body" ? router.push("/scan/physique") : setActiveMode(m.mode))}
            />
          ))}

          {/* Honest footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              Scanning is in development. We'd rather ship nothing than fake a result — every estimate will show its confidence when it lands.
            </Text>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      <ComingSoonSheet mode={activeMode} onClose={() => setActiveMode(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },

  header: { paddingHorizontal: 4, paddingBottom: 18 },
  eyebrow: { color: "#9AA1B7", fontSize: 10, fontWeight: "600", letterSpacing: 2.2, textTransform: "uppercase" },
  h1: { color: "#F8FAFE", fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginTop: 6, lineHeight: 32 },
  sub: { color: "#9AA1B7", fontSize: 13, marginTop: 6, letterSpacing: 0.2, lineHeight: 18 },

  permCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(74,143,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.22)",
    marginBottom: 6,
  },
  permCardOn: { backgroundColor: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.24)" },
  permHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  permIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,143,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.24)",
  },
  permTitle: { color: "#F8FAFE", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  permStatus: { color: "#9AA1B7", fontSize: 12, marginTop: 2, letterSpacing: 0.2 },
  permBody: { color: "#9AA1B7", fontSize: 12, lineHeight: 17, marginTop: 14, letterSpacing: 0.2 },
  permBtn: {
    marginTop: 14,
    padding: 13,
    borderRadius: 13,
    alignItems: "center",
    backgroundColor: "rgba(74,143,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(74,143,255,0.34)",
  },
  permBtnText: { color: "#6BA9FF", fontSize: 12, fontWeight: "700", letterSpacing: 1.6 },

  sectionEyebrow: { color: "#9AA1B7", fontSize: 11, fontWeight: "600", letterSpacing: 2.4, textTransform: "uppercase", marginTop: 24, marginBottom: 10, paddingHorizontal: 4 },

  // your physique
  physCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 20, backgroundColor: "rgba(74,143,255,0.05)", borderWidth: 1, borderColor: "rgba(74,143,255,0.20)" },
  physTier: { color: ACCENT, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  physScore: { color: "#FFFFFF", fontSize: 40, fontWeight: "900", letterSpacing: -1.5, lineHeight: 44 },
  physScoreLabel: { color: "#4F5570", fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  physLegend: { flexDirection: "row", gap: 12, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#9AA1B7", fontSize: 10.5, fontWeight: "600" },
  physCta: { color: "#6BA9FF", fontSize: 12, fontWeight: "700", marginTop: 10 },

  // your plan
  planCard: { padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  planTitle: { color: "#F8FAFE", fontSize: 14, fontWeight: "800", marginBottom: 10 },
  exRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  exName: { color: "#D7DCEA", fontSize: 13.5, flex: 1 },
  exSets: { color: "#6BA9FF", fontSize: 12, fontWeight: "700" },

  footer: { marginTop: 14, paddingHorizontal: 4 },
  footerText: { color: "#4F5570", fontSize: 11, lineHeight: 16, letterSpacing: 0.2 },
});
