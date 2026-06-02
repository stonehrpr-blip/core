/**
 * Floating dev-only demo state bar for React Native.
 *
 * Mirrors the gallery.html toolbar — five presets plus reset.
 * Gated behind `__DEV__`, so it's stripped from production builds automatically.
 *
 * Drop into the root `_layout.tsx` like this:
 *
 *   {__DEV__ && <DemoStateBar />}
 */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { coreTrack } from "@/lib/analytics";

type Preset = "new" | "day3" | "expired" | "idle" | "sub";

export function DemoStateBar() {
  const [open, setOpen] = useState(false);
  const { signOut, setTrial, startTrial, setSubscriptionActive, touchLastSeen, completeOnboarding } = useAuthStore((s) => ({
    signOut: s.signOut,
    setTrial: s.setTrial,
    startTrial: s.startTrial,
    setSubscriptionActive: s.setSubscriptionActive,
    touchLastSeen: s.touchLastSeen,
    completeOnboarding: s.completeOnboarding,
  }));

  const apply = (p: Preset) => {
    void coreTrack("demo_state_set", { state: p });
    switch (p) {
      case "new":
        signOut();
        router.replace("/(auth)");
        break;
      case "day3":
        setTrial({ committed: true, name: "Stone", tone: "balanced", checkin: "both", trialStartedAt: new Date(Date.now() - 3 * 86400000).toISOString() });
        completeOnboarding();
        touchLastSeen();
        router.replace("/(tabs)");
        break;
      case "expired":
        setTrial({ committed: true, name: "Stone", tone: "balanced", checkin: "both", trialStartedAt: new Date(Date.now() - 10 * 86400000).toISOString() });
        completeOnboarding();
        setSubscriptionActive(false);
        router.replace("/(auth)/trial-expired");
        break;
      case "idle":
        setTrial({ committed: true, name: "Stone", tone: "balanced", checkin: "both", trialStartedAt: new Date(Date.now() - 5 * 86400000).toISOString() });
        completeOnboarding();
        // backdate last-seen by 5 days
        useAuthStore.setState({ lastSeenAt: new Date(Date.now() - 5 * 86400000).toISOString() });
        router.replace("/(auth)/welcome-back");
        break;
      case "sub":
        setTrial({ committed: true, name: "Stone", tone: "balanced", checkin: "both", trialStartedAt: new Date(Date.now() - 30 * 86400000).toISOString() });
        completeOnboarding();
        setSubscriptionActive(true);
        touchLastSeen();
        router.replace("/(tabs)");
        break;
    }
    setOpen(false);
  };

  return (
    <View pointerEvents="box-none" style={s.root}>
      <Pressable onPress={() => setOpen((o) => !o)} style={s.tab}>
        <View style={s.dot} />
        <Text style={s.tabTxt}>DEMO</Text>
      </Pressable>
      {open && (
        <View style={s.panel}>
          <Btn label="New user"             onPress={() => apply("new")} />
          <Btn label="Mid-trial · day 3"    onPress={() => apply("day3")} />
          <Btn label="Trial expired"        onPress={() => apply("expired")} />
          <Btn label="Returning · 5 d idle" onPress={() => apply("idle")} />
          <Btn label="Subscribed (paid)"    onPress={() => apply("sub")} />
          <View style={s.sep} />
          <Btn label="Sign out · reset"     ghost onPress={() => { signOut(); router.replace("/"); setOpen(false); }} />
        </View>
      )}
    </View>
  );
}

function Btn({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, ghost && s.btnGhost]}>
      <Text style={[s.btnTxt, ghost && s.btnTxtGhost]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { position: "absolute", right: 12, bottom: 90, zIndex: 9999 },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(10,10,20,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignSelf: "flex-end" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFD05C", shadowColor: "#FFD05C", shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  tabTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 2.4, color: "#FFD05C" },
  panel: { marginTop: 8, padding: 8, gap: 4, borderRadius: 14, backgroundColor: "rgba(10,10,20,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", minWidth: 200, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 24 },
  sep: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 },
  btn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  btnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  btnTxtGhost: { color: "#9AA1B7" },
});
