import { useState, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";

import { colors } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";

const TOTAL = 14;
type Goal = "Fitness" | "Productivity" | "Money" | "All-in-one";

type DynOpt = { v: string; c: string; t: string; d: string };
type DynBlock = { kicker: string; title: string; copy: string; opts: DynOpt[] };

const DYN_Q: Record<Goal, { q1: DynBlock; q2: DynBlock }> = {
  Fitness: {
    q1: { kicker: "Fitness Priority", title: "What would help your fitness most right now?", copy: "Shapes your training direction.", opts: [
      { v: "Build muscle", c: "#FF7A45", t: "Build muscle", d: "Gain size, shape, strength" },
      { v: "Lose fat", c: "#FF6BAA", t: "Lose fat", d: "Lean out and tighten up" },
      { v: "Be more consistent", c: "#2F8FFF", t: "Be more consistent", d: "Actually stick to training" },
      { v: "Improve energy", c: "#FFD05C", t: "Improve energy", d: "Feel better and train harder" },
    ]},
    q2: { kicker: "Training Level", title: "How consistent are you with training?", copy: "Helps Core calibrate the pressure.", opts: [
      { v: "Not training yet", c: "#9AA1B7", t: "Not training yet", d: "Haven't really started" },
      { v: "On and off", c: "#FBBF24", t: "On and off", d: "Sometimes consistent, often not" },
      { v: "Pretty consistent", c: "#2F8FFF", t: "Pretty consistent", d: "Train most weeks already" },
      { v: "Very locked in", c: "#34D399", t: "Very locked in", d: "Serious — want to optimise" },
    ]},
  },
  Productivity: {
    q1: { kicker: "Productivity Priority", title: "What do you want to get better at first?", copy: "Shapes your first routine and focus system.", opts: [
      { v: "Focus better", c: "#2F8FFF", t: "Focus better", d: "Stay on task longer" },
      { v: "Stop procrastinating", c: "#FF9F6B", t: "Stop procrastinating", d: "Start faster, stop delaying" },
      { v: "Build a better routine", c: "#B388FF", t: "Build a better routine", d: "More structure every day" },
      { v: "Reduce distractions", c: "#34D399", t: "Reduce distractions", d: "Stop getting pulled off track" },
    ]},
    q2: { kicker: "Productivity Level", title: "Where are you with productivity right now?", copy: "Tells Core how much to push.", opts: [
      { v: "Very inconsistent", c: "#F87171", t: "Very inconsistent", d: "Some days nearly nothing" },
      { v: "Trying but slipping", c: "#FBBF24", t: "Trying but slipping", d: "Want structure but lose it" },
      { v: "Decent base", c: "#2F8FFF", t: "Decent base", d: "Some good habits already" },
      { v: "Locked in", c: "#34D399", t: "Locked in", d: "Disciplined — want optimisation" },
    ]},
  },
  Money: {
    q1: { kicker: "Money Priority", title: "What do you want Core to fix with money first?", copy: "Focuses the money side on what matters most.", opts: [
      { v: "Earn more", c: "#34D399", t: "Earn more", d: "Work or side income" },
      { v: "Save more", c: "#2F8FFF", t: "Save more", d: "Stop money disappearing" },
      { v: "Spend smarter", c: "#FFD05C", t: "Spend smarter", d: "Control spending habits" },
      { v: "Track money better", c: "#B388FF", t: "Track money better", d: "Know where everything goes" },
    ]},
    q2: { kicker: "Money Level", title: "What feels hardest with money right now?", copy: "Builds the right first money system.", opts: [
      { v: "Not earning enough", c: "#F87171", t: "Not earning enough", d: "Income is the main problem" },
      { v: "Spending too easily", c: "#FFD05C", t: "Spending too easily", d: "Impulse spending keeps hurting" },
      { v: "No plan", c: "#9AA1B7", t: "No plan", d: "Need a clear money system" },
      { v: "Inconsistent habits", c: "#FBBF24", t: "Inconsistent habits", d: "Good weeks, bad weeks" },
    ]},
  },
  "All-in-one": {
    q1: { kicker: "Life Priority", title: "What part of life needs the most help?", copy: "Tells Core where to focus first.", opts: [
      { v: "Health and fitness", c: "#FF7A45", t: "Health and fitness", d: "Body, energy, consistency" },
      { v: "Routine and discipline", c: "#B388FF", t: "Routine and discipline", d: "Structure and habits that stick" },
      { v: "Money and work", c: "#34D399", t: "Money and work", d: "Income, saving, progress" },
      { v: "Mind and focus", c: "#2F8FFF", t: "Mind and focus", d: "Clearer thinking, less distraction" },
    ]},
    q2: { kicker: "App Direction", title: "What do you want Core to feel like?", copy: "Shapes how the app guides you.", opts: [
      { v: "A strict life coach", c: "#F87171", t: "Strict life coach", d: "Push, pressure, accountability" },
      { v: "A smart planner", c: "#2F8FFF", t: "Smart planner", d: "Better routines and reminders" },
      { v: "A self-improvement hub", c: "#B388FF", t: "Self-improvement hub", d: "Everything in one place" },
      { v: "A reset button", c: "#5CE1E6", t: "Reset button", d: "Get things back on track" },
    ]},
  },
};

type Answers = {
  name?: string;
  gender?: string;
  age?: number;
  mainGoal?: Goal;
  sleep?: number;
  water?: string;
  routine?: string;
  blocker?: string;
  dynamicOne?: string;
  dynamicTwo?: string;
  checkInTime?: string;
  reminders?: string;
  coachingStyle?: string;
};

const KEY_BY_STEP: (keyof Answers | "review")[] = [
  "name", "gender", "age", "mainGoal", "sleep", "water", "routine",
  "blocker", "dynamicOne", "dynamicTwo", "checkInTime", "reminders",
  "coachingStyle", "review",
];

export default function Quiz() {
  const [step, setStep] = useState(1);
  const trial = useAuthStore((s) => s.trial);
  const [answers, setAnswers] = useState<Answers>(() => ({
    age: 16,
    sleep: 7.5,
    name: trial.name || undefined,
    coachingStyle: trial.tone ? ({ gentle: "Gentle", balanced: "Balanced", direct: "Direct", drill: "Drill" } as const)[trial.tone] : undefined,
  }));
  const setBaseline = useAuthStore((s) => s.setBaseline);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const key = KEY_BY_STEP[step - 1];
  const filled = key === "review" || (key && answers[key] !== undefined && answers[key] !== "");

  const update = <K extends keyof Answers>(k: K, v: Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [k]: v }));
    Haptics.selectionAsync();
  };

  const next = () => {
    if (step >= TOTAL) {
      if (answers.age) setBaseline({ ageYears: answers.age });
      completeOnboarding();
      router.replace("/(tabs)");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  };
  const prev = () => {
    if (step <= 1) return;
    setStep((s) => s - 1);
  };

  const dyn = answers.mainGoal ? DYN_Q[answers.mainGoal] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }} edges={["top", "bottom"]}>
      <View style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topbar}>
          <Pressable onPress={prev} style={[styles.back, step === 1 && { opacity: 0 }]}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / TOTAL) * 100}%` }]} />
          </View>
          <Text style={styles.meta}>{step} / {TOTAL}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {step === 1 && <StepName name={answers.name ?? ""} onChange={(v) => update("name", v)} />}
          {step === 2 && <StepGender value={answers.gender} onPick={(v) => update("gender", v)} />}
          {step === 3 && <StepSlider kicker="Age" title="How old are you?" copy="Keeps your first plan realistic." min={13} max={65} step={1} value={answers.age ?? 16} unit="Years" onChange={(v) => update("age", v)} />}
          {step === 4 && <StepGoal value={answers.mainGoal} onPick={(v) => update("mainGoal", v)} />}
          {step === 5 && <StepSlider kicker="Recovery" title="How many hours do you usually sleep?" copy="Sets your first pace and recovery expectations." min={4} max={12} step={0.5} value={answers.sleep ?? 7.5} unit="Hours" onChange={(v) => update("sleep", v)} />}
          {step === 6 && <StepWater value={answers.water} onPick={(v) => update("water", v)} />}
          {step === 7 && <StepRoutine value={answers.routine} onPick={(v) => update("routine", v)} />}
          {step === 8 && <StepBlocker value={answers.blocker} onPick={(v) => update("blocker", v)} />}
          {step === 9 && dyn && <StepDynamic block={dyn.q1} value={answers.dynamicOne} onPick={(v) => update("dynamicOne", v)} />}
          {step === 10 && dyn && <StepDynamic block={dyn.q2} value={answers.dynamicTwo} onPick={(v) => update("dynamicTwo", v)} />}
          {step === 11 && <StepCheckIn value={answers.checkInTime} onPick={(v) => update("checkInTime", v)} />}
          {step === 12 && <StepReminders value={answers.reminders} onPick={(v) => update("reminders", v)} />}
          {step === 13 && <StepCoaching value={answers.coachingStyle} onPick={(v) => update("coachingStyle", v)} />}
          {step === 14 && <StepReview answers={answers} jump={setStep} />}
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Pressable
            onPress={next}
            disabled={!filled}
            style={({ pressed }) => [styles.cta, !filled && styles.ctaDisabled, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}
          >
            <Text style={[styles.ctaText, !filled && { color: colors.text.dim }]}>{step === TOTAL ? "Open my dashboard →" : "Continue →"}</Text>
          </Pressable>
          <Text style={[styles.xpHint, filled && { color: "#34D399" }]}>{filled ? "+10 XP unlocked" : "Answer to earn +10 XP"}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ─────────────────────── individual steps ─────────────────────── */

function StepName({ name, onChange }: { name: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Kicker text="Identity" />
      <Question text="What should Core call you?" />
      <Copy text="Your name shows across results and your dashboard. Use any name you want." />
      <TextInput value={name} onChangeText={onChange} placeholder="Type your name…" placeholderTextColor={colors.text.dim} maxLength={24} style={styles.textInput} />
    </View>
  );
}

function StepGender({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  return (
    <View>
      <Kicker text="Profile" />
      <Question text="Which profile fits you?" />
      <Copy text="Shapes your recommendations and how the app presents content." />
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(["Male", "Female"] as const).map((g) => (
          <Pressable key={g} onPress={() => onPick(g)} style={[styles.bodyCard, value === g && styles.cardSelected]}>
            <View style={[styles.bodyAvatar, { backgroundColor: g === "Male" ? "rgba(155,194,255,0.20)" : "rgba(255,179,209,0.20)" }]} />
            <Text style={styles.bodyName}>{g}</Text>
            <Text style={styles.bodyTag}>{g === "Male" ? "Strength · Drive · Performance" : "Wellness · Balance · Glow"}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => onPick("Other")} style={{ alignSelf: "center", marginTop: 12, padding: 8 }}>
        <Text style={styles.helperText}>or pick "Prefer not to say"</Text>
      </Pressable>
    </View>
  );
}

function StepSlider({ kicker, title, copy, min, max, step, value, unit, onChange }: { kicker: string; title: string; copy: string; min: number; max: number; step: number; value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <View>
      <Kicker text={kicker} />
      <Question text={title} />
      <Copy text={copy} />
      <View style={{ alignItems: "center", paddingVertical: 18 }}>
        <View style={styles.sliderMeter}>
          <Text style={styles.sliderVal}>{value}</Text>
          <Text style={styles.sliderUnit}>{unit}</Text>
        </View>
        <Slider style={{ width: "100%", height: 32 }} minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange} minimumTrackTintColor={colors.stat.body} maximumTrackTintColor="rgba(255,255,255,0.08)" thumbTintColor="#2F8FFF" />
      </View>
    </View>
  );
}

function StepGoal({ value, onPick }: { value?: Goal; onPick: (v: Goal) => void }) {
  const goals: { v: Goal; c: string; t: string; d: string }[] = [
    { v: "Fitness", c: "#FF7A45", t: "Fitness", d: "Training, physique, energy, and consistency" },
    { v: "Productivity", c: "#2F8FFF", t: "Productivity", d: "Focus, routine, discipline, getting more done" },
    { v: "Money", c: "#34D399", t: "Money", d: "Income, side hustles, smarter money habits" },
    { v: "All-in-one", c: "#B388FF", t: "All-in-one", d: "A balanced setup across your full life" },
  ];
  return (
    <View>
      <Kicker text="Main Focus" />
      <Question text="What's your #1 goal right now?" />
      <Copy text="This shifts the next questions so the setup feels made for you." />
      <View style={{ gap: 8 }}>
        {goals.map((g) => <OptCard key={g.v} c={g.c} t={g.t} d={g.d} selected={value === g.v} onPress={() => onPick(g.v)} />)}
      </View>
    </View>
  );
}

function StepWater({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  const opts = [
    { v: "Under 1L", c: "#5CE1E6", lbl: "Very low" },
    { v: "1–2L", c: "#5CE1E6", lbl: "Average" },
    { v: "2–3L", c: "#5CE1E6", lbl: "Good" },
    { v: "3–4L", c: "#5CE1E6", lbl: "Very good" },
    { v: "4L+", c: "#2F8FFF", lbl: "Elite" },
    { v: "Varies", c: "#9AA1B7", lbl: "Inconsistent" },
  ];
  return (
    <View>
      <Kicker text="Hydration" />
      <Question text="How much water do you drink daily?" />
      <Copy text="Hydration links directly to energy, focus, and recovery." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {opts.map((o) => (
          <Pressable key={o.v} onPress={() => onPick(o.v)} style={[styles.scaleCard, value === o.v && styles.cardSelected]}>
            <View style={[styles.scaleDot, { backgroundColor: o.c, shadowColor: o.c }]} />
            <Text style={styles.scaleNum}>{o.v}</Text>
            <Text style={styles.scaleLbl}>{o.lbl}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepRoutine({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  const opts = [
    { v: "Messy and random", c: "#F87171", d: "No rhythm — different every day" },
    { v: "I try but fall off", c: "#FBBF24", d: "Good intentions, weak follow-through" },
    { v: "Pretty decent", c: "#2F8FFF", d: "Most things land, some don't" },
    { v: "Locked in", c: "#34D399", d: "Same time, same actions, daily" },
  ];
  return (
    <View>
      <Kicker text="Routine" />
      <Question text="How does your routine feel?" />
      <Copy text="Pick the one that fits you most." />
      <View style={{ gap: 8 }}>{opts.map((o) => <OptCard key={o.v} c={o.c} t={o.v} d={o.d} selected={value === o.v} onPress={() => onPick(o.v)} />)}</View>
    </View>
  );
}

function StepBlocker({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  const opts = [
    { v: "I keep putting things off", c: "#FF9F6B", d: "I know what to do but delay it" },
    { v: "My energy is too low", c: "#F87171", d: "I want more but feel flat" },
    { v: "I have no structure", c: "#B388FF", d: "My days feel disorganised" },
    { v: "I get distracted too easily", c: "#2F8FFF", d: "I lose focus and drift fast" },
  ];
  return (
    <View>
      <Kicker text="Blocker" />
      <Question text="What throws you off most often?" />
      <Copy text="Core uses this to address your biggest sticking point first." />
      <View style={{ gap: 8 }}>{opts.map((o) => <OptCard key={o.v} c={o.c} t={o.v} d={o.d} selected={value === o.v} onPress={() => onPick(o.v)} />)}</View>
    </View>
  );
}

function StepDynamic({ block, value, onPick }: { block: DynBlock; value?: string; onPick: (v: string) => void }) {
  return (
    <View>
      <Kicker text={block.kicker} />
      <Question text={block.title} />
      <Copy text={block.copy} />
      <View style={{ gap: 8 }}>{block.opts.map((o) => <OptCard key={o.v} c={o.c} t={o.t} d={o.d} selected={value === o.v} onPress={() => onPick(o.v)} />)}</View>
    </View>
  );
}

function StepCheckIn({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  const opts = [
    { v: "Morning", c: "#FFD05C" },
    { v: "Afternoon", c: "#FF7A45" },
    { v: "Evening", c: "#B388FF" },
    { v: "Late Night", c: "#2F8FFF" },
  ];
  return (
    <View>
      <Kicker text="Check-In Time" />
      <Question text="When's your main Core check-in?" />
      <Copy text="Your daily reset time — reminders and routines align around it." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {opts.map((o) => (
          <Pressable key={o.v} onPress={() => onPick(o.v)} style={[styles.toggleCard, value === o.v && styles.cardSelected]}>
            <View style={[styles.toggleDot, { backgroundColor: o.c, shadowColor: o.c }]} />
            <Text style={styles.toggleLbl}>{o.v}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepReminders({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  const opts = [
    { v: "Habit reminders", c: "#B388FF", d: "Small nudges to stay consistent" },
    { v: "Workout reminders", c: "#FF7A45", d: "A push when it's time to train" },
    { v: "Focus reminders", c: "#2F8FFF", d: "Get back on task when you drift" },
    { v: "Money reminders", c: "#34D399", d: "Track spending and goals" },
  ];
  return (
    <View>
      <Kicker text="Reminders" />
      <Question text="Which reminder would help you first?" />
      <Copy text="Pick the one you'd want most. You can add more inside the app." />
      <View style={{ gap: 8 }}>{opts.map((o) => <OptCard key={o.v} c={o.c} t={o.v} d={o.d} selected={value === o.v} onPress={() => onPick(o.v)} />)}</View>
    </View>
  );
}

function StepCoaching({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  const opts = [
    { v: "Direct", c: "#F87171", d: "Clear, strict, straight to the point." },
    { v: "Motivating", c: "#FF7A45", d: "High energy, more encouragement, more push." },
    { v: "Balanced", c: "#B388FF", d: "Structure, support, and pressure mixed together." },
  ];
  return (
    <View>
      <Kicker text="Coaching" />
      <Question text="How do you want Core to talk to you?" />
      <Copy text="Choose the style that pushes you the right way." />
      <View style={{ gap: 8 }}>{opts.map((o) => <OptCard key={o.v} c={o.c} t={o.v} d={o.d} selected={value === o.v} onPress={() => onPick(o.v)} />)}</View>
    </View>
  );
}

function StepReview({ answers, jump }: { answers: Answers; jump: (s: number) => void }) {
  const rows = useMemo(() => [
    ["Name", answers.name, 1], ["Profile", answers.gender, 2], ["Age", answers.age, 3],
    ["Goal", answers.mainGoal, 4], ["Sleep", answers.sleep ? `${answers.sleep}h` : "", 5],
    ["Water", answers.water, 6], ["Routine", answers.routine, 7], ["Blocker", answers.blocker, 8],
    ["Priority 1", answers.dynamicOne, 9], ["Priority 2", answers.dynamicTwo, 10],
    ["Check-In", answers.checkInTime, 11], ["Reminder", answers.reminders, 12], ["Coaching", answers.coachingStyle, 13],
  ], [answers]);
  return (
    <View>
      <Kicker text="Review" />
      <View style={styles.rankPill}><Text style={styles.rankPillText}>Rank: Focus · 62 XP</Text></View>
      <Question text="Your setup is ready." />
      <Copy text="Tap any answer to change it, then open your dashboard." />
      <View style={{ gap: 6, marginTop: 12 }}>
        {rows.map(([label, val, step]) => (
          <Pressable key={String(label)} onPress={() => jump(Number(step))} style={styles.reviewRow}>
            <Text style={styles.reviewKey}>{String(label).toUpperCase()}</Text>
            <Text style={styles.reviewVal}>{val ? String(val) : "—"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ─────────────────────── shared bits ─────────────────────── */

function Kicker({ text }: { text: string }) {
  return <Text style={styles.kicker}>{text}</Text>;
}
function Question({ text }: { text: string }) {
  return <Text style={styles.question}>{text}</Text>;
}
function Copy({ text }: { text: string }) {
  return <Text style={styles.copy}>{text}</Text>;
}

function OptCard({ c, t, d, selected, onPress }: { c: string; t: string; d: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.opt, selected && styles.cardSelected]}>
      <View style={[styles.optIcon, { backgroundColor: c, shadowColor: c }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optTitle}>{t}</Text>
        <Text style={styles.optDesc}>{d}</Text>
      </View>
    </Pressable>
  );
}

/* ─────────────────────── styles ─────────────────────── */

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16,
  },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  backArrow: { color: colors.text.muted, fontSize: 22, lineHeight: 22, marginTop: -2 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent ?? "#2F8FFF", borderRadius: 999 },
  meta: { color: colors.text.muted, fontSize: 11, letterSpacing: 1.6, fontVariant: ["tabular-nums"], fontWeight: "500" },

  kicker: { color: "#2F8FFF", fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", fontWeight: "600", marginBottom: 10 },
  question: { color: colors.text.primary, fontSize: 26, fontWeight: "600", letterSpacing: -1, lineHeight: 32, marginBottom: 8 },
  copy: { color: colors.text.muted, fontSize: 13, lineHeight: 19, marginBottom: 20, letterSpacing: -0.1 },
  helperText: { color: colors.text.dim, fontSize: 12 },

  textInput: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 14, color: colors.text.primary, fontSize: 17, paddingHorizontal: 16, paddingVertical: 16, letterSpacing: -0.2 },

  sliderMeter: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", marginBottom: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(47,143,255,0.08)" },
  sliderVal: { color: "#FFFFFF", fontSize: 48, fontWeight: "700", letterSpacing: -1.8, lineHeight: 50 },
  sliderUnit: { color: colors.text.muted, fontSize: 11, letterSpacing: 1.6, marginTop: 4, fontWeight: "500" },

  bodyCard: { flex: 1, padding: 18, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 8 },
  bodyAvatar: { width: 56, height: 88, borderRadius: 8 },
  bodyName: { color: colors.text.primary, fontSize: 13, fontWeight: "600", letterSpacing: -0.1 },
  bodyTag: { color: colors.text.muted, fontSize: 10, textAlign: "center" },

  opt: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "flex-start" },
  optIcon: { width: 32, height: 32, borderRadius: 10, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  optTitle: { color: colors.text.primary, fontSize: 14, fontWeight: "600", letterSpacing: -0.2 },
  optDesc: { color: colors.text.muted, fontSize: 11, marginTop: 4, lineHeight: 14 },

  scaleCard: { width: "31%", padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 4 },
  scaleDot: { width: 14, height: 14, borderRadius: 7, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  scaleNum: { color: colors.text.primary, fontSize: 13, fontWeight: "700", letterSpacing: -0.2 },
  scaleLbl: { color: colors.text.muted, fontSize: 9, letterSpacing: 0.6 },

  toggleCard: { width: "48%", padding: 16, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 6 },
  toggleDot: { width: 18, height: 18, borderRadius: 9, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  toggleLbl: { color: colors.text.primary, fontSize: 13, fontWeight: "600" },

  cardSelected: { borderColor: "#2F8FFF", backgroundColor: "rgba(47,143,255,0.08)" },

  rankPill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(47,143,255,0.18)", borderWidth: 1, borderColor: "rgba(47,143,255,0.40)", marginBottom: 14 },
  rankPillText: { color: "#2F8FFF", fontSize: 11, fontWeight: "600", letterSpacing: 1.6 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  reviewKey: { color: colors.text.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" },
  reviewVal: { color: colors.text.primary, fontSize: 13, fontWeight: "600" },

  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 12, backgroundColor: "rgba(2,2,10,0.96)" },
  cta: { paddingVertical: 18, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", alignItems: "center" },
  ctaDisabled: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.08)" },
  ctaText: { color: "#050510", fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
  xpHint: { textAlign: "center", marginTop: 8, fontSize: 11, color: colors.text.dim, letterSpacing: 0.6 },
});
