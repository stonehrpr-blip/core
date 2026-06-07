/**
 * Ranks tab — RN port of previews/ranks.html.
 *
 * Mirrors the same hero-stage / ladder / week-rail / history-drawer pattern,
 * driven by the same 10-tier ladder in game-state-store.ts. Crests use
 * react-native-svg with the same 4-layer system (outer ring → field →
 * specular → bezel → glyph), banded into hex / shield / sunburst / radiant.
 *
 * Animation budget: current-tier pulse only (Reanimated). Aurora/scan are
 * static linear gradients — keeping the JS thread free for tap response.
 */
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import {
  GAME_RANKS,
  useGameStateStore,
  type RankHistoryEntry,
  type XpLedgerEntry,
} from "@/stores/game-state-store";
import { Crest, TIER_REWARDS, RewardIconSvg } from "@/components/Crest";
import { useCoreScreenView } from "@/lib/analytics";

/* ────────────────────────────────────────────────────────────────────────
   Derivations
   ──────────────────────────────────────────────────────────────────────── */
type WeeklyXp = { xpThisWeek: number; daily: number };

function deriveWeeklyXp(xp: number, ledger: XpLedgerEntry[]): WeeklyXp {
  if (ledger && ledger.length) {
    const weekStart = Date.now() - 7 * 86400000;
    let earned = 0;
    for (const e of ledger) {
      if (e.ts < weekStart) break;
      if (e.delta > 0) earned += e.delta;
    }
    return { xpThisWeek: earned, daily: Math.round(earned / 7) };
  }
  // Pre-ledger heuristic
  if (xp <= 0) return { xpThisWeek: 0, daily: 0 };
  const daily = Math.max(1, Math.round(xp / 7));
  return { xpThisWeek: Math.min(xp, daily * 7), daily };
}

type Zone = { state: "promote" | "demote" | "neutral" | "apex"; label: string; text: string; icon: "up" | "down" | "crown" };
function deriveZone(toNext: number, weekly: WeeklyXp, xp: number, nextName: string | null): Zone {
  if (!nextName) return { state: "apex", label: "APEX TIER", text: "You hold the top tier.", icon: "crown" };
  if (toNext === 0) return { state: "promote", label: "PROMOTE ZONE", text: `You unlock ${nextName} on next earn.`, icon: "up" };
  if (weekly.xpThisWeek >= toNext) return { state: "promote", label: "PROMOTE ZONE", text: `On pace to reach ${nextName} this week.`, icon: "up" };
  if (weekly.xpThisWeek >= toNext * 0.5) return { state: "neutral", label: "KEEP CLIMBING", text: `${toNext.toLocaleString()} XP to ${nextName} · stay consistent.`, icon: "up" };
  if (weekly.daily < 5 && xp > 0) return { state: "demote", label: "COOL ZONE", text: "XP rate dipping — log honestly to recover.", icon: "down" };
  return { state: "neutral", label: "KEEP CLIMBING", text: "Earn XP this week to enter the promote zone.", icon: "up" };
}

function deriveHistory(xp: number, rankHistory: RankHistoryEntry[]): RankHistoryEntry[] {
  if (rankHistory && rankHistory.length) return rankHistory;
  const out: RankHistoryEntry[] = [];
  GAME_RANKS.forEach((r, i) => {
    if (xp >= r.min && i > 0) out.push({ rankName: r.name, ts: 0, xp: r.min });
  });
  return out.reverse();
}

/* ────────────────────────────────────────────────────────────────────────
   Screen
   ──────────────────────────────────────────────────────────────────────── */
