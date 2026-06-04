/**
 * CustomiseChips — the editable surface. Title + profile-frame pickers that
 * write through profile-sync-store (optimistic local + debounced Supabase push).
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { TITLES, FRAME_KEYS, frameSwatch } from "@/constants/cosmetics";
import { useProfileSyncStore } from "@/stores/profile-sync-store";

export function CustomiseChips() {
  const title = useProfileSyncStore((s) => s.title);
  const frame = useProfileSyncStore((s) => s.frame);
  const setTitle = useProfileSyncStore((s) => s.setTitle);
  const setFrame = useProfileSyncStore((s) => s.setFrame);

  const pickTitle = (t: string) => {
    Haptics.selectionAsync();
    setTitle(t);
  };
  const pickFrame = (f: string) => {
    Haptics.selectionAsync();
    setFrame(f);
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.label}>Title</Text>
        <View style={s.chips}>
          {TITLES.map((t) => {
            const on = t === title;
            return (
              <Pressable
                key={t}
                onPress={() => pickTitle(t)}
                style={[s.chip, on && s.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={s.label}>Profile frame</Text>
        <View style={s.chips}>
          {FRAME_KEYS.map((f) => {
            const on = f === frame;
            const sw = frameSwatch(f);
            return (
              <Pressable
                key={f}
                onPress={() => pickFrame(f)}
                style={[s.chip, s.frameChip, on && { borderColor: sw, backgroundColor: `${sw}22` }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <View style={[s.swatch, { backgroundColor: sw }]} />
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{f}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: "#9AA1B7", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 40,
    justifyContent: "center",
  },
  chipOn: { borderColor: "#4A8FFF", backgroundColor: "rgba(74,143,255,0.14)" },
  frameChip: { flexDirection: "row", alignItems: "center", gap: 7 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  chipTxt: { color: "#9AA1B7", fontSize: 13, fontWeight: "600" },
  chipTxtOn: { color: "#F8FAFE" },
});
