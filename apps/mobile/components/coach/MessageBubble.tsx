/** A single chat bubble + timestamp. Coach = glassy left, user = blue right. */
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import type { ChatMessage } from "@/lib/ai/coach";
import { ACCENT, ACCENT_DEEP, clockLabel } from "./tokens";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View style={[s.wrap, isUser ? s.wrapUser : s.wrapCoach]}>
      {isUser ? (
        <LinearGradient
          colors={[ACCENT, ACCENT_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.bubble, s.userBubble]}
        >
          <Text style={[s.text, s.userText]}>{message.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[s.bubble, s.coachBubble]}>
          <Text style={[s.text, s.coachText]}>{message.text}</Text>
        </View>
      )}
      <Text style={[s.time, isUser ? s.timeUser : s.timeCoach]}>{clockLabel(message.ts)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { maxWidth: "82%", marginBottom: 12 },
  wrapCoach: { alignSelf: "flex-start", alignItems: "flex-start" },
  wrapUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18 },
  coachBubble: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderBottomLeftRadius: 6,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontSize: 14, lineHeight: 20, letterSpacing: -0.1 },
  coachText: { color: "#F5F7FB" },
  userText: { color: "#fff" },
  time: { fontSize: 10, color: "#4A5060", marginTop: 4, letterSpacing: 0.4 },
  timeCoach: { marginLeft: 6 },
  timeUser: { marginRight: 6 },
});