export default function RanksScreen() {
  useCoreScreenView("ranks");
  const xp = useGameStateStore((s) => s.xp);
  const me = useGameStateStore((s) => s.rankFor());
  const xpLedger = useGameStateStore((s) => s.xpLedger);
  const rankHistory = useGameStateStore((s) => s.rankHistory);
  const [historyOpen, setHistoryOpen] = useState(false);

  const nextR = GAME_RANKS[me.idx + 1] || null;
  const weekly = useMemo(() => deriveWeeklyXp(xp, xpLedger), [xp, xpLedger]);
  const zone = deriveZone(me.toNext, weekly, xp, nextR ? nextR.name : null);
  const history = useMemo(() => deriveHistory(xp, rankHistory), [xp, rankHistory]);

  // Pulse on current crest
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.ease) }), withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#0A0820", "#02020A", "#050510"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      {/* Static "aurora" wash */}
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
            <View>
              <Text style={s.eyebrow}>RANK · SEASON 1</Text>
              <Text style={s.h1}>Ranks</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable style={s.iconBtn} onPress={() => setHistoryOpen(true)} accessibilityRole="button" accessibilityLabel="Rank history">
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Circle cx="12" cy="12" r={9} stroke="#F8FAFE" strokeWidth={1.8} fill="none" />
                  <Path d="M12 7v5l3 2M3 12a9 9 0 0 0 9 9" stroke="#F8FAFE" strokeWidth={1.8} fill="none" strokeLinecap="round" />
                </Svg>
              </Pressable>
              <Pressable style={s.iconBtn} onPress={() => router.push("/settings" as never)} accessibilityRole="button" accessibilityLabel="Settings">
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Circle cx="12" cy="12" r={3} stroke="#F8FAFE" strokeWidth={1.8} fill="none" />
                  <Path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    stroke="#F8FAFE"
                    strokeWidth={1.8}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            </View>
          </View>

          {/* Hero stage */}
          <View style={[s.hero, { borderColor: "rgba(255,255,255,0.12)" }]}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 24,
                  backgroundColor: "transparent",
                  shadowColor: me.glow,
                  shadowOpacity: 0.18,
                  shadowRadius: 36,
                },
              ]}
            />
            <Text style={s.heroEyebrow}>CURRENT TIER · {String(me.idx + 1).padStart(2, "0")}/10</Text>
            <Animated.View style={[{ alignItems: "center", marginTop: 14, marginBottom: 6 }, pulseStyle]}>
              <Crest rank={me} size={96} />
            </Animated.View>
            <Text style={[s.heroName, { textShadowColor: me.glow }]}>{me.name.toUpperCase()}</Text>
            <Text style={s.heroMeta}>
              {nextR ? `${xp.toLocaleString()} XP · ${nextR.min.toLocaleString()} to enter ${nextR.name}` : `${xp.toLocaleString()} XP · Top of the ladder`}
            </Text>

            {/* 10 pips */}
            <View style={s.pips}>
              {GAME_RANKS.map((r, i) => {
                let pipStyle: any = s.pipEmpty;
                let pct = 0;
                if (i < me.idx) pipStyle = { backgroundColor: me.glow, shadowColor: me.glow, shadowOpacity: 1, shadowRadius: 6 };
                else if (i === me.idx) {
                  if (nextR) {
                    const span = nextR.min - me.min;
                    const into = xp - me.min;
                    pct = Math.max(8, Math.min(100, Math.round((into / span) * 100)));
                    pipStyle = { overflow: "hidden", backgroundColor: "rgba(255,255,255,0.07)", shadowColor: me.glow, shadowOpacity: 1, shadowRadius: 4 };
                  } else {
                    pipStyle = { backgroundColor: me.glow, shadowColor: me.glow, shadowOpacity: 1, shadowRadius: 6 };
                  }
                }
                return (
                  <View key={r.name} style={[s.pip, pipStyle]}>
                    {i === me.idx && nextR && (
                      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: me.glow, borderRadius: 3 }} />
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={s.heroProgressLabel}>
              {nextR ? (
                <>
                  {me.toNext.toLocaleString()} XP TO <Text style={{ color: me.glow, fontWeight: "700" }}>{nextR.name.toUpperCase()}</Text>
                </>
              ) : (
                <Text style={{ color: me.glow, fontWeight: "700" }}>APEX TIER REACHED</Text>
              )}
            </Text>
            <View style={s.heroRateRow}>
              <View style={[s.dot, { backgroundColor: "#34D399" }]} />
              <Text style={s.heroRate}>{weekly.daily > 0 ? `+${weekly.daily} XP / day this week` : "Start logging to earn XP"}</Text>
            </View>
          </View>

          {/* Ladder */}
          <Text style={s.sectionEyebrow}>THE LADDER</Text>
          {GAME_RANKS.map((r, i) => {
            const isCurrent = i === me.idx;
            const isAchieved = i < me.idx;
            const isLocked = i > me.idx;
            const rew = TIER_REWARDS[r.name] ?? { icon: "check" as const, text: "" };
            const xpRange = r.max === Infinity ? `${r.min.toLocaleString()}+ XP` : `${r.min.toLocaleString()} – ${r.max.toLocaleString()} XP`;
            const toEnter = Math.max(0, r.min - xp);
            const prevMin = i > 0 ? (GAME_RANKS[i - 1]?.min ?? 0) : 0;
            const span = r.min - prevMin;
            const into = Math.max(0, xp - prevMin);
            const pct = Math.max(0, Math.min(100, Math.round((into / span) * 100)));

            const tierLabel = `TIER ${String(i + 1).padStart(2, "0")}`;
            const isNext = i === me.idx + 1;

            const rungStyle = [
              s.rung,
              isAchieved && { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" },
              isCurrent && {
                backgroundColor: "rgba(255,255,255,0.05)",
                borderColor: r.glow,
                paddingVertical: 16,
                shadowColor: r.glow,
                shadowOpacity: 0.4,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
              },
              isLocked && { opacity: 0.55 },
            ];

            return (
              <Pressable
                key={r.name}
                onPress={() => {
                  if (isAchieved || isCurrent) setHistoryOpen(true);
                }}
                style={rungStyle}
                accessibilityRole="button"
                accessibilityLabel={`${r.name} tier ${i + 1} of 10${isCurrent ? " (current)" : isAchieved ? " (achieved)" : " (locked)"}`}
                accessibilityState={{ selected: isCurrent }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Crest rank={{ ...r, idx: i }} size={isCurrent ? 60 : 50} dim={isLocked} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={[s.rungName, isLocked && { color: "#9AA1B7" }]}>{r.name.toUpperCase()}</Text>
                      {isCurrent && (
                        <View style={[s.currentTag, { backgroundColor: r.glow, shadowColor: r.glow }]}>
                          <Text style={s.currentTagText}>YOU</Text>
                        </View>
                      )}
                      <Text style={s.tierLabel}>{tierLabel}</Text>
                    </View>
                    <Text style={s.rungMeta}>{xpRange}</Text>

                    {/* Reward tile */}
                    <View style={s.rewardTile}>
                      <View style={[s.rewardIconBg, isLocked ? { backgroundColor: "rgba(255,255,255,0.05)" } : { backgroundColor: `${r.glow}22` }]}>
                        <RewardIconSvg name={rew.icon} color={isLocked ? "#9AA1B7" : r.glow} />
                      </View>
                      <Text style={[s.rewardText, isLocked && { color: "#9AA1B7" }]}>{rew.text}</Text>
                    </View>

                    {isAchieved && !isCurrent && (
                      <Text style={[s.achievedStamp, { color: r.glow }]}>✓ REACHED</Text>
                    )}
                  </View>

                  {!isCurrent && (
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {isLocked ? (
                        <>
                          <Text style={s.rungRight}>{toEnter.toLocaleString()} XP →</Text>
                          {isNext && (
                            <View style={s.miniBar}>
                              <View style={[s.miniBarFill, { width: `${pct}%`, backgroundColor: r.glow, shadowColor: r.glow }]} />
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={[s.rungRight, { color: "#4F5570" }]}>›</Text>
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Week rail */}
          <Text style={s.sectionEyebrow}>THIS WEEK</Text>
          <View style={s.weekRail}>
            <View style={s.wrStat}>
              <Text style={s.wrNum}>
                {weekly.xpThisWeek.toLocaleString()}
                <Text style={s.wrUnit}> XP</Text>
              </Text>
              <Text style={s.wrLabel}>EARNED</Text>
            </View>
            <View style={[s.wrStat, { borderLeftColor: "rgba(255,255,255,0.06)", borderLeftWidth: 1 }]}>
              <Text style={s.wrNum}>
                {weekly.daily}
                <Text style={s.wrUnit}>/day</Text>
              </Text>
              <Text style={s.wrLabel}>DAILY AVG</Text>
            </View>
            <View style={[s.wrStat, { borderLeftColor: "rgba(255,255,255,0.06)", borderLeftWidth: 1 }]}>
              <Text style={s.wrNum}>—</Text>
              <Text style={s.wrLabel}>FRIENDS RANK</Text>
            </View>
          </View>

          <View
            style={[
              s.zone,
              zone.state === "promote" && { backgroundColor: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.24)" },
              zone.state === "demote" && { backgroundColor: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.24)" },
              (zone.state === "neutral" || zone.state === "apex") && { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.10)" },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text
                style={[
                  s.zoneLabel,
                  zone.state === "promote" && { color: "#34D399" },
                  zone.state === "demote" && { color: "#F87171" },
                  (zone.state === "neutral" || zone.state === "apex") && { color: "#9AA1B7" },
                ]}
              >
                {zone.label}
              </Text>
              <Text style={s.zoneText}>{zone.text}</Text>
            </View>
            <View
              style={[
                s.zoneIcon,
                zone.state === "promote" && { backgroundColor: "rgba(52,211,153,0.12)" },
                zone.state === "demote" && { backgroundColor: "rgba(248,113,113,0.12)" },
                (zone.state === "neutral" || zone.state === "apex") && { backgroundColor: "rgba(255,255,255,0.05)" },
              ]}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                {zone.icon === "up" && (
                  <Path d="M12 19V5M5 12l7-7 7 7" stroke={zone.state === "promote" ? "#34D399" : "#9AA1B7"} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {zone.icon === "down" && <Path d="M12 5v14M19 12l-7 7-7-7" stroke="#F87171" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                {zone.icon === "crown" && <Path d="M3 8l4 5 5-7 5 7 4-5-2 13H5z" stroke="#9AA1B7" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              </Svg>
            </View>
          </View>

          <Pressable style={s.cta} onPress={() => router.push("/leaderboard" as never)} accessibilityRole="button">
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M6 9l3-6 3 6 3-3 3 3v12H6zM2 21h20" stroke="#6BA9FF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={s.ctaText}>VIEW LEADERBOARD</Text>
          </Pressable>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* History modal */}
      <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setHistoryOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>RANK HISTORY</Text>
              <Pressable style={s.sheetClose} onPress={() => setHistoryOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M6 6l12 12M6 18L18 6" stroke="#F8FAFE" strokeWidth={2} fill="none" strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <View style={s.emptyWrap}>
                  <View style={s.emptyIcon}>
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Circle cx="12" cy="12" r={9} stroke="#9AA1B7" strokeWidth={1.6} fill="none" />
                      <Path d="M12 7v5l3 2" stroke="#9AA1B7" strokeWidth={1.6} fill="none" strokeLinecap="round" />
                    </Svg>
                  </View>
                  <Text style={s.emptyText}>No rank-ups yet.{"\n"}Climb past Iron to see your history.</Text>
                </View>
              ) : (
                history.map((h) => {
                  const idx = GAME_RANKS.findIndex((r) => r.name === h.rankName);
                  const r = GAME_RANKS[idx];
                  if (!r) return null;
                  const tsLabel = h.ts ? new Date(h.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Achieved";
                  return (
                    <View key={`${h.rankName}-${h.ts}`} style={s.historyItem}>
                      <Crest rank={{ ...r, idx }} size={36} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.hiName}>{r.name.toUpperCase()}</Text>
                        <Text style={s.hiMeta}>
                          {tsLabel} · {h.xp.toLocaleString()} XP
                        </Text>
                      </View>
                      <Text style={s.hiTier}>TIER {String(idx + 1).padStart(2, "0")}</Text>
                    </View>
                  );
                })
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 4, paddingBottom: 14 },
  eyebrow: { color: "#9AA1B7", fontSize: 10, fontWeight: "600", letterSpacing: 2.2, textTransform: "uppercase" },
  h1: { color: "#F8FAFE", fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginTop: 6, lineHeight: 30 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  sectionEyebrow: { color: "#9AA1B7", fontSize: 11, fontWeight: "600", letterSpacing: 2.4, textTransform: "uppercase", marginTop: 22, marginBottom: 10, paddingHorizontal: 4 },

  hero: {
    padding: 22, marginBottom: 4,
    borderRadius: 24, borderWidth: 1,
    backgroundColor: "rgba(74,143,255,0.05)",
    alignItems: "center",
  },
  heroEyebrow: { color: "#9AA1B7", fontSize: 10, fontWeight: "600", letterSpacing: 2.4, textTransform: "uppercase" },
  heroName: { color: "#F8FAFE", fontSize: 30, fontWeight: "800", letterSpacing: 4, textTransform: "uppercase", marginTop: 8, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24 },
  heroMeta: { color: "#9AA1B7", fontSize: 13, marginTop: 4, letterSpacing: 0.4 },
  pips: { flexDirection: "row", gap: 4, marginTop: 18, alignSelf: "stretch", paddingHorizontal: 4 },
  pip: {
    flex: 1, height: 6, borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  pipEmpty: { backgroundColor: "rgba(255,255,255,0.07)" },
  heroProgressLabel: { color: "#F8FAFE", fontSize: 11, fontWeight: "600", letterSpacing: 1.2, marginTop: 14, textTransform: "uppercase" },
  heroRateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  heroRate: { color: "#9AA1B7", fontSize: 11, letterSpacing: 0.6 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  rung: {
    padding: 12, marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1, borderColor: "transparent",
  },
  rungName: { color: "#F8FAFE", fontSize: 16, fontWeight: "800", letterSpacing: 3, textTransform: "uppercase" },
  rungMeta: { color: "#9AA1B7", fontSize: 11, marginTop: 3, letterSpacing: 0.4 },
  rungRight: { color: "#9AA1B7", fontSize: 11, letterSpacing: 0.4 },
  tierLabel: { color: "#4F5570", fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  currentTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  currentTagText: { color: "#000", fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  achievedStamp: { fontSize: 9, fontWeight: "800", letterSpacing: 1.8, marginTop: 6, opacity: 0.85 },

  rewardTile: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, padding: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  rewardIconBg: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  rewardText: { color: "#F8FAFE", fontSize: 11, flex: 1, letterSpacing: 0.2, lineHeight: 15 },

  miniBar: { width: 60, height: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 999, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 2 },

  weekRail: { flexDirection: "row", padding: 14, paddingHorizontal: 6, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", marginBottom: 10 },
  wrStat: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  wrNum: { color: "#F8FAFE", fontSize: 22, fontWeight: "800", letterSpacing: -0.5, lineHeight: 22 },
  wrUnit: { color: "#9AA1B7", fontSize: 11, fontWeight: "500" },
  wrLabel: { color: "#9AA1B7", fontSize: 9, marginTop: 6, letterSpacing: 1.6, textTransform: "uppercase" },

  zone: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  zoneLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.8, textTransform: "uppercase" },
  zoneText: { color: "#F8FAFE", fontSize: 11, letterSpacing: 0.2 },
  zoneIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },

  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 13, borderRadius: 14, backgroundColor: "rgba(74,143,255,0.10)", borderWidth: 1, borderColor: "rgba(74,143,255,0.32)" },
  ctaText: { color: "#6BA9FF", fontSize: 12, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#06070A", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, maxHeight: "74%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", alignSelf: "center", marginBottom: 18 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { color: "#F8FAFE", fontSize: 20, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  historyItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomColor: "rgba(255,255,255,0.06)", borderBottomWidth: 1 },
  hiName: { color: "#F8FAFE", fontSize: 14, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  hiMeta: { color: "#9AA1B7", fontSize: 11, marginTop: 3, letterSpacing: 0.4 },
  hiTier: { color: "#6BA9FF", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  emptyWrap: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyText: { color: "#9AA1B7", fontSize: 12, lineHeight: 18, textAlign: "center", letterSpacing: 0.4 },
});
