import { TRASH_RETENTION_DAYS, db, type TrashedReading } from "./db";
import { roundForUnit, toMmol } from "@/lib/glucose";
import { createId } from "@/lib/utils";
import { getAuthState } from "@/hooks/use-auth";
import { requestSync } from "@/lib/supabase/sync";
import type { GlucoseReading, ReadingDraft } from "@/lib/types";

/** Build a fully-formed record from a validated draft. */
function buildReading(draft: ReadingDraft, existing?: GlucoseReading): GlucoseReading {
  const now = new Date().toISOString();
  const enteredValue = roundForUnit(draft.enteredValue, draft.enteredUnit);
  const note = draft.note?.trim();
  // Stamp the signed-in owner so the change can sync straight away.
  const userId = getAuthState().userId;

  return {
    id: existing?.id ?? createId(),
    glucoseMmol: toMmol(enteredValue, draft.enteredUnit),
    enteredValue,
    enteredUnit: draft.enteredUnit,
    measurementType: draft.measurementType,
    measuredAt: draft.measuredAt,
    ...(note ? { note } : {}),
    source: "manual",
    ...(userId ? { userId } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function createReading(draft: ReadingDraft): Promise<GlucoseReading> {
  const reading = buildReading(draft);
  await db.readings.add(reading);
  requestSync();
  return reading;
}

export async function updateReading(
  id: string,
  draft: ReadingDraft,
): Promise<GlucoseReading | undefined> {
  const existing = await db.readings.get(id);
  if (!existing) return undefined;
  const updated = buildReading(draft, existing);
  await db.readings.put(updated);
  requestSync();
  return updated;
}

/**
 * Soft delete. The reading moves to the recycle bin and can be restored for
 * {@link TRASH_RETENTION_DAYS} days — a mis-tap must never destroy data.
 */
export async function deleteReading(id: string): Promise<void> {
  const existing = await db.readings.get(id);
  if (!existing) return;

  const { userId } = getAuthState();
  await db.trash.put({ id, reading: existing, deletedAt: new Date().toISOString() });
  await db.tombstones.put({
    id,
    deletedAt: new Date().toISOString(),
    ...(existing.userId ?? userId ? { userId: existing.userId ?? userId! } : {}),
  });
  await db.readings.delete(id);
  requestSync();
}

export async function getTrash(): Promise<TrashedReading[]> {
  await purgeExpiredTrash();
  const all = await db.trash.toArray();
  return all.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/** Puts a single reading back where it was. */
export async function restoreReading(id: string): Promise<void> {
  const entry = await db.trash.get(id);
  if (!entry) return;

  await db.readings.put(entry.reading);
  await db.trash.delete(id);
  await db.tombstones.delete(id);
  requestSync();
}

export async function restoreAllTrash(): Promise<number> {
  const entries = await db.trash.toArray();
  if (entries.length === 0) return 0;

  await db.readings.bulkPut(entries.map((entry) => entry.reading));
  await db.trash.clear();
  await db.tombstones.bulkDelete(entries.map((entry) => entry.id));
  requestSync();
  return entries.length;
}

/** Permanent removal — only ever called from the explicit "Empty trash" action. */
export async function emptyTrash(): Promise<number> {
  const count = await db.trash.count();
  await db.trash.clear();
  return count;
}

async function purgeExpiredTrash(): Promise<void> {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 86_400_000;
  const stale = await db.trash.toArray();
  const expired = stale.filter((entry) => new Date(entry.deletedAt).getTime() < cutoff);
  if (expired.length > 0) await db.trash.bulkDelete(expired.map((entry) => entry.id));
}

/** All readings — the single query behind every live screen. */
export async function getAllReadings(): Promise<GlucoseReading[]> {
  return db.readings.toArray();
}

export async function clearReadings(): Promise<void> {
  const all = await db.readings.toArray();
  const { userId } = getAuthState();
  const deletedAt = new Date().toISOString();

  // Everything goes to the bin first: "delete all" is undoable too.
  await db.trash.bulkPut(all.map((reading) => ({ id: reading.id, reading, deletedAt })));
  await db.readings.clear();

  if (userId) {
    // Removing them locally must not leave rows behind in the cloud.
    await db.tombstones.bulkPut(
      all
        .filter((reading) => reading.userId === userId)
        .map((reading) => ({ id: reading.id, deletedAt, userId })),
    );
    requestSync();
  }
}

export async function bulkInsertReadings(readings: GlucoseReading[]): Promise<void> {
  await db.readings.bulkPut(readings);
  requestSync();
}