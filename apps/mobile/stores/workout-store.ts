/**
 * Current training routine — persisted locally (AsyncStorage `core.workout.v1`).
 * The Physique Scanner writes the weak-point routine here on each scan; the Scan
 * tab's "Your Plan" section reads it. (No gym/Strength workout module exists in
 * the RN app yet — this is the home for the generated plan until one lands.)
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Routine } from "@/lib/scanner/routine";

export type SavedRoutine = Routine & { createdAt: number; source: string };

type WorkoutState = {
  routine: SavedRoutine | null;
  setRoutine: (r: Routine, source?: string) => void;
  clearRoutine: () => void;
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      routine: null,
      setRoutine: (r, source = "physique_scan") =>
        set({ routine: { ...r, createdAt: Date.now(), source } }),
      clearRoutine: () => set({ routine: null }),
    }),
    {
      name: "core.workout.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
