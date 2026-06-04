/**
 * Profile tab — RN parity with previews/23-profile.html.
 *
 * Player rank-gem card → share → current perks → customise (editable title/frame)
 * → stats → settings → friends. Wired to game-state (live) + profile-sync /
 * friends stores (Supabase). Inventory & achievements are deferred (see plan
 * Phase 6) so nothing here shows fabricated data.
 */
import { useEffect } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

import { useAuthStore } from "@/stores/auth-store";
import { useGameStateStore } from "@/stores/game-state-store";
import { useProfileSyncStore } from "@/stores/profile-sync-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useCoreScreenView } from "@/lib/analytics";
import { levelFor } from "@/lib/player-card";

import { RankGemCard } from "@/components/profile/RankGemCard";
import { StatGrid, type StatCell } from "@/components/profile/StatGrid";
import { CoreStatBars } from "@/components/profile/CoreStatBars";
import { coreStats } from "@/lib/core-stats";
import { PerksList } from "@/components/profile/PerksList";
import { CustomiseChips } from "@/components/profile/CustomiseChips";
import { FriendsCard } from "@/components/profile/FriendsCard";

function Section({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.sec}>
      <Text style={s.secH}>{title}</Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={s.secA}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Profile() {
  useCoreScreenView("profile");

  const userId = useAuthStore((s) => s.userId);
  const trialName = useAuthStore((s) => s.trial.name);
  const displayName = useAuthStore((s) => s.displayName);
  const name = trialName || displayName || "Player";
  const xp = useGameStateStore((s) => s.xp);
  const statsObj = useGameStateStore((s) => s.stats);
  const streak = useGameStateStore((s) => s.streak);
  const xpLedger = useGameStateStore((s) => s.xpLedger);
  const rank = useGameStateStore((s) => s.rankFor());
  const lifeScore = useGameStateStore((s) => s.lifeScore());

  const playerId = useProfileSyncStore((s) => s.playerId);
  const title = useProfileSyncStore((s) => s.title);
  const frame = useProfileSyncStore((s) => s.frame);
  const klass = useProfileSyncStore((s) => s.class);
  const power = useProfileSyncStore((s) => s.power());

  const friendCount = useFriendsStore((s) => s.friends.length);

  // Keep synced data fresh when the screen mounts / session changes.
  useEffect(() => {
    if (!userId) return;
    useProfileSyncStore.getState().hydrate();
    useFriendsStore.getState().refresh();
  }, [userId]);

  const level = levelFor(xp);
  const questsDone = xpLedger.filter((e) => (e.reason || "").toLowerCase().includes("quest")).length;
  const core = coreStats(statsObj, { friends: friendCount, streakDays: streak.days });

  const stats: StatCell[] = [
    { label: "Total XP", value: xp },
    { label: "Level", value: level },
    { label: "Rank", value: rank.name },
    { label: "Power", value: power },
    { label: "Streak", value: streak.days },
    { label: "Life Score", value: lifeScore },
    { label: "Friends", value: friendCount },
    { label: "Quests", value: questsDone },
  ];

  const onShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = playerId ?? "(sign in to get your Player ID)";
    try {
      await Share.share({
        message: `Add me on CORE: ${id} — ${rank.name}, Level ${level}, ${power.toLocaleString()} Power.`,
      });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#0A0820", "#02020A", "#050510"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[`${rank.glow}1A`, "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={s.h1}>Profile</Text>
            <Text style={s.power}>CORE Power {power.toLocaleString()}</Text>
          </View>

          <RankGemCard
            rank={rank}
            name={name}
            title={title}
            klass={klass}
            playerId={playerId}
            level={level}
            xp={xp}
            streakDays={streak.days}
            power={power}
            frame={frame}
          />

          <Pressable onPress={onShare} style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel="Share my card">
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M18 8a3 3 0 1 0-2.83-4M6 12a3 3 0 1 0 0 0M18 16a3 3 0 1 0-2.83 4M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" stroke="#6BA9FF" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={s.shareTxt}>Share my card</Text>
          </Pressable>

          <Section title="Core Stats" />
          <CoreStatBars items={core} />

          <Section title="Current perks" />
          <PerksList currentIdx={rank.idx} />

          <Section title="Customise" />
          <CustomiseChips />

          <Section title="Stats" />
          <StatGrid items={stats} />

          <Section title="Settings" />
          <Pressable style={s.setRow} onPress={() => router.push("/settings" as never)} accessibilityRole="button">
            <View style={s.setIcon}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="#6BA9FF" strokeWidth={1.7} fill="none" />
                <Path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 2h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 22h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12Z" stroke="#6BA9FF" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.setTitle}>Profile settings</Text>
              <Text style={s.setSub}>Account, privacy, notifications</Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M9 6l6 6-6 6" stroke="#4F5570" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          <Section title="Friends" />
          <FriendsCard />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 2, paddingBottom: 14 },
  h1: { color: "#F8FAFE", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  power: { color: "#9AA1B7", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },

  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, paddingVertical: 13, borderRadius: 14, backgroundColor: "rgba(74,143,255,0.10)", borderWidth: 1, borderColor: "rgba(74,143,255,0.32)" },
  shareTxt: { color: "#6BA9FF", fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },

  sec: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 11, paddingHorizontal: 2 },
  secH: { color: "#9AA1B7", fontSize: 12.5, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase" },
  secA: { color: "#4A8FFF", fontSize: 12, fontWeight: "700" },

  setRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  setIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: "rgba(74,143,255,0.12)", alignItems: "center", justifyContent: "center" },
  setTitle: { color: "#F8FAFE", fontSize: 15, fontWeight: "700" },
  setSub: { color: "#9AA1B7", fontSize: 12, marginTop: 3 },
});
