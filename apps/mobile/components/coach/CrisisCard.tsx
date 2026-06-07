/**
 * Crisis resources card — a non-AI safety net shown when the user's message
 * signals self-harm or a mental-health crisis (see detectCrisis in lib/ai/coach).
 *
 * This is deliberately model-independent: even if the Coach model is offline or
 * rate-limited, the user still gets real human-help numbers. Tapping a button
 * opens the dialer — the OS shows its own call confirmation, so nothing is
 * dialled automatically (consistent with the confirmation-gated, no-autonomous-
 * action stance).
 */
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

type Resource = { label: string; sub: string; tel: string };

// AU-first (CORE's launch market), with the US line and emergency number too.
const RESOURCES: Resource[] = [
  { label: "Call Lifeline", sub: "13 11 14 · Australia, 24/7", tel: "tel:131114" },
  { label: "Call 988", sub: "Suicide & Crisis Lifeline · US", tel: "tel:988" },
  { label: "Emergency", sub: "000 (AU) · 911 (US) · 112 (EU)", tel: "tel:000" },
];

export function CrisisCard({ onDismiss }: { onDismiss: () => void }) {
  const call = (tel: string) => {
    Linking.openURL(tel).catch(() => {});
  };

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.title}>You're not alone</Text>
        <Pressable onPress={onDismiss} hitSlop={8} style={s.close}>
          <Text style={s.closeText}>×</Text>
        </Pressable>
      </View>
      <Text style={s.body}>
        I'm really glad you told me. If you're thinking about harming yourself, please reach out to someone right now — you deserve real support.
      </Text>
      <View style={{ gap: 8 }}>
        {RESOURCES.map((r) => (
          <Pressable
            key={r.tel}
            onPress={() => call(r.tel)}
            style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.btnLabel}>{r.label}</Text>
              <Text style={s.btnSub}>{r.sub}</Text>
            </View>
            <Text style={s.btnArrow}>›</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.foot}>And tell someone you trust. Coach is here too — but these people are trained for exactly this.</Text>
    </View>
  );
}

const DANGER = "#F87171";

const s = StyleSheet.create({
  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.40)",
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  close: { paddingHorizontal: 4 },
  closeText: { color: "#9AA1B7", fontSize: 20, lineHeight: 20 },
  body: { color: "#E6E9F0", fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 14 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
  },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  btnLabel: { color: DANGER, fontSize: 15, fontWeight: "700" },
  btnSub: { color: "#9AA1B7", fontSize: 11, marginTop: 2 },
  btnArrow: { color: DANGER, fontSize: 20, fontWeight: "700" },
  foot: { color: "#8A92A6", fontSize: 11, lineHeight: 16, marginTop: 12 },
});
