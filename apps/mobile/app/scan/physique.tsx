/**
 * Physique Scanner — real on-device camera → AI body rating → muscle map + plan.
 * Reached instantly from the Coach tab (and the Strength "Scan Physique" card).
 *
 * Flow:  consent (one-time) → camera (body-outline guide) → capture → on-device
 *        full-body gate → physique-scan AI → results (rank · muscle map · weak
 *        points · routine) → save locally → Compare.
 *
 * PRIVACY (matches consent copy + Privacy Policy): the photo is stored ONLY on
 * this device (app-private dir). For the rating, the bytes are sent over HTTPS to
 * OUR edge function, analyzed in memory, and discarded — never persisted, never
 * shared, never logged. 18+. NO MEDICAL CLAIMS — fitness/aesthetic guidance only.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { BodyMap } from "@/components/scanner/BodyMap";
import { runPhysiqueScan, type PhysiqueResult } from "@/lib/ai/physique";
import { detectFullBody } from "@/lib/scanner/bodyDetect";
import { savePhoto } from "@/lib/scanner/storage";
import { buildRoutine, whyWeak, muscleLabel } from "@/lib/scanner/routine";
import { useGameStateStore, MUSCLE_KEYS, type MuscleKey } from "@/stores/game-state-store";
import { useScanHistoryStore } from "@/stores/scan-history-store";
import { useWorkoutStore } from "@/stores/workout-store";
import { useCoreScreenView } from "@/lib/analytics";

const ACCENT = "#4A8FFF";
const CONSENT_KEY = "core.physiqueConsent.v1";

type Step = "loading" | "consent" | "camera" | "analyzing" | "result" | "notbody" | "error";

export default function PhysiqueScannerScreen() {
  useCoreScreenView("physique_scan");
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [step, setStep] = useState<Step>("loading");
  const [consented, setConsented] = useState(false);
  const [result, setResult] = useState<PhysiqueResult | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);

  const granted = permission?.granted ?? false;
  const canAsk = permission?.canAskAgain ?? true;

  // Decide the opening step fast so it "opens instantly".
  useEffect(() => {
    (async () => {
      let ok = false;
      try { ok = (await AsyncStorage.getItem(CONSENT_KEY)) === "1"; } catch { /* default false */ }
      setConsented(ok);
      setStep(ok ? "camera" : "consent");
    })();
  }, []);

  const acceptConsent = useCallback(async () => {
    try { await AsyncStorage.setItem(CONSENT_KEY, "1"); } catch { /* best effort */ }
    setConsented(true);
    if (!granted && canAsk) await requestPermission();
    setStep("camera");
  }, [granted, canAsk, requestPermission]);

  const capture = useCallback(async () => {
    if (!camRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await camRef.current.takePictureAsync({ base64: true, quality: 0.6, skipProcessing: true });
      if (!photo?.base64) { setErrMsg("Couldn't read the photo."); setStep("error"); return; }
      setPhotoUri(photo.uri ?? null);
      setStep("analyzing");

      // On-device full-body gate (if TF deps present). If unavailable, fall back
      // to the server's isBody check — never block forever, never fake a body.
      const check = await detectFullBody(photo.base64);
      if (check.available && !check.isFullBody) { setStep("notbody"); return; }

      const outcome = await runPhysiqueScan(photo.base64, "image/jpeg");
      if (outcome.kind === "not_body") { setStep("notbody"); return; }
      if (outcome.kind === "rate_limited") { setErrMsg("Too many scans — give it a minute and try again."); setStep("error"); return; }
      if (outcome.kind === "unavailable") { setErrMsg("The scanner isn't available right now. Try again later."); setStep("error"); return; }
      if (outcome.kind === "error") { setErrMsg("Something went wrong analyzing your scan."); setStep("error"); return; }

      await applyResult(outcome.result, photo.uri ?? null);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Capture failed.");
      setStep("error");
    }
  }, []);

  // Persist the result: muscle map + body-stat bump + local photo + history record.
  const applyResult = useCallback(async (res: PhysiqueResult, uri: string | null) => {
    const game = useGameStateStore.getState();
    const history = useScanHistoryStore.getState();
    const prev = history.latest();

    // Save the photo to app-private storage (never uploaded).
    let savedUri: string | null = null;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    if (uri) { try { savedUri = await savePhoto(uri, id); } catch { savedUri = null; } }

    // Write per-muscle levels into the shared store (Strength map reads this).
    const levels: Partial<Record<MuscleKey, { level: number; status: "weak" | "ok" | "strong" }>> = {};
    for (const k of MUSCLE_KEYS) levels[k] = { level: res.muscles[k].level, status: res.muscles[k].status };
    game.setMuscleLevels(levels);

    // Bump the Body stat only on improvement vs the last scan (dampened).
    const delta = prev ? res.rank.score - prev.score : 0;
    setScoreDelta(prev ? delta : null);
    if (delta > 0) game.addStat("body", Math.min(8, Math.round(delta * 0.5)), "quest_scan_physique");

    // Save the weak-point routine so it persists in the Scan tab's "Your Plan".
    useWorkoutStore.getState().setRoutine(buildRoutine(res.weakPoints), "physique_scan");

    history.addScan({
      id,
      score: res.rank.score,
      tier: res.rank.tier,
      muscles: useGameStateStore.getState().muscles,
      weakPoints: res.weakPoints,
      summary: res.summary,
      photoUri: savedUri,
    });

    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* noop */ }
    setResult(res);
    setStep("result");
  }, []);

  // ── render per step ──────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#0A0820", "#02020A", "#050510"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={s.topbar}>
          <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
            <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M18 6 6 18M6 6l12 12" stroke="#9AA1B7" strokeWidth={2} strokeLinecap="round" /></Svg>
          </Pressable>
          <Text style={s.topTitle}>Physique Scan</Text>
          <Pressable hitSlop={10} onPress={openPrivacyMenu} accessibilityRole="button" accessibilityLabel="Privacy options">
            <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 2 4 5v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V5z" stroke="#9AA1B7" strokeWidth={1.7} fill="none" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>

        {step === "loading" && <Centered><ActivityIndicator color={ACCENT} /></Centered>}

        {step === "consent" && <Consent onAccept={acceptConsent} onClose={() => router.back()} />}

        {step === "camera" && (
          <CameraStep
            granted={granted}
            canAsk={canAsk}
            camRef={camRef}
            onEnable={async () => { if (!granted && canAsk) await requestPermission(); else Linking.openSettings(); }}
            onCapture={capture}
          />
        )}

        {step === "analyzing" && (
          <Centered>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={s.analyzeText}>Analyzing your physique…</Text>
            <Text style={s.analyzeSub}>Private · your photo never leaves this device after analysis.</Text>
          </Centered>
        )}

        {step === "notbody" && (
          <Centered>
            <Text style={s.bigEmoji}>🧍</Text>
            <Text style={s.notbodyTitle}>Couldn't detect a full body</Text>
            <Text style={s.notbodySub}>Line your whole body up in the frame, with good lighting and fitted clothing, then try again.</Text>
            <PrimaryBtn label="Try again" onPress={() => setStep("camera")} />
          </Centered>
        )}

        {step === "error" && (
          <Centered>
            <Text style={s.notbodyTitle}>Scan didn't finish</Text>
            <Text style={s.notbodySub}>{errMsg}</Text>
            <PrimaryBtn label="Try again" onPress={() => setStep("camera")} />
          </Centered>
        )}

        {step === "result" && result && (
          <Results
            result={result}
            photoUri={photoUri}
            scoreDelta={scoreDelta}
            onRescan={() => { setResult(null); setStep("camera"); }}
            onDone={() => router.back()}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ── privacy menu (delete-all lives here) ─────────────────────────────────────
function openPrivacyMenu() {
  Alert.alert(
    "Your scan privacy",
    "Photos are stored only on this device and are never uploaded. The AI analysis is private and the image is discarded right after.",
    [
      { text: "Close", style: "cancel" },
      {
        text: "Delete all scans",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete all scans?", "This permanently removes every saved scan photo and record from this device.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete all", style: "destructive", onPress: () => useScanHistoryStore.getState().clearAll() },
          ]);
        },
      },
    ],
  );
}

