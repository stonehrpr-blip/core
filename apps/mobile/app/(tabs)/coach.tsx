/**
 * Coach tab — a real, non-crashing chat screen.
 *
 * Replaces the dead tab (no coach.tsx + empty components/coach/). Ported in
 * look/tone from previews/_REVIEW_DELETE/39-coach.html (+ 40/41 craving) onto
 * the RN theme and shared patterns.
 *
 * SAFETY (Stone's standing preference): the Coach is confirmation-gated and
 * autonomous-action-free. Replies are text only — see lib/ai/coach.ts. The one
 * state mutation reachable from here (logging a slip) only runs on an explicit
 * user tap inside the SOS sheet.
 */
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

import { useAuthStore } from "@/stores/auth-store";
import { useGameStateStore } from "@/stores/game-state-store";
import { useCoreScreenView, coreTrack } from "@/lib/analytics";
import {
  getCoachReply,
  openingLine,
  statusLine,
  detectCrisis,
  SUGGESTIONS,
  type ChatMessage,
} from "@/lib/ai/coach";
import { loadHistory, saveHistory } from "@/lib/ai/coach-history";

import { CoachOrb } from "@/components/coach/CoachOrb";
import { MessageBubble } from "@/components/coach/MessageBubble";
import { TypingIndicator } from "@/components/coach/TypingIndicator";
import { SuggestionChips } from "@/components/coach/SuggestionChips";
import { InsightCards } from "@/components/coach/InsightCards";
import { PhysiqueScanCard } from "@/components/coach/PhysiqueScanCard";
import { CrisisCard } from "@/components/coach/CrisisCard";
import { CravingSOS } from "@/components/coach/CravingSOS";
import { ACCENT } from "@/components/coach/tokens";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `m${Date.now()}_${idCounter}`;
}

