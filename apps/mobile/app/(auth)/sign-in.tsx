/**
 * Email-OTP sign-in. Two steps: email → 6-digit code. Establishes a real
 * Supabase session (see lib/auth-session.ts), which is what unlocks profile +
 * friends sync. New emails create an account; existing emails sign in.
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

import { sendOtp, verifyOtp, isValidEmail } from "@/lib/auth-otp";
import { useAuthStore } from "@/stores/auth-store";

export default function SignIn() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const onboardedAt = useAuthStore((s) => s.onboardedAt);

  const onSend = async () => {
    if (!isValidEmail(email) || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email);
      setStep("code");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (code.trim().length < 6 || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email, code);
      // onAuthStateChange (lib/auth-session) populates userId + hydrates sync.
      if (!onboardedAt) completeOnboarding();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? "That code didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (busy) return;
    Haptics.selectionAsync();
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't resend the code.");
    } finally {
      setBusy(false);
    }
  };

  const emailValid = isValidEmail(email);
  const codeValid = code.trim().length >= 6;

  return (
    <View style={s.root}>
      <LinearGradient colors={["#06061A", "#02020A", "#050510"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={s.topbar}>
          <Pressable
            onPress={() => (step === "code" ? setStep("email") : router.back())}
            style={s.iconBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={s.brand}>
            <View style={s.brandDot} />
            <Text style={s.brandTxt}>CORE</Text>
          </View>
          <View style={s.iconBtn} />
        </View>

        <View style={s.body}>
          {step === "email" ? (
            <>
              <Text style={s.kicker}>Welcome back</Text>
              <Text style={s.title}>
                Sign in to{"\n"}
                <Text style={s.accent}>sync your CORE.</Text>
              </Text>
              <Text style={s.copy}>
                Enter your email and we&apos;ll send a 6-digit code. No password to remember.
              </Text>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (error) setError(null);
                }}
                placeholder="you@email.com"
                placeholderTextColor="rgba(255,255,255,0.30)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                inputMode="email"
                returnKeyType="go"
                onSubmitEditing={onSend}
                style={s.field}
                accessibilityLabel="Email address"
              />
            </>
          ) : (
            <>
              <Text style={s.kicker}>Check your inbox</Text>
              <Text style={s.title}>
                Enter the{"\n"}
                <Text style={s.accent}>6-digit code.</Text>
              </Text>
              <Text style={s.copy}>
                Sent to <Text style={{ color: "#fff", fontWeight: "600" }}>{email}</Text>. It expires in a few minutes.
              </Text>
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/[^0-9]/g, "").slice(0, 6));
                  if (error) setError(null);
                }}
                placeholder="••••••"
                placeholderTextColor="rgba(255,255,255,0.30)"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoFocus
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={onVerify}
                style={[s.field, s.codeField]}
                accessibilityLabel="6-digit verification code"
              />
              <View style={s.altRow}>
                <Text style={s.altLabel}>Didn&apos;t get it?</Text>
                <Pressable onPress={onResend} hitSlop={8} disabled={busy}>
                  <Text style={[s.altLink, busy && { opacity: 0.5 }]}>Resend code</Text>
                </Pressable>
              </View>
            </>
          )}

          {error && <Text style={s.error}>{error}</Text>}
        </View>

        <View style={s.footer}>
          <Pressable
            onPress={step === "email" ? onSend : onVerify}
            disabled={busy || (step === "email" ? !emailValid : !codeValid)}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={busy || (step === "email" ? !emailValid : !codeValid) ? ["#3a3a4a", "#2a2a3a"] : ["#2F8FFF", "#6F70FF", "#B388FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.cta, (busy || (step === "email" ? !emailValid : !codeValid)) && { opacity: 0.5 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.ctaTxt}>{step === "email" ? "Send code" : "Verify & sign in"}</Text>
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M5 12h14M13 5l7 7-7 7" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Text style={s.footerNote}>
            {step === "email" ? "We'll never share your email." : "Enter the code to finish signing in."}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#02020A" },
  topbar: { paddingHorizontal: 22, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2F8FFF", shadowColor: "#2F8FFF", shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  brandTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 4, color: "rgba(255,255,255,0.92)" },

  body: { flex: 1, paddingHorizontal: 26, paddingTop: 32, gap: 14 },
  kicker: { fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", color: "#9AA1B7", fontWeight: "600" },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.8, lineHeight: 34, color: "#fff" },
  accent: { color: "#5BB1FF" },
  copy: { color: "#9AA1B7", fontSize: 14, lineHeight: 21, letterSpacing: -0.1 },

  field: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 17, marginTop: 8 },
  codeField: { fontSize: 28, letterSpacing: 12, textAlign: "center", fontWeight: "700" },

  altRow: { marginTop: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  altLabel: { color: "rgba(255,255,255,0.70)", fontSize: 13 },
  altLink: { color: "#5BB1FF", fontSize: 13, fontWeight: "600" },

  error: { color: "#FF6B6B", fontSize: 13, marginTop: 6, lineHeight: 18 },

  footer: { paddingHorizontal: 26, paddingTop: 12 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 999, minHeight: 56, shadowColor: "#2F8FFF", shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  ctaTxt: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  footerNote: { textAlign: "center", color: "#9AA1B7", fontSize: 11, marginTop: 10 },
});
