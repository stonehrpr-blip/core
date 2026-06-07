/**
 * Physique-scan history — LOCAL ONLY (AsyncStorage key `core.scanHistory.v1`).
 * Never synced to Supabase. Holds the rank/score/muscle snapshot + the
 * app-private photo path for each scan so the Compare view can show real change.
 *
 * Photos live on disk (lib/scanner/storage.ts); this store holds the records and
 * owns the "delete all" that wipes both the records and the photo files.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MuscleMap, MuscleKey } from "./game-state-store";
import { deleteAllPhotos } from "../lib/scanner/storage";

export type ScanRecord = {
  id: string;
  ts: number;
  score: number;
  tier: string;
  muscles: MuscleMap;
  weakPoints: MuscleKey[];
  summary: string;
  photoUri: string | null;
};

const MAX_RECORDS = 50;

type ScanHistoryState = {
  records: ScanRecord[];
  addScan: (rec: Omit<ScanRecord, "id" | "ts"> & { id?: string; ts?: number }) => ScanRecord;
  latest: () => ScanRecord | null;
  previous: () => ScanRecord | null;
  clearAll: () => Promise<void>;
};

// Cheap unique id without pulling a uuid dep (ts + random suffix is plenty here).
function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useScanHistoryStore = create<ScanHistoryState>()(
  persist(
    (set, get) => ({
      records: [],

      addScan: (rec) => {
        const record: ScanRecord = {
          id: rec.id ?? makeId(),
          ts: rec.ts ?? Date.now(),
          score: rec.score,
          tier: rec.tier,
          muscles: rec.muscles,
          weakPoints: rec.weakPoints,
          summary: rec.summary,
          photoUri: rec.photoUri ?? null,
        };
        set((s) => ({ records: [record, ...s.records].slice(0, MAX_RECORDS) }));
        return record;
      },

      latest: () => get().records[0] ?? null,
      previous: () => get().records[1] ?? null,

      clearAll: async () => {
        await deleteAllPhotos();
        set({ records: [] });
      },
    }),
    {
      name: "core.scanHistory.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
