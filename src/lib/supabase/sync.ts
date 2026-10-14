import { db } from "@/db/db";
import { getAuthState } from "@/hooks/use-auth";
import { toMmol } from "@/lib/glucose";
import type { AppSettings, GlucoseReading, GlucoseUnit, MeasurementType, TargetRanges } from "@/lib/types";
import { getSupabase } from "./client";

/**
 * Cloud sync.
 *
 * Dexie stays the source of truth the UI renders from, so Shugela keeps
 * working with no network. This module mirrors local changes to Postgres and
 * merges remote changes back, resolving conflicts last-write-wins on
 * `updated_at`.
 */

export type SyncStatus = "disabled" | "signed-out" | "idle" | "syncing" | "error";

export interface SyncSummary {
  pushed: number;
  pulled: number;
  deleted: number;
}

const LAST_SYNC_KEY = "shugela:last-sync";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REMOTE_READ_LIMIT = 5000;

/* ----------------------------------------------------------- status store --- */

let status: SyncStatus = "idle";
let lastError: string | null = null;
let lastRunAt: string | null = null;
const listeners = new Set<() => void>();

/** Always notifies: `lastRunAt` changes on every call and the UI shows it. */
function setStatus(next: SyncStatus, error: string | null = null) {
  status = next;
  lastError = error;
  lastRunAt = new Date().toISOString();
  for (const listener of listeners) listener();
}

export function subscribeToSync(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Primitive snapshot so `useSyncExternalStore` can compare cheaply — it
 * changes on every run so the UI re-renders with the fresh timestamp.
 */
export function getSyncSnapshot(): string {
  return `${status}~${lastRunAt ?? ""}~${lastError ?? ""}`;
}

export function parseSyncSnapshot(snapshot: string): {
  status: SyncStatus;
  lastRunAt: string | null;
  error: string | null;
} {
  const [status, lastRunAt, error] = snapshot.split("~");
  return {
    status: (status as SyncStatus) ?? "idle",
    lastRunAt: lastRunAt || null,
    error: error || null,
  };
}

export function getSyncMeta(): { status: SyncStatus; error: string | null; lastRunAt: string | null } {
  return { status, error: lastError, lastRunAt };
}

export function resetSyncStatus() {
  setStatus("idle");
}

/* -------------------------------------------------------------- helpers --- */

function readLastSync(userId: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LAST_SYNC_KEY}:${userId}`);
    return raw ? new Date(raw).toISOString() : null;
  } catch {
    return null;
  }
}

function writeLastSync(userId: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${LAST_SYNC_KEY}:${userId}`, new Date().toISOString());
  } catch {
    // Storage full or blocked — sync still worked, we just re-pull next time.
  }
}

const toTime = (value: string | Date): number => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

/**
 * Only rows explicitly owned by this account sync automatically. Un-owned rows
 * are never pushed without the owner clicking "Upload my readings", so a second
 * person signing in on a shared device cannot silently inherit the first
 * person's data.
 */
function isMine(reading: GlucoseReading, userId: string): boolean {
  return reading.userId === userId;
}

function toRow(reading: GlucoseReading, userId: string) {
  return {
    id: reading.id,
    user_id: userId,
    glucose_mmol: reading.glucoseMmol,
    entered_value: reading.enteredValue,
    entered_unit: reading.enteredUnit,
    measurement_type: reading.measurementType,
    measured_at: reading.measuredAt,
    note: reading.note ?? null,
    source: reading.source,
    created_at: reading.createdAt,
    updated_at: reading.updatedAt,
  };
}

