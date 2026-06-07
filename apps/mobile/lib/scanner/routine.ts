/**
 * Build a simple training routine that prioritizes the scan's weak points.
 * Generic + bodyweight-friendly so it works whether the user trains at a gym or
 * home (there's no coreGym/equipment store in the RN app yet — when one lands,
 * swap the exercise pools by available equipment). Fitness guidance only.
 */
import type { MuscleKey } from "@/stores/game-state-store";

export type RoutineExercise = { name: string; sets: string; muscle: MuscleKey };
export type Routine = {
  title: string;
  focus: MuscleKey[];
  days: number;
  exercises: RoutineExercise[];
};

// 2-3 reliable movements per muscle (compound-first, bodyweight options included).
const POOL: Record<MuscleKey, string[]> = {
  chest: ["Push-ups (or bench press)", "Incline press", "Chest fly"],
  back: ["Rows (band/dumbbell)", "Pull-ups (or lat pulldown)", "Face pulls"],
  shoulders: ["Overhead press", "Lateral raises", "Pike push-ups"],
  arms: ["Bicep curls", "Tricep dips", "Hammer curls"],
  legs: ["Squats", "Lunges", "Romanian deadlift"],
  core: ["Plank", "Hanging knee raises", "Dead bug"],
};

const LABEL: Record<MuscleKey, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms", legs: "Legs", core: "Core",
};

const WHY: Record<MuscleKey, string> = {
  chest: "Build pressing strength and upper-body shape.",
  back: "A strong back fixes posture and balances your frame.",
  shoulders: "Caps that round out and widen the upper body.",
  arms: "Direct work for visible, functional arm size.",
  legs: "Your biggest muscles — they drive overall strength.",
  core: "Stability and the foundation every lift relies on.",
};

export function whyWeak(muscle: MuscleKey): string {
  return WHY[muscle] ?? "Worth prioritizing this block.";
}

export function muscleLabel(muscle: MuscleKey): string {
  return LABEL[muscle] ?? muscle;
}

/**
 * Weak points get 2 movements each; we top up with a compound or two so every
 * session is balanced. Days scale with how many areas need work.
 */
export function buildRoutine(weakPoints: MuscleKey[]): Routine {
  const focus = weakPoints.length ? weakPoints.slice(0, 3) : (["legs", "back", "chest"] as MuscleKey[]);
  const exercises: RoutineExercise[] = [];

  for (const m of focus) {
    POOL[m].slice(0, 2).forEach((name) => exercises.push({ name, sets: "3 × 8-12", muscle: m }));
  }
  // Always anchor with a big compound for overall strength.
  if (!focus.includes("legs")) exercises.push({ name: "Squats", sets: "3 × 8-12", muscle: "legs" });
  if (!focus.includes("back")) exercises.push({ name: "Rows (band/dumbbell)", sets: "3 × 10", muscle: "back" });

  const days = focus.length >= 3 ? 4 : 3;
  return {
    title: `Weak-point focus: ${focus.map(muscleLabel).join(" · ")}`,
    focus,
    days,
    exercises,
  };
}
