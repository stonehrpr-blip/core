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
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLG,
  Path,
  Polygon,
  RadialGradient as SvgRG,
  Stop,
} from "react-native-svg";

import {
  GAME_RANKS,
  useGameStateStore,
  type Rank,
  type RankHistoryEntry,
  type XpLedgerEntry,
} from "@/stores/game-state-store";
import { useCoreScreenView } from "@/lib/analytics";

/* ────────────────────────────────────────────────────────────────────────
   Crest system
   ──────────────────────────────────────────────────────────────────────── */
type BandName = "hex" | "shield" | "sunburst" | "radiant";
const TIER_BAND: BandName[] = ["hex", "hex", "hex", "shield", "shield", "shield", "sunburst", "sunburst", "radiant", "radiant"];

function GlyphFor({ name }: { name: string }) {
  switch (name) {
    case "Iron":
      return <Path d="M50 32 L60 50 L50 68 L40 50 Z" />;
    case "Bronze":
      return (
        <>
          <Path d="M34 36 L66 36 L60 64 L40 64 Z" />
          <Path d="M40 44 L60 44" stroke="rgba(0,0,0,0.18)" strokeWidth={1.5} fill="none" />
        </>
      );
    case "Silver":
      return (
        <>
          <Path d="M50 30 L68 50 L50 70 L32 50 Z" />
          <Circle cx="50" cy="50" r={5} fill="rgba(255,255,255,0.5)" />
        </>
      );
    case "Gold":
      return <Path d="M50 30 L55 44 L70 45 L59 54 L62 68 L50 60 L38 68 L41 54 L30 45 L45 44 Z" />;
    case "Emerald":
      return (
        <>
          <Path d="M40 32 L60 32 L68 50 L60 68 L40 68 L32 50 Z" />
          <Path d="M40 32 L50 50 L40 68 M60 32 L50 50 L60 68" stroke="rgba(0,0,0,0.18)" strokeWidth={1} fill="none" />
        </>
      );
    case "Platinum":
      return (
        <>
          <Path d="M50 26 L57 40 L72 42 L61 52 L64 67 L50 60 L36 67 L39 52 L28 42 L43 40 Z" />
          <Circle cx="50" cy="52" r={3} fill="rgba(255,255,255,0.55)" />
        </>
      );
    case "Diamond":
      return (
        <>
          <Path d="M50 28 L70 46 L60 70 L40 70 L30 46 Z" />
          <Path d="M50 28 L40 46 L50 70 L60 46 Z" fill="rgba(255,255,255,0.18)" />
        </>
      );
    case "Master":
      return (
        <>
          <Path d="M50 26 L58 38 L72 40 L62 50 L65 66 L50 58 L35 66 L38 50 L28 40 L42 38 Z" />
          <Circle cx="50" cy="50" r={7} fill="rgba(0,0,0,0.18)" />
          <Circle cx="50" cy="50" r={3} fill="rgba(255,255,255,0.6)" />
        </>
      );
    case "Grandmaster":
      return <Path d="M50 26 L56 38 L70 36 L65 48 L76 56 L62 58 L60 72 L50 64 L40 72 L38 58 L24 56 L35 48 L30 36 L44 38 Z" />;
    case "Legend":
      return (
        <>
          <Path d="M50 22 L57 34 L72 30 L66 44 L80 50 L66 56 L72 70 L57 66 L50 78 L43 66 L28 70 L34 56 L20 50 L34 44 L28 30 L43 34 Z" />
          <Circle cx="50" cy="50" r={5} fill="rgba(255,255,255,0.55)" />
        </>
      );
    default:
      return <Circle cx="50" cy="50" r={14} />;
  }
}

