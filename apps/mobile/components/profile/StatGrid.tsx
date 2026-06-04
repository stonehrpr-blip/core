/**
 * StatGrid — 4×2 grid of profile stat cells. Only fed values that have a real
 * RN data source (no fabricated zeros for inventory/chests — those are deferred,
 * see plan Phase 6).
 */
import { StyleSheet, Text, View } from "react-native";

export type StatCell = { label: string; value: string | number };

export function StatGrid({ items }: { items: StatCell[] }) {
  return (
    <View style={s.grid}>
      {items.map((it) => (
        <View key={it.label} style={s.cell}>
          <Text style={s.value}>{typeof it.value === "number" ? it.value.toLocaleString() : it.value}</Text>
          <Text style={s.label}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: "47.5%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  value: { color: "#F8FAFE", fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  label: { color: "#9AA1B7", fontSize: 10, letterSpacing: 1.2, marginTop: 5, fontWeight: "700", textTransform: "uppercase" },
});
