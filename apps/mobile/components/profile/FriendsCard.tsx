/**
 * FriendsCard — friend count summary + add-by-code. Real friends via
 * friends-store (Supabase RPCs). When signed out, prompts sign-in instead.
 */
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path } from "react-native-svg";

import { useFriendsStore } from "@/stores/friends-store";
import { useAuthStore } from "@/stores/auth-store";
import type { FriendCard } from "@/lib/player-card";

// Core Stat fields (from list_friend_cards, migration 0006) → label + bar colour.
const STAT_FIELDS: { key: keyof FriendCard; name: string; emoji: string; color: string }[] = [
  { key: "strength", name: "Strength", emoji: "⚔️", color: "#FF6B6B" },
  { key: "focus", name: "Focus", emoji: "🧠", color: "#4A8FFF" },
  { key: "wealth", name: "Wealth", emoji: "💰", color: "#FFC56B" },
  { key: "health", name: "Health", emoji: "❤️", color: "#34D399" },
  { key: "social", name: "Social", emoji: "👥", color: "#B388FF" },
  { key: "purpose", name: "Purpose", emoji: "🎯", color: "#5EEAD4" },
];

function FriendRow({ f, onPress }: { f: FriendCard; onPress: (f: FriendCard) => void }) {
  const hasStats = STAT_FIELDS.some(({ key }) => typeof f[key] === "number");
  return (
    <Pressable onPress={() => onPress(f)} style={({ pressed }) => [s.fr, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={s.frTop}>
        <Text style={s.frName} numberOfLines={1}>{f.display_name ?? f.player_id}</Text>
        <Text style={s.frMeta}>Lv {f.level} · {f.power.toLocaleString()}⚡</Text>
      </View>
      {hasStats && (
        <View style={s.strip}>
          {STAT_FIELDS.map(({ key, color }) => (
            <View key={String(key)} style={{ flex: Math.max(1, (f[key] as number) ?? 0), height: 6, borderRadius: 999, backgroundColor: color }} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

function FriendStatSheet({ friend, onClose }: { friend: FriendCard | null; onClose: () => void }) {
  if (!friend) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fs.scrim} onPress={onClose} />
      <View style={fs.sheet}>
        <View style={fs.grab} />
        <Text style={fs.name} numberOfLines={1}>{friend.display_name ?? friend.player_id}</Text>
        <Text style={fs.meta}>{friend.player_id} · Lv {friend.level} · {friend.power.toLocaleString()} Power</Text>
        <View style={{ gap: 9, marginTop: 16 }}>
          {STAT_FIELDS.map(({ key, name, emoji, color }) => {
            const v = (friend[key] as number) ?? 0;
            return (
              <View key={String(key)} style={fs.row}>
                <Text style={fs.emoji}>{emoji}</Text>
                <Text style={fs.statName}>{name}</Text>
                <View style={fs.track}>
                  <View style={{ width: `${v}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
                </View>
                <Text style={[fs.val, { color }]}>{v}</Text>
              </View>
            );
          })}
        </View>
        <Pressable style={fs.close} onPress={onClose}>
          <Text style={fs.closeTxt}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function FriendsCard() {
  const userId = useAuthStore((s) => s.userId);
  const friends = useFriendsStore((s) => s.friends);
  const pending = useFriendsStore((s) => s.pending);
  const addByCode = useFriendsStore((s) => s.addByCode);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeFriend, setActiveFriend] = useState<FriendCard | null>(null);

  if (!userId) {
    return (
      <Pressable style={s.signin} onPress={() => router.push("/(auth)/sign-in")} accessibilityRole="button">
        <Text style={s.signinTitle}>Sign in to add friends</Text>
        <Text style={s.signinSub}>Sync your profile and connect by Player ID.</Text>
      </Pressable>
    );
  }

  const onAdd = async () => {
    if (busy || !code.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    setMsg(null);
    const res = await addByCode(code);
    if (res.ok) {
      setMsg({ ok: true, text: `Request sent to ${res.card.display_name ?? res.card.player_id}` });
      setCode("");
    } else {
      setMsg({ ok: false, text: res.reason });
    }
    setBusy(false);
  };

  const count = friends.length;

  return (
    <View style={{ gap: 12 }}>
      <View style={s.summary}>
        <View style={s.iconBg}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle cx="9" cy="8" r={3.5} stroke="#6BA9FF" strokeWidth={1.8} fill="none" />
            <Path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M18 20a5.5 5.5 0 0 0-3-5" stroke="#6BA9FF" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.count}>{count} friend{count === 1 ? "" : "s"}</Text>
          <Text style={s.sub} numberOfLines={1}>
            {count
              ? friends.slice(0, 3).map((f) => f.display_name ?? f.player_id).join(", ")
              : pending.length
                ? `${pending.length} pending`
                : "Add friends by their Player ID"}
          </Text>
        </View>
      </View>

      {friends.length > 0 && (
        <View style={{ gap: 8 }}>
          {friends.map((f) => (
            <FriendRow key={f.id} f={f} onPress={setActiveFriend} />
          ))}
        </View>
      )}

      <FriendStatSheet friend={activeFriend} onClose={() => setActiveFriend(null)} />

      <View style={s.addRow}>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            if (msg) setMsg(null);
          }}
          placeholder="CORE-XXXX-XXXX"
          placeholderTextColor="rgba(255,255,255,0.30)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={14}
          returnKeyType="done"
          onSubmitEditing={onAdd}
          style={s.input}
          accessibilityLabel="Friend Player ID"
        />
        <Pressable
          onPress={onAdd}
          disabled={busy || !code.trim()}
          style={[s.addBtn, (busy || !code.trim()) && { opacity: 0.5 }]}
          accessibilityRole="button"
        >
          <Text style={s.addTxt}>{busy ? "…" : "Add"}</Text>
        </Pressable>
      </View>

      {msg && <Text style={[s.msg, { color: msg.ok ? "#34D399" : "#FF6B6B" }]}>{msg.text}</Text>}
    </View>
  );
}

const fs = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(2,3,10,0.72)" },
  sheet: { backgroundColor: "#0B0D18", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  grab: { width: 38, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 16 },
  name: { color: "#F8FAFE", fontSize: 19, fontWeight: "900" },
  meta: { color: "#9AA1B7", fontSize: 12, fontWeight: "700", marginTop: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  emoji: { fontSize: 17, width: 22, textAlign: "center" },
  statName: { width: 70, color: "#F8FAFE", fontSize: 12.5, fontWeight: "800" },
  track: { flex: 1, height: 7, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.42)", overflow: "hidden" },
  val: { width: 30, textAlign: "right", fontSize: 14, fontWeight: "900" },
  close: { marginTop: 20, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center" },
  closeTxt: { color: "#F8FAFE", fontSize: 14, fontWeight: "800" },
});

const s = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  iconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(74,143,255,0.12)", alignItems: "center", justifyContent: "center" },
  count: { color: "#F8FAFE", fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  sub: { color: "#9AA1B7", fontSize: 12, marginTop: 3 },

  fr: { padding: 12, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 9 },
  frTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  frName: { flex: 1, minWidth: 0, color: "#F8FAFE", fontSize: 13.5, fontWeight: "800" },
  frMeta: { color: "#9AA1B7", fontSize: 12, fontWeight: "700" },
  strip: { flexDirection: "row", gap: 3 },

  addRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, letterSpacing: 1, minHeight: 44 },
  addBtn: { paddingHorizontal: 20, borderRadius: 12, backgroundColor: "rgba(74,143,255,0.16)", borderWidth: 1, borderColor: "rgba(74,143,255,0.4)", alignItems: "center", justifyContent: "center", minWidth: 64, minHeight: 44 },
  addTxt: { color: "#6BA9FF", fontSize: 14, fontWeight: "700" },
  msg: { fontSize: 12, lineHeight: 17 },

  signin: { padding: 16, borderRadius: 16, backgroundColor: "rgba(74,143,255,0.06)", borderWidth: 1, borderColor: "rgba(74,143,255,0.24)" },
  signinTitle: { color: "#F8FAFE", fontSize: 15, fontWeight: "700" },
  signinSub: { color: "#9AA1B7", fontSize: 12, marginTop: 4 },
});