function Crest({ rank, size, dim }: { rank: Rank & { idx?: number }; size: number; dim?: boolean }) {
  const idx = typeof rank.idx === "number" ? rank.idx : GAME_RANKS.findIndex((r) => r.name === rank.name);
  const band = TIER_BAND[idx] || "hex";
  const fid = `cf_${rank.name}_${size}`;
  const sid = `cs_${rank.name}_${size}`;
  const fieldOp = dim ? 0.35 : 1;
  const specOp = dim ? 0.1 : 0.32;
  const ringColor = dim ? "rgba(255,255,255,0.10)" : rank.glow;
  const ringStroke = band === "sunburst" || band === "radiant" ? 1.4 : 2;
  const glyphFill = dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.94)";

  return (
    <View
      style={{
        shadowColor: dim ? "transparent" : rank.glow,
        shadowOpacity: dim ? 0 : 0.6,
        shadowRadius: size > 80 ? 18 : 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: dim ? 0 : 12,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <SvgLG id={fid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={rank.c1} stopOpacity={fieldOp} />
            <Stop offset="1" stopColor={rank.c2} stopOpacity={fieldOp} />
          </SvgLG>
          <SvgRG id={sid} cx="0.4" cy="0.3" rx="0.5" ry="0.5">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={specOp} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </SvgRG>
        </Defs>

        {band === "radiant" && !dim && (
          <Circle cx="50" cy="50" r={44} fill="none" stroke={rank.glow} strokeWidth={0.6} strokeDasharray="2,3" opacity={0.55} />
        )}

        {/* Outer ring */}
        {band === "hex" && (
          <Polygon points="50,4 88,26 88,74 50,96 12,74 12,26" fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinejoin="round" />
        )}
        {band === "shield" && (
          <Path d="M14 14 L86 14 L86 56 Q86 80 50 96 Q14 80 14 56 Z" fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinejoin="round" />
        )}
        {band === "sunburst" && (
          <Path
            d="M50 4 L56 30 L80 14 L68 36 L94 42 L72 50 L94 58 L68 64 L80 86 L56 70 L50 96 L44 70 L20 86 L32 64 L6 58 L28 50 L6 42 L32 36 L20 14 L44 30 Z"
            fill="none"
            stroke={ringColor}
            strokeWidth={ringStroke}
            strokeLinejoin="round"
          />
        )}
        {band === "radiant" && (
          <Path
            d="M50 2 L57 22 L77 10 L70 32 L92 26 L80 46 L98 50 L80 54 L92 74 L70 68 L77 90 L57 78 L50 98 L43 78 L23 90 L30 68 L8 74 L20 54 L2 50 L20 46 L8 26 L30 32 L23 10 L43 22 Z"
            fill="none"
            stroke={ringColor}
            strokeWidth={ringStroke}
            strokeLinejoin="round"
          />
        )}

        {/* Field */}
        {band === "hex" && <Polygon points="50,12 80,28 80,72 50,88 20,72 20,28" fill={`url(#${fid})`} />}
        {band === "shield" && <Path d="M22 22 L78 22 L78 56 Q78 76 50 88 Q22 76 22 56 Z" fill={`url(#${fid})`} />}
        {band === "sunburst" && <Circle cx="50" cy="50" r={28} fill={`url(#${fid})`} />}
        {band === "radiant" && <Circle cx="50" cy="50" r={26} fill={`url(#${fid})`} />}

        {/* Specular */}
        <Ellipse cx="42" cy="34" rx="22" ry="14" fill={`url(#${sid})`} />

        {/* Bezel */}
        {band === "hex" && (
          <Polygon points="50,15 78,29 78,71 50,85 22,71 22,29" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} strokeLinejoin="round" />
        )}
        {band === "shield" && (
          <Path d="M25 24 L75 24 L75 56 Q75 74 50 85 Q25 74 25 56 Z" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} strokeLinejoin="round" />
        )}
        {band === "sunburst" && <Circle cx="50" cy="50" r={26} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} />}
        {band === "radiant" && <Circle cx="50" cy="50" r={24} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} />}

        {/* Glyph */}
        <G fill={glyphFill}>
          <GlyphFor name={rank.name} />
        </G>
      </Svg>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Reward registry
   ──────────────────────────────────────────────────────────────────────── */
type RewardIcon = "check" | "snowflake" | "sparkle" | "user" | "send" | "shield" | "gift" | "compass" | "flag" | "crown";
const TIER_REWARDS: Record<string, { icon: RewardIcon; text: string }> = {
  Iron: { icon: "check", text: "Honest logging unlocked" },
  Bronze: { icon: "snowflake", text: "+1 streak freeze / week" },
  Silver: { icon: "sparkle", text: "Coach insights on dashboard" },
  Gold: { icon: "user", text: "Custom profile icons · 50% off Shop" },
  Emerald: { icon: "send", text: "Post to feed · advanced sections" },
  Platinum: { icon: "shield", text: "+2 freezes · daily Coach tips" },
  Diamond: { icon: "gift", text: "Send gifts to friends · rank crown" },
  Master: { icon: "compass", text: "Mentor mode · help newer members" },
  Grandmaster: { icon: "flag", text: "Founder badge · early features" },
  Legend: { icon: "crown", text: "All cosmetics · forever free Shop" },
};

function RewardIconSvg({ name, color }: { name: RewardIcon; color: string }) {
  const props = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "check":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M5 12l5 5L19 7" {...props} />
        </Svg>
      );
    case "snowflake":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" {...props} />
        </Svg>
      );
    case "sparkle":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" {...props} />
        </Svg>
      );
    case "user":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Circle cx="12" cy="8" r={4} {...props} />
          <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" {...props} />
        </Svg>
      );
    case "send":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" {...props} />
        </Svg>
      );
    case "shield":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 3l8 3v5c0 5-3 9-8 11-5-2-8-6-8-11V6z" {...props} />
        </Svg>
      );
    case "gift":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M3 8h18v13H3zM12 8v13M3 12h18M7 8a3 3 0 1 1 5-2 3 3 0 1 1 5 2" {...props} />
        </Svg>
      );
    case "compass":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r={9} {...props} />
          <Path d="M16 8l-3 7-5 1 3-7z" {...props} />
        </Svg>
      );
    case "flag":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M4 22V4l14 4-14 6" {...props} />
        </Svg>
      );
    case "crown":
      return (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M3 8l4 5 5-7 5 7 4-5-2 13H5z" {...props} />
        </Svg>
      );
  }
}

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
            const rew = TIER_REWARDS[r.name];
            const xpRange = r.max === Infinity ? `${r.min.toLocaleString()}+ XP` : `${r.min.toLocaleString()} – ${r.max.toLocaleString()} XP`;
            const toEnter = Math.max(0, r.min - xp);
            const prevMin = i > 0 ? GAME_RANKS[i - 1].min : 0;
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
