/** Horizontally-scrolling quick-prompt chips above the composer. */
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

export function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      keyboardShouldPersistTaps="handled"
    >
      {suggestions.map((sugg) => (
        <Pressable
          key={sugg}
          onPress={() => onPick(sugg)}
          style={({ pressed }) => [s.chip, pressed && s.chipPressed]}
        >
          <Text style={s.chipText}>{sugg}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { gap: 6, paddingVertical: 6, paddingHorizontal: 2 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  chipPressed: { backgroundColor: "rgba(255,255,255,0.08)", transform: [{ scale: 0.97 }] },
  chipText: { color: "#8A92A6", fontSize: 12, fontWeight: "500", letterSpacing: -0.1 },
});
