/**
 * RankGemCard — the profile player card. Rank-tinted glass, the SVG Crest gem
 * (pulsing) on a glow stage, a 4-stat bar, in-tier progress, and the current
 * tier's perk. An optional cosmetic frame ring (FRAMES[frame].sw) layers over
 * the rank glow.
 *
 * Animation budget: one Reanimated pulse on the gem only (matches ranks.tsx).
 */
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useEffect } from "react";

import { Crest, TIER_REWARDS, RewardIconSvg } from "@/components/Crest";
import { GAME_RANKS, type Rank } from "@/stores/game-state-store";
import { DEFAULT_FRAME, classLabel, frameSwatch } from "@/constants/cosmetics";

type RankInfo = Rank & { idx: number; tier: number; label: string; toNext: number };

export function RankGemCard(props: {
  rank: RankInfo;
  name: string;
  title: string;
  klass: string;
  playerId: string | null;
  level: number;
  xp: number;
  streakDays: number;
  power: number;
  frame: string;
  plus?: boolean;
}) {
  const { rank, name, title, klass, playerId, level, xp, streakDays, power, frame, plus } = props;
  const nextR = GAME_RANKS[rank.idx + 1] || null;
  const span = nextR ? nextR.min - rank.min : 1;
  const into = Math.max(0, xp - rank.min);
  const bandPct = nextR ? Math.max(4, Math.min(100, Math.round((into / span) * 100))) : 100;
  const frameSw = frameSwatch(frame);
  const hasFrame = frame !== DEFAULT_FRAME;
  const perk = TIER_REWARDS[rank.name];

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View
      style={[
        s.card,
        { borderColor: `${rank.glow}55`, shadowColor: rank.glow },
        hasFrame && { borderColor: frameSw, borderWidth: 2 },
      ]}
    >
      <LinearGradient
        colors={[`${rank.glow}1F`, "rgba(255,255,255,0.012)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* cosmetic frame inner ring */}
      {hasFrame && <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.frameRing, { borderColor: `${frameSw}66` }]} />}

      {/* Header */}
      <View style={s.crow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <Text style={[s.title, { color: rank.glow }]} numberOfLines={1}>{title}</Text>
          <Text style={s.klass} numberOfLines={1}>{classLabel(klass)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={s.pid}>{playerId ?? "CORE-····-····"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {plus && (
              <View style={s.plusPill}>
                <Text style={s.plusTxt}>PLUS</Text>
              </View>
            )}
            <View style={s.lvlChip}>
              <View style={[s.lvlDot, { backgroundColor: rank.glow }]} />
              <Text style={s.lvlTxt}>LVL {level}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Gem stage */}
      <View style={s.stage}>
        <View style={[s.halo, { backgroundColor: `${rank.glow}33`, shadowColor: rank.glow }]} />
        <Animated.View style={pulseStyle}>
          <Crest rank={rank} size={120} />
        </Animated.View>
      </View>

      <Text style={[s.rankBig, { textShadowColor: rank.glow }]}>{rank.name}</Text>
      <Text style={s.rankNext}>{nextR ? `Next: ${nextR.name}` : "Max rank"}</Text>

      {/* 4-stat bar */}
      <View style={s.sbar}>
        {[
          { v: level, k: "Level" },
          { v: xp.toLocaleString(), k: "XP" },
          { v: streakDays, k: "Streak" },
          { v: power.toLocaleString(), k: "Power" },
        ].map((cell) => (
          <View key={cell.k} style={s.scell}>
            <Text style={s.sv}>{cell.v}</Text>
            <Text style={s.sk}>{cell.k}</Text>
          </View>
        ))}
      </View>

      {/* In-tier progress */}
      <View style={s.progRow}>
        <Text style={s.progLabel}>{rank.name}</Text>
        <Text style={s.progLabel}>{rank.toNext === 0 ? "MAX" : `${rank.toNext.toLocaleString()} XP`}</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${bandPct}%`, backgroundColor: rank.glow, shadowColor: rank.glow }]} />
      </View>

      {/* Current perk */}
      {perk && (
        <View style={s.perkRow}>
          <View style={[s.perkIcon, { backgroundColor: `${rank.glow}22` }]}>
            <RewardIconSvg name={perk.icon} color={rank.glow} />
          </View>
          <Text style={s.perkText} numberOfLines={1}>{perk.text}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
    shadowOpacity: 0.35,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  frameRing: { borderRadius: 22, borderWidth: 1, margin: 3 },

  crow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: { color: "#F8FAFE", fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  title: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase", marginTop: 6 },
  klass: { color: "#4F5570", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 3 },
  pid: { color: "#9AA1B7", fontSize: 10, fontWeight: "700", letterSpacing: 0.4, fontVariant: ["tabular-nums"] },
  plusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "#8FB4FF" },
  plusTxt: { color: "#06122b", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  lvlChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  lvlDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  lvlTxt: { color: "#F8FAFE", fontSize: 11, fontWeight: "900" },

  stage: { height: 150, alignItems: "center", justifyContent: "center", marginTop: 8 },
  halo: { position: "absolute", width: 160, height: 160, borderRadius: 80, opacity: 0.55, shadowOpacity: 0.6, shadowRadius: 30 },

  rankBig: { color: "#F8FAFE", fontSize: 23, fontWeight: "900", letterSpacing: 0.4, textAlign: "center", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
  rankNext: { color: "#4F5570", fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center", marginTop: 6 },

  sbar: { flexDirection: "row", marginTop: 16, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 12 },
  scell: { flex: 1, alignItems: "center" },
  sv: { color: "#F8FAFE", fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },
  sk: { color: "#9AA1B7", fontSize: 9, letterSpacing: 1.2, marginTop: 4, fontWeight: "700", textTransform: "uppercase" },

  progRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, marginBottom: 6 },
  progLabel: { color: "#9AA1B7", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  track: { height: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },

  perkRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14, padding: 9, paddingHorizontal: 11, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  perkIcon: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  perkText: { color: "#F8FAFE", fontSize: 11.5, flex: 1, letterSpacing: 0.2 },
});
