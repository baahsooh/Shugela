import { db } from "./db";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { createId } from "@/lib/utils";
import { getAuthState } from "@/hooks/use-auth";
import { requestSync } from "@/lib/supabase/sync";
import { doseSlotKey, type DoseLog, type DoseStatus, type Medication } from "@/lib/types";

/* ----------------------------------------------------------- medications --- */

export async function getMedications(includeInactive = false): Promise<Medication[]> {
  const all = await db.medications.toArray();
  const list = includeInactive ? all : all.filter((med) => med.active);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveMedication(input: {
  id?: string;
  name: string;
  dose?: string;
  schedule: string[];
}): Promise<Medication> {
  const now = new Date().toISOString();
  const { userId } = getAuthState();
  const existing = input.id ? await db.medications.get(input.id) : undefined;

  const medication: Medication = {
    id: existing?.id ?? createId(),
    name: input.name.trim(),
    ...(input.dose?.trim() ? { dose: input.dose.trim() } : {}),
    schedule: [...new Set(input.schedule)].sort(),
    active: existing?.active ?? true,
    ...(userId ? { userId } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.medications.put(medication);
  requestSync();
  return medication;
}

export async function setMedicationActive(id: string, active: boolean): Promise<void> {
  const medication = await db.medications.get(id);
  if (!medication) return;
  await db.medications.put({ ...medication, active, updatedAt: new Date().toISOString() });
  requestSync();
}

export async function deleteMedication(id: string): Promise<void> {
  await db.medications.delete(id);
  requestSync();
}

/* ------------------------------------------------------------- dose logs --- */

export async function getDoseLogs(days = 1): Promise<DoseLog[]> {
  const from = startOfDay(addDays(new Date(), -(days - 1)));
  return db.doseLogs.where("takenAt").above(from.toISOString()).reverse().sortBy("takenAt");
}

/** Logs taken on one calendar day, keyed by medication + scheduled slot. */
export async function getDoseLogsForDay(date: Date = new Date()): Promise<DoseLog[]> {
  const from = startOfDay(date);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const all = await db.doseLogs
    .where("takenAt")
    .between(from.toISOString(), to.toISOString(), true, false)
    .toArray();

  return all.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

/** Mark a scheduled slot as taken or skipped. Idempotent per slot per day. */
export async function recordDose(input: {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  status: DoseStatus;
  takenAt?: string;
  note?: string;
}): Promise<DoseLog> {
  const now = new Date().toISOString();
  const { userId } = getAuthState();
  const key = dayKey(new Date(input.takenAt ?? now));

  const existing = await db.doseLogs
    .where("[medicationId+scheduledTime]")
    .equals([input.medicationId, input.scheduledTime])
    .filter((log) => dayKey(new Date(log.takenAt)) === key)
    .first();

  const log: DoseLog = {
    id: existing?.id ?? `${doseSlotKey(input.medicationId, input.scheduledTime, key)}-${createId().slice(0, 8)}`,
    medicationId: input.medicationId,
    medicationName: input.medicationName,
    scheduledTime: input.scheduledTime,
    takenAt: input.takenAt ?? now,
    status: input.status,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(userId ? { userId } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.doseLogs.put(log);
  requestSync();
  return log;
}

export async function clearDoseLog(id: string): Promise<void> {
  await db.doseLogs.delete(id);
  requestSync();
}

/* ------------------------------------------------------------ adherence --- */

export interface Adherence {
  scheduled: number;
  taken: number;
  skipped: number;
  missed: number;
  /** 0–1 across scheduled doses that are already in the past. */
  ratio: number;
}

/** Dose logs inside the adherence window (I/O only — the maths below is pure). */
export async function getAdherenceLogs(
  days: number,
  now: Date = new Date(),
): Promise<DoseLog[]> {
  const from = startOfDay(addDays(startOfDay(now), -(days - 1)));
  return db.doseLogs
    .where("takenAt")
    .between(from.toISOString(), now.toISOString(), true, true)
    .toArray();
}

/**
 * How well the schedule was kept over a window.
 *
 * Pure on purpose: the caller feeds it medications and logs, so a live query can
 * hand it fresh data on every write. Only doses whose scheduled time has already
 * passed count, so this morning's 21:00 insulin cannot drag down the score at 09:00.
 */
export function calculateAdherence(
  medications: Medication[],
  logs: DoseLog[],
  days: number,
  now: Date = new Date(),
): Adherence {
  const active = medications.filter((med) => med.active);
  if (active.length === 0) {
    return { scheduled: 0, taken: 0, skipped: 0, missed: 0, ratio: 1 };
  }

  const from = startOfDay(addDays(startOfDay(now), -(days - 1)));

  const bySlot = new Map<string, DoseLog>();
  for (const log of logs) {
    bySlot.set(`${log.medicationId}|${log.scheduledTime}|${dayKey(new Date(log.takenAt))}`, log);
  }

  let scheduled = 0;
  let taken = 0;
  let skipped = 0;
  let missed = 0;

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(from, offset);
    const key = dayKey(date);

    for (const medication of active) {
      for (const time of medication.schedule) {
        const [hours, minutes] = time.split(":").map(Number);
        const scheduledAt = new Date(date);
        scheduledAt.setHours(hours, minutes, 0, 0);

        // Future slots today are not part of the score yet.
        if (scheduledAt.getTime() > now.getTime()) continue;

        scheduled += 1;
        const log = bySlot.get(`${medication.id}|${time}|${key}`);

        if (log?.status === "taken") taken += 1;
        else if (log?.status === "skipped") skipped += 1;
        else missed += 1;
      }
    }
  }

  const resolved = taken + skipped + missed;
  return {
    scheduled,
    taken,
    skipped,
    missed,
    ratio: resolved === 0 ? 1 : (taken + skipped) / resolved,
  };
}