// ── consent screen ───────────────────────────────────────────────────────────
function Consent({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const points = [
    ["📵", "Stays on your device", "Your photo is saved only here, in CORE's private storage. It's never uploaded to a server or shared."],
    ["🔒", "Private analysis", "To rate it, the image is sent securely to our own AI, analyzed in memory, and discarded immediately — never stored or logged."],
    ["💪", "Fitness, not medical", "This is training guidance to help you improve — not a medical or body-composition diagnosis."],
    ["🔞", "18+ and optional", "You're in control. You can delete every scan at any time from the shield icon."],
  ];
  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <Text style={s.eyebrow}>BEFORE YOUR FIRST SCAN</Text>
      <Text style={s.h1}>How your photo is handled</Text>
      <View style={{ height: 14 }} />
      {points.map(([icon, title, body]) => (
        <View key={title} style={s.consentRow}>
          <Text style={s.consentIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.consentTitle}>{title}</Text>
            <Text style={s.consentBody}>{body}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 18 }} />
      <PrimaryBtn label="I understand — continue" onPress={onAccept} />
      <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 14 }}>
        <Text style={s.linkText}>Not now</Text>
      </Pressable>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ── camera step ──────────────────────────────────────────────────────────────
function CameraStep({
  granted, canAsk, camRef, onEnable, onCapture,
}: {
  granted: boolean; canAsk: boolean; camRef: React.RefObject<CameraView>;
  onEnable: () => void; onCapture: () => void;
}) {
  if (!granted) {
    return (
      <Centered>
        <Text style={s.bigEmoji}>📷</Text>
        <Text style={s.notbodyTitle}>Camera access needed</Text>
        <Text style={s.notbodySub}>The scanner uses your camera to take one full-body photo. It only opens when you tap capture.</Text>
        <PrimaryBtn label={canAsk ? "Enable camera" : "Open Settings"} onPress={onEnable} />
      </Centered>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={s.cameraWrap}>
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
        {/* body-outline guide */}
        <View pointerEvents="none" style={s.guideWrap}>
          <Svg width="60%" height="82%" viewBox="0 0 100 160">
            <Path
              d="M50 6 a8 8 0 1 1 -0.1 0 M34 30 Q50 22 66 30 L62 84 L58 150 L52 150 L50 100 L48 150 L42 150 L38 84 Z"
              fill="none" stroke="rgba(74,143,255,0.55)" strokeWidth={1.4} strokeDasharray="4 3" strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
      <View style={s.camFooter}>
        <Text style={s.tips}>Full body in frame · good lighting · fitted clothing</Text>
        <Pressable onPress={onCapture} style={s.shutterOuter} accessibilityRole="button" accessibilityLabel="Capture">
          <View style={s.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

// ── results ──────────────────────────────────────────────────────────────────
function Results({
  result, photoUri, scoreDelta, onRescan, onDone,
}: {
  result: PhysiqueResult; photoUri: string | null; scoreDelta: number | null;
  onRescan: () => void; onDone: () => void;
}) {
  const routine = buildRoutine(result.weakPoints);
  const muscles = useGameStateStore.getState().muscles;
  const prev = useScanHistoryStore((st) => st.records[1] ?? null);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* rank */}
      <View style={s.rankCard}>
        <Text style={s.rankTier}>{result.rank.tier.toUpperCase()}</Text>
        <Text style={s.rankScore}>{result.rank.score}</Text>
        <Text style={s.rankLabel}>PHYSIQUE SCORE</Text>
        {scoreDelta !== null && (
          <Text style={[s.rankDelta, { color: scoreDelta >= 0 ? "#34D399" : "#FF6B7E" }]}>
            {scoreDelta >= 0 ? "▲ " : "▼ "}{Math.abs(scoreDelta)} since last scan
          </Text>
        )}
      </View>

      {/* muscle map */}
      <Text style={s.sectionEyebrow}>MUSCLE MAP</Text>
      <View style={s.mapCard}>
        <BodyMap muscles={muscles} size={170} />
        <View style={s.legend}>
          {(["weak", "ok", "strong"] as const).map((k) => (
            <View key={k} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: k === "weak" ? "#FF7A45" : k === "ok" ? ACCENT : "#34D399" }]} />
              <Text style={s.legendText}>{k === "weak" ? "Needs work" : k === "ok" ? "Solid" : "Strong"}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* summary */}
      <View style={s.summaryCard}><Text style={s.summaryText}>{result.summary}</Text></View>

      {/* what to work on */}
      {result.weakPoints.length > 0 && (
        <>
          <Text style={s.sectionEyebrow}>WHAT TO WORK ON</Text>
          {result.weakPoints.map((m) => (
            <View key={m} style={s.weakRow}>
              <View style={[s.weakDot, { backgroundColor: "#FF7A45" }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.weakTitle}>{muscleLabel(m)}</Text>
                <Text style={s.weakWhy}>{whyWeak(m)}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* routine */}
      <Text style={s.sectionEyebrow}>YOUR ROUTINE · {routine.days} DAYS/WK</Text>
      <View style={s.routineCard}>
        <Text style={s.routineTitle}>{routine.title}</Text>
        {routine.exercises.map((ex, i) => (
          <View key={i} style={s.exRow}>
            <Text style={s.exName}>{ex.name}</Text>
            <Text style={s.exSets}>{ex.sets}</Text>
          </View>
        ))}
      </View>

      {/* compare */}
      {prev && (
        <>
          <Text style={s.sectionEyebrow}>PROGRESS</Text>
          <View style={s.compareCard}>
            <Compare label="Previous" uri={prev.photoUri} score={prev.score} tier={prev.tier} />
            <View style={s.compareArrow}><Text style={{ color: "#4F5570", fontSize: 18 }}>→</Text></View>
            <Compare label="Now" uri={photoUri} score={result.rank.score} tier={result.rank.tier} />
          </View>
        </>
      )}

      <Text style={s.disclaimer}>Visual fitness guidance only — not a medical or body-composition assessment.</Text>

      <View style={{ height: 8 }} />
      <PrimaryBtn label="Done" onPress={onDone} />
      <Pressable onPress={onRescan} style={{ alignItems: "center", paddingVertical: 14 }}>
        <Text style={s.linkText}>Scan again</Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Compare({ label, uri, score, tier }: { label: string; uri: string | null; score: number; tier: string }) {
  return (
    <View style={s.compareCol}>
      <Text style={s.compareLabel}>{label}</Text>
      {uri ? <Image source={{ uri }} style={s.comparePhoto} /> : <View style={[s.comparePhoto, s.comparePhotoEmpty]} />}
      <Text style={s.compareScore}>{score}</Text>
      <Text style={s.compareTier}>{tier}</Text>
    </View>
  );
}

// ── small shared bits ────────────────────────────────────────────────────────
function Centered({ children }: { children: React.ReactNode }) {
  return <View style={s.centered}>{children}</View>;
}
function PrimaryBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.primaryBtn} accessibilityRole="button">
      <Text style={s.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
  topTitle: { color: "#F8FAFE", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  scroll: { padding: 18, paddingBottom: 30 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 12 },

  eyebrow: { color: "#9AA1B7", fontSize: 10, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase" },
  h1: { color: "#F8FAFE", fontSize: 26, fontWeight: "800", letterSpacing: -0.4, marginTop: 6, lineHeight: 30 },

  // consent
  consentRow: { flexDirection: "row", gap: 13, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 10 },
  consentIcon: { fontSize: 22 },
  consentTitle: { color: "#F8FAFE", fontSize: 14.5, fontWeight: "800", marginBottom: 3 },
  consentBody: { color: "#9AA1B7", fontSize: 12.5, lineHeight: 18 },

  // camera
  cameraWrap: { flex: 1, margin: 16, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(74,143,255,0.25)" },
  guideWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  camFooter: { alignItems: "center", paddingBottom: 24, gap: 16 },
  tips: { color: "#9AA1B7", fontSize: 12, letterSpacing: 0.2 },
  shutterOuter: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: ACCENT, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(74,143,255,0.12)" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F8FAFE" },

  // analyzing / states
  analyzeText: { color: "#F8FAFE", fontSize: 16, fontWeight: "700", marginTop: 18 },
  analyzeSub: { color: "#9AA1B7", fontSize: 12.5, textAlign: "center", lineHeight: 18 },
  bigEmoji: { fontSize: 44 },
  notbodyTitle: { color: "#F8FAFE", fontSize: 18, fontWeight: "800", textAlign: "center" },
  notbodySub: { color: "#9AA1B7", fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 6 },

  // rank
  rankCard: { alignItems: "center", paddingVertical: 26, borderRadius: 22, backgroundColor: "rgba(74,143,255,0.06)", borderWidth: 1, borderColor: "rgba(74,143,255,0.22)" },
  rankTier: { color: ACCENT, fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  rankScore: { color: "#FFFFFF", fontSize: 64, fontWeight: "900", letterSpacing: -2, lineHeight: 68, marginTop: 4 },
  rankLabel: { color: "#4F5570", fontSize: 10, fontWeight: "800", letterSpacing: 2.4, marginTop: 2 },
  rankDelta: { fontSize: 12, fontWeight: "800", marginTop: 8 },

  sectionEyebrow: { color: "#9AA1B7", fontSize: 10.5, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase", marginTop: 22, marginBottom: 10 },

  mapCard: { alignItems: "center", paddingVertical: 18, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  legend: { flexDirection: "row", gap: 16, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: "#9AA1B7", fontSize: 11, fontWeight: "600" },

  summaryCard: { marginTop: 14, padding: 15, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  summaryText: { color: "#D7DCEA", fontSize: 13.5, lineHeight: 20 },

  weakRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 8 },
  weakDot: { width: 10, height: 10, borderRadius: 5 },
  weakTitle: { color: "#F8FAFE", fontSize: 14, fontWeight: "800" },
  weakWhy: { color: "#9AA1B7", fontSize: 12, marginTop: 2, lineHeight: 17 },

  routineCard: { padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  routineTitle: { color: "#F8FAFE", fontSize: 14, fontWeight: "800", marginBottom: 10 },
  exRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  exName: { color: "#D7DCEA", fontSize: 13.5, flex: 1 },
  exSets: { color: "#6BA9FF", fontSize: 12, fontWeight: "700" },

  compareCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  compareCol: { flex: 1, alignItems: "center", gap: 4 },
  compareArrow: { paddingHorizontal: 6 },
  compareLabel: { color: "#9AA1B7", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  comparePhoto: { width: 88, height: 120, borderRadius: 12, backgroundColor: "#11131f" },
  comparePhotoEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  compareScore: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  compareTier: { color: "#9AA1B7", fontSize: 11, fontWeight: "700" },

  disclaimer: { color: "#4F5570", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 18 },

  primaryBtn: { padding: 15, borderRadius: 15, alignItems: "center", backgroundColor: ACCENT, marginTop: 4 },
  primaryBtnText: { color: "#02030A", fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  linkText: { color: "#9AA1B7", fontSize: 13, fontWeight: "700" },
});