export default function Coach() {
  useCoreScreenView("coach");

  const tone = useAuthStore((s) => s.trial.tone);
  const name = useAuthStore((s) => s.trial.name || s.displayName || "");
  const logSlip = useGameStateStore((s) => s.logSlip);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ephemeral, non-persisted UI note (e.g. rate-limit). Auto-clears.
  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  };
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  // Restore the saved conversation; if none (or idle-reset), seed the opener.
  useEffect(() => {
    let alive = true;
    loadHistory().then((saved) => {
      if (!alive) return;
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        setMessages([
          {
            id: nextId(),
            role: "coach",
            text: openingLine(tone, name, new Date().getHours()),
            ts: Date.now(),
          },
        ]);
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
    // restore runs once on mount; tone/name read at that moment is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist after every change, once we've hydrated (so we never clobber the
  // saved history with the empty initial state).
  useEffect(() => {
    if (hydrated) saveHistory(messages);
  }, [messages, hydrated]);

  const scrollToEnd = () => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const sendMessage = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;

    const userMsg: ChatMessage = { id: nextId(), role: "user", text, ts: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setDraft("");
    setTyping(true);
    scrollToEnd();
    coreTrack("coach_msg_sent", { length: text.length });

    // Crisis safety net — surfaces real helplines immediately, independent of
    // (and before) any model reply, so support is never AI-dependent.
    if (detectCrisis(text)) {
      setCrisis(true);
      coreTrack("coach_crisis_resources_shown", {});
    }

    // Mimic the eventual async backend; the canned engine resolves immediately
    // so we add a short, human-feeling delay behind the typing indicator.
    // Live snapshot so the Coach can speak to the user's actual numbers.
    const gs = useGameStateStore.getState();
    const context = {
      name: name || undefined,
      lifeScore: gs.lifeScore(),
      streakDays: gs.streak.days,
      recoverableSlip: gs.isStreakRecoverable(),
      stats: gs.stats,
    };

    getCoachReply(history, tone, context)
      .then((result) => {
        setTimeout(() => {
          if (result.kind === "rate_limited") {
            // Don't fabricate a coach bubble — show a tiny ephemeral note.
            showNotice("Coach is catching up — try again in a sec.");
          } else {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: "coach", text: result.text, ts: Date.now() },
            ]);
          }
          setTyping(false);
          scrollToEnd();
        }, 650);
      })
      .catch(() => {
        // Never let the tab hang — always land a supportive reply.
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "coach", text: "I'm here. Tell me more.", ts: Date.now() },
        ]);
        setTyping(false);
        scrollToEnd();
      });
  };

  const openSOS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    coreTrack("coach_craving_opened", {});
    setSosOpen(true);
  };

  const pushCoach = (text: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role: "coach", text, ts: Date.now() }]);

  const handlePassed = () => {
    setSosOpen(false);
    coreTrack("craving_passed", {});
    pushCoach("That's the win. You rode the wave and it crashed — that's exactly how this gets easier. Proud of you.");
    scrollToEnd();
  };

  const handleSlipped = () => {
    setSosOpen(false);
    // Explicit user tap = the confirmation. Honest logging feeds willpower back.
    logSlip("vape");
    coreTrack("craving_slipped_honest", {});
    pushCoach("Thank you for being honest — that took more strength than pretending it didn't happen. I logged it. No lecture. Walk me through the trigger when you're ready.");
    scrollToEnd();
  };

  const canSend = draft.trim().length > 0 && !typing;

  return (
    <View style={{ flex: 1, backgroundColor: "#02020A" }}>
      <LinearGradient colors={["#051026", "#02020A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={s.header}>
          <CoachOrb size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.coachName}>Coach</Text>
            <View style={s.statusRow}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>{statusLine(tone)}</Text>
            </View>
          </View>
          <Pressable onPress={openSOS} style={({ pressed }) => [s.sosBtn, pressed && { opacity: 0.85 }]}>
            <Text style={s.sosText}>SOS</Text>
          </Pressable>
        </View>

        {/* Pinned crisis resources — stays visible regardless of scroll. */}
        {crisis && (
          <View style={s.crisisPin}>
            <CrisisCard onDismiss={() => setCrisis(false)} />
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          {/* Chat */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.chat}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
          >
            <InsightCards />
            <PhysiqueScanCard />
            <Text style={s.dayDivider}>TODAY</Text>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {typing && <TypingIndicator />}
            {notice && (
              <View style={s.notice}>
                <Text style={s.noticeText}>{notice}</Text>
              </View>
            )}
          </ScrollView>

          {/* Composer */}
          <View style={s.composer}>
            <SuggestionChips suggestions={SUGGESTIONS} onPick={(t) => sendMessage(t)} />
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Tell Coach something..."
                placeholderTextColor="#4A5060"
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(draft)}
                blurOnSubmit
              />
              <Pressable
                onPress={() => sendMessage(draft)}
                disabled={!canSend}
                style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
              >
                <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12l14-7-5 14-2-6-7-1z" />
                </Svg>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CravingSOS
        visible={sosOpen}
        tone={tone}
        onClose={() => setSosOpen(false)}
        onPassed={handlePassed}
        onSlipped={handleSlipped}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  coachName: { color: "#F5F7FB", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
    shadowColor: "#34D399",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: { color: "#8A92A6", fontSize: 11 },
  sosBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.40)",
  },
  sosText: { color: "#F87171", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  chat: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16 },
  dayDivider: {
    color: "#4A5060",
    fontSize: 10,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 14,
    fontWeight: "600",
  },
  notice: {
    alignSelf: "center",
    marginTop: 2,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  noticeText: { color: "#8A92A6", fontSize: 11, fontWeight: "500" },
  crisisPin: { paddingHorizontal: 18, paddingTop: 4 },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    color: "#F5F7FB",
    fontSize: 15,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 8 : 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  sendBtnDisabled: { backgroundColor: "rgba(255,255,255,0.08)", shadowOpacity: 0 },
});
