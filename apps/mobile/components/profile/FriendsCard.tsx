/**
 * FriendsCard — friend count summary + add-by-code. Real friends via
 * friends-store (Supabase RPCs). When signed out, prompts sign-in instead.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path } from "react-native-svg";

import { useFriendsStore } from "@/stores/friends-store";
import { useAuthStore } from "@/stores/auth-store";
import type { FriendCard } from "@/lib/player-card";

// Core Stat fields (from list_friend_cards, migration 0006) → bar colours.
const STAT_FIELDS: { key: keyof FriendCard; color: string }[] = [
  { key: "strength", color: "#FF6B6B" },
  { key: "focus", color: "#4A8FFF" },
  { key: "wealth", color: "#FFC56B" },
  { key: "health", color: "#34D399" },
  { key: "social", color: "#B388FF" },
  { key: "purpose", color: "#5EEAD4" },
];

function FriendRow({ f }: { f: FriendCard }) {
  const hasStats = STAT_FIELDS.some(({ key }) => typeof f[key] === "number");
  return (
    <View style={s.fr}>
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
    </View>
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
            <FriendRow key={f.id} f={f} />
          ))}
        </View>
      )}

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