interface RemoteRow {
  id: string;
  user_id: string;
  glucose_mmol: number | string;
  entered_value: number | string;
  entered_unit: GlucoseUnit;
  measurement_type: MeasurementType;
  measured_at: string;
  note: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

function fromRow(row: RemoteRow): GlucoseReading {
  const enteredValue = Number(row.entered_value);
  const enteredUnit = row.entered_unit;
  const stored = Number(row.glucose_mmol);

  return {
    id: row.id,
    glucoseMmol: Number.isFinite(stored) && stored > 0 ? stored : toMmol(enteredValue, enteredUnit),
    enteredValue,
    enteredUnit,
    measurementType: row.measurement_type,
    measuredAt: new Date(row.measured_at).toISOString(),
    ...(row.note ? { note: row.note } : {}),
    source: "manual",
    userId: row.user_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Re-key records whose id is not a uuid (demo seed data uses slugs). */
async function ensureUuidKeys(readings: GlucoseReading[], userId: string) {
  const remapped: GlucoseReading[] = [];

  for (const reading of readings) {
    if (UUID_RE.test(reading.id)) {
      remapped.push({ ...reading, userId });
      continue;
    }
    remapped.push({ ...reading, id: crypto.randomUUID(), userId });
  }

  await db.readings.bulkPut(remapped);
  return remapped;
}

/* ----------------------------------------------------------------- sync --- */

let inFlight: Promise<SyncSummary | null> | null = null;

/** Full sync cycle: deletes → pull & merge → push → profile. */
export function syncNow(): Promise<SyncSummary | null> {
  if (inFlight) return inFlight;

  const run = performSync().finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
}

async function performSync(): Promise<SyncSummary | null> {
  const { userId, status: authStatus } = getAuthState();

  if (!userId || authStatus === "loading") return null;

  const supabase = getSupabase();
  if (!supabase) {
    setStatus("disabled", "Supabase is not configured");
    return null;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;

  setStatus("syncing");

  try {
    const deleted = await replayDeletes(userId);
    const { pulled, toPush } = await pullAndMerge(userId);
    const pushed = await pushAll(toPush, userId);
    await syncProfile(userId);

    writeLastSync(userId);
    setStatus("idle");

    return { pushed, pulled, deleted };
  } catch (error) {
    setStatus("error", error instanceof Error ? error.message : "Sync failed");
    return null;
  }
}

async function replayDeletes(userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const tombstones = (await db.tombstones.toArray()).filter(
    (t) => t.userId === userId || !t.userId,
  );
  if (tombstones.length === 0) return 0;

  const ids = tombstones.map((t) => t.id).filter((id) => UUID_RE.test(id));
  if (ids.length > 0) {
    const { error } = await supabase.from("readings").delete().in("id", ids);
    if (error) throw new Error(error.message);
  }

  await db.tombstones.bulkDelete(tombstones.map((t) => t.id));
  return tombstones.length;
}

async function pullAndMerge(userId: string): Promise<{ pulled: number; toPush: GlucoseReading[] }> {
  const supabase = getSupabase();
  if (!supabase) return { pulled: 0, toPush: [] };

  const since = readLastSync(userId);
  let query = supabase
    .from("readings")
    .select(
      "id,user_id,glucose_mmol,entered_value,entered_unit,measurement_type,measured_at,note,source,created_at,updated_at",
    )
    .eq("user_id", userId)
    .limit(REMOTE_READ_LIMIT);

  if (since) query = query.gt("updated_at", since);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const remote = (data ?? []) as RemoteRow[];
  const localAll = await db.readings.toArray();
  const localById = new Map(localAll.map((reading) => [reading.id, reading]));

  const incoming: GlucoseReading[] = [];

  for (const row of remote) {
    const remoteReading = fromRow(row);
    const localReading = localById.get(remoteReading.id);

    if (!localReading) {
      incoming.push(remoteReading);
      continue;
    }
    // Last write wins.
    if (toTime(remoteReading.updatedAt) > toTime(localReading.updatedAt)) {
      incoming.push(remoteReading);
    }
  }

  if (incoming.length > 0) await db.readings.bulkPut(incoming);

  const incomingIds = new Set(incoming.map((reading) => reading.id));
  const toPush = localAll.filter((reading) => isMine(reading, userId) && !incomingIds.has(reading.id));
  return { pulled: incoming.length, toPush };
}

async function pushAll(readings: GlucoseReading[], userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || readings.length === 0) return 0;

  const rows = readings.map((reading) => toRow(reading, userId));
  const CHUNK = 200;

  for (let index = 0; index < rows.length; index += CHUNK) {
    const chunk = rows.slice(index, index + CHUNK);
    const { error } = await supabase.from("readings").upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  await db.readings.bulkPut(readings.map((reading) => ({ ...reading, userId })));
  return rows.length;
}

async function syncProfile(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const settings = await db.settings.get("settings");
  if (!settings) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("unit,theme,target_ranges,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as
    | { unit: GlucoseUnit; theme: AppSettings["theme"]; target_ranges: TargetRanges; updated_at: string }
    | null;

  // Remote wins only when it is newer than the local settings row.
  if (row && toTime(row.updated_at) > toTime(settings.updatedAt)) {
    await db.settings.put({
      ...settings,
      unit: row.unit,
      theme: row.theme,
      targetRanges: { ...settings.targetRanges, ...row.target_ranges },
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      unit: settings.unit,
      theme: settings.theme,
      target_ranges: settings.targetRanges,
      updated_at: settings.updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (upsertError) throw new Error(upsertError.message);
}

/* -------------------------------------------------------------- uploads --- */

/**
 * Claim every un-owned local reading for this account and push everything up.
 * This is the "I already had readings before signing up" path.
 */
export async function uploadLocalReadings(userId: string): Promise<number> {
  const all = await db.readings.toArray();
  const claimable = all.filter((reading) => !reading.userId || reading.userId === userId);
  if (claimable.length === 0) return 0;

  const keyed = await ensureUuidKeys(claimable, userId);

  // Drop the pre-rename rows so the old ids cannot resurface locally.
  const oldIds = new Set(claimable.filter((reading) => !UUID_RE.test(reading.id)).map((r) => r.id));
  if (oldIds.size > 0) await db.readings.bulkDelete([...oldIds]);

  await pushAll(keyed, userId);
  return keyed.length;
}

/* --------------------------------------------------------------- trigger --- */

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Fire-and-forget sync after a local write; coalesces rapid changes. */
export function requestSync(): void {
  if (typeof window === "undefined") return;
  const { userId } = getAuthState();
  if (!userId) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, 1200);
}

/** Push the current settings row (called after the user edits preferences). */
export async function pushSettingsNow(userId: string): Promise<void> {
  await syncProfile(userId);
}

export function formatLastSync(iso: string | null): string {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}