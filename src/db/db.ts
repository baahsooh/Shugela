import Dexie, { type Table } from "dexie";

import type {
  AppSettings,
  CustomFood,
  DoseLog,
  GlucoseReading,
  Meal,
  Medication,
} from "@/lib/types";

/**
 * Local-first database.
 *
 * Everything lives in the browser's IndexedDB — no account, no server. The
 * class is instantiated at module scope, which is safe during SSR because
 * Dexie only touches `indexedDB` when a query actually runs (and
 * `useLiveQuery` never subscribes on the server).
 */
export class ShugelaDatabase extends Dexie {
  readings!: Table<GlucoseReading, string>;
  settings!: Table<AppSettings, string>;
  /** Ids deleted while offline, so the delete can be replayed to the cloud. */
  tombstones!: Table<Tombstone, string>;
  /** Soft-deleted readings, kept until the user purges them. */
  trash!: Table<TrashedReading, string>;
  meals!: Table<Meal, string>;
  customFoods!: Table<CustomFood, string>;
  medications!: Table<Medication, string>;
  doseLogs!: Table<DoseLog, string>;

  constructor() {
    super("shugela");

    this.version(1).stores({
      // `measuredAt` powers the history list and range scans;
      // `[measurementType+measuredAt]` powers per-type aggregation.
      readings: "id, measuredAt, measurementType, createdAt, [measurementType+measuredAt]",
      settings: "id",
    });

    // v2 adds the cloud owner. Existing rows simply have no userId yet and get
    // one when the owner uploads their readings to their account.
    this.version(2).stores({
      readings: "id, measuredAt, measurementType, createdAt, userId, [measurementType+measuredAt]",
      settings: "id",
      tombstones: "id, deletedAt",
    });

    // v3 adds a recycle bin so a mis-tap cannot destroy a reading.
    this.version(3).stores({
      readings: "id, measuredAt, measurementType, createdAt, userId, [measurementType+measuredAt]",
      settings: "id",
      tombstones: "id, deletedAt",
      trash: "id, deletedAt",
    });

    // v4 adds food tracking and the medication log.
    this.version(4).stores({
      readings: "id, measuredAt, measurementType, createdAt, userId, [measurementType+measuredAt]",
      settings: "id",
      tombstones: "id, deletedAt",
      trash: "id, deletedAt",
      meals: "id, eatenAt, mealType, userId",
      customFoods: "id, name",
      medications: "id, name, active",
      doseLogs: "id, medicationId, takenAt, scheduledTime, userId, [medicationId+scheduledTime]",
    });
  }
}

export interface Tombstone {
  id: string;
  deletedAt: string;
  /** Account that owned the row; only that account replays the delete. */
  userId?: string;
  /** What the id referred to, so pills/meals can be tombstoned too. */
  kind?: "reading" | "meal" | "dose";
}

export interface TrashedReading {
  id: string;
  reading: GlucoseReading;
  deletedAt: string;
}

/** How long deleted readings stay recoverable. */
export const TRASH_RETENTION_DAYS = 30;

export const db = new ShugelaDatabase();

/** Escape hatch used by Settings → "Storage" diagnostics. */
export async function estimateStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

/**
 * Ask the browser to treat this origin as persistent so it cannot evict the
 * readings under storage pressure.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}