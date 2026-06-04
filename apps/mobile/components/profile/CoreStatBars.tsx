/**
 * CoreStatBars — the six RPG Core Stats as labelled progress bars with animated
 * fills + count-up, mirroring previews/23-profile.html. Tapping a bar opens a
 * detail sheet (value, blurb, how-to-raise tip).
 *
 * Note: the app has no per-stat history yet (game-state tracks xpLedger, not a
 * statLedger), so the sheet shows an honest empty "recent activity" state rather
 * than fabricating one. Wire a statLedger into game-state to populate it.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { CoreStat } from "@/lib/core-stats";
import type { StatLedgerEntry } from "@/stores/game-state-store";

function prettyReason(r: string): string {
  const base = r.startsWith("slip_") ? r.slice(5) : r;
  return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function relTime(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Bar({ item, onPress }: { item: CoreStat; onPress: (s: CoreStat) => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [disp, setDisp] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisp(Math.round(value * item.value)));
    Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [item.value]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${item.value}%`] });

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [s.row, { borderColor: item.color + "33" }, pressed && { transform: [{ scale: 0.985 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} ${item.value} of 100`}
    >
      <View style={[s.iconWrap, { backgroundColor: item.color + "26", borderColor: item.color + "52" }]}>
        <Text style={s.emoji}>{item.emoji}</Text>
      </View>
      <View style={s.mid}>
        <Text style={s.name}>{item.name}</Text>
        <View style={s.track}>
          <Animated.View style={[s.fill, { width, backgroundColor: item.color }]} />
        </View>
      </View>
      <Text style={[s.value, { color: item.color }]}>{disp}</Text>
    </Pressable>
  );
}

function DetailSheet({ stat, entries, onClose }: { stat: CoreStat | null; entries: StatLedgerEntry[]; onClose: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (stat) Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }).start();
    else anim.setValue(0);
  }, [stat]);
  if (!stat) return null;
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${stat.value}%`] });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={d.scrim} onPress={onClose} />
      <View style={d.sheet}>
        <View style={d.grab} />
        <View style={d.head}>
          <View style={[d.iconWrap, { backgroundColor: stat.color + "26", borderColor: stat.color + "52" }]}>
            <Text style={d.emoji}>{stat.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={d.name}>{stat.name}</Text>
            <Text style={d.sub}>Core Stat · {stat.value} / 100</Text>
          </View>
          <Text style={[d.big, { color: stat.color }]}>{stat.value}</Text>
        </View>
        <View style={d.track}>
          <Animated.View style={[d.fill, { width, backgroundColor: stat.color }]} />
        </View>
        <Text style={d.blurb}>{stat.blurb}</Text>
        <View style={[d.tip, { backgroundColor: stat.color + "17", borderColor: stat.color + "38" }]}>
          <Text style={d.tipText}>{stat.tip}</Text>
        </View>
        <Text style={d.logHead}>Recent activity</Text>
        {entries.length ? (
          entries.slice(0, 6).map((e, i) => {
            const up = e.delta > 0;
            return (
              <View key={`${e.ts}-${i}`} style={d.logRow}>
                <Text style={[d.logDelta, { color: up ? "#34D399" : "#FF6B6B" }]}>{up ? `+${e.delta}` : e.delta}</Text>
                <Text style={d.logName} numberOfLines={1}>{prettyReason(e.reason)}</Text>
                <Text style={d.logWhen}>{relTime(e.ts)}</Text>
              </View>
            );
          })
        ) : (
          <View style={d.empty}>
            <Text style={d.emptyText}>No activity yet — complete {stat.name} quests to raise this stat.</Text>
          </View>
        )}
        <Pressable style={d.close} onPress={onClose}>
          <Text style={d.closeText}>Got it</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function CoreStatBars({ items, ledger = [] }: { items: CoreStat[]; ledger?: StatLedgerEntry[] }) {
  const [active, setActive] = useState<CoreStat | null>(null);
  const entries = active?.model ? ledger.filter((e) => e.stat === active.model) : [];
  return (
    <View style={{ gap: 9 }}>
      {items.map((it) => (
        <Bar key={it.key} item={it} onPress={setActive} />
      ))}
      <DetailSheet stat={active} entries={entries} onClose={() => setActive(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 18 },
  mid: { flex: 1, minWidth: 0 },
  name: { color: "#F8FAFE", fontSize: 13, fontWeight: "800" },
  track: { height: 7, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.42)", overflow: "hidden", marginTop: 7 },
  fill: { height: "100%", borderRadius: 999 },
  value: { fontSize: 17, fontWeight: "900", minWidth: 30, textAlign: "right" },
});

const d = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(2,3,10,0.72)" },
  sheet: {
    backgroundColor: "#0B0D18",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  grab: { width: 38, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 13 },
  iconWrap: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 22 },
  name: { color: "#F8FAFE", fontSize: 19, fontWeight: "900" },
  sub: { color: "#9AA1B7", fontSize: 12, fontWeight: "700", marginTop: 2, letterSpacing: 0.4 },
  big: { fontSize: 34, fontWeight: "900" },
  track: { height: 9, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.42)", overflow: "hidden", marginTop: 16, marginBottom: 14 },
  fill: { height: "100%", borderRadius: 999 },
  blurb: { color: "#F8FAFE", fontSize: 14, fontWeight: "600", lineHeight: 21 },
  tip: { marginTop: 13, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1 },
  tipText: { color: "#C7CEDC", fontSize: 12.5, fontWeight: "600", lineHeight: 18 },
  logHead: { color: "#4F5570", fontSize: 11, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase", marginTop: 18, marginBottom: 9 },
  empty: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  emptyText: { color: "#9AA1B7", fontSize: 12.5, fontWeight: "600", textAlign: "center" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 7,
  },
  logDelta: { minWidth: 38, textAlign: "center", fontSize: 13, fontWeight: "900" },
  logName: { flex: 1, minWidth: 0, color: "#F8FAFE", fontSize: 12.5, fontWeight: "700" },
  logWhen: { color: "#4F5570", fontSize: 11, fontWeight: "700" },
  close: { marginTop: 18, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#F8FAFE", fontSize: 14, fontWeight: "800" },
});
