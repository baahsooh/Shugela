import { toMmol, roundForUnit } from "@/lib/glucose";
import { createId, roundTo } from "@/lib/utils";
import { isGlucoseUnit, isMeasurementType } from "@/lib/constants";
import type { GlucoseReading } from "@/lib/types";

/** Local JSON backup / restore. No network involved. */
export interface ExportBundle {
  app: "shugela";
  version: 1;
  exportedAt: string;
  readings: GlucoseReading[];
}

export function buildExportBundle(readings: GlucoseReading[]): ExportBundle {
  return {
    app: "shugela",
    version: 1,
    exportedAt: new Date().toISOString(),
    readings: [...readings].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)),
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readingsFilename(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `shugela-readings-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Tolerant importer: ignores unknown records instead of rejecting the whole file. */
export function parseReadingsFile(text: string): {
  readings: GlucoseReading[];
  skipped: number;
} {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON");
  }

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as ExportBundle)?.readings)
      ? (payload as ExportBundle).readings
      : null;

  if (!list) throw new Error("No readings array found in that file");

  const readings: GlucoseReading[] = [];
  let skipped = 0;

  for (const entry of list) {
    const reading = normaliseImported(entry);
    if (reading) readings.push(reading);
    else skipped += 1;
  }

  if (readings.length === 0) throw new Error("No valid readings found in that file");
  return { readings, skipped };
}

function normaliseImported(entry: unknown): GlucoseReading | null {
  if (typeof entry !== "object" || entry === null) return null;
  const raw = entry as Record<string, unknown>;

  const measuredAt = typeof raw.measuredAt === "string" ? new Date(raw.measuredAt) : null;
  if (!measuredAt || Number.isNaN(measuredAt.getTime())) return null;
  if (!isMeasurementType(raw.measurementType)) return null;

  const enteredUnit = isGlucoseUnit(raw.enteredUnit) ? raw.enteredUnit : "mmol/L";
  const enteredValueRaw = Number(raw.enteredValue);
  const glucoseRaw = Number(raw.glucoseMmol);
  const enteredValue = Number.isFinite(enteredValueRaw)
    ? roundForUnit(enteredValueRaw, enteredUnit)
    : Number.NaN;

  if (!Number.isFinite(enteredValue) || enteredValue <= 0) return null;

  const glucoseMmol = Number.isFinite(glucoseRaw) && glucoseRaw > 0
    ? roundTo(glucoseRaw, 2)
    : toMmol(enteredValue, enteredUnit);

  const note = typeof raw.note === "string" && raw.note.trim() ? raw.note.trim().slice(0, 280) : undefined;
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : measuredAt.toISOString();

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId(),
    glucoseMmol,
    enteredValue,
    enteredUnit,
    measurementType: raw.measurementType,
    measuredAt: measuredAt.toISOString(),
    ...(note ? { note } : {}),
    source: "manual",
    createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt,
  };
}