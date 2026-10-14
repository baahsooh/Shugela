import { DEFAULT_TARGET_RANGES } from "@/lib/constants";
import { SETTINGS_ID, type AppSettings } from "@/lib/types";
import { getAuthState } from "@/hooks/use-auth";
import { requestSync } from "@/lib/supabase/sync";
import { db } from "./db";

export function createDefaultSettings(
  overrides: Partial<Omit<AppSettings, "id" | "createdAt" | "updatedAt">> = {},
): AppSettings {
  const now = new Date().toISOString();
  return {
    id: SETTINGS_ID,
    unit: "mmol/L",
    theme: "system",
    targetRanges: structuredClone(DEFAULT_TARGET_RANGES),
    hasSeededDemoData: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Read-only lookup.
 *
 * IMPORTANT: this runs inside a Dexie `liveQuery`, which rejects any read-write
 * transaction. Seeding the default row therefore has to happen outside of the
 * querier — see `ensureSettings`.
 */
export async function getStoredSettings(): Promise<AppSettings | undefined> {
  const existing = await db.settings.get(SETTINGS_ID);
  if (!existing) return undefined;

  // Backfill any keys added in a later version of the app.
  return {
    ...existing,
    targetRanges: { ...DEFAULT_TARGET_RANGES, ...existing.targetRanges },
  };
}

/** Get-or-create the singleton settings row. Safe to call from event handlers. */
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await getStoredSettings();
  if (existing) return existing;

  const defaults = createDefaultSettings();
  await db.settings.put(defaults);
  return defaults;
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, "id" | "createdAt">>,
): Promise<void> {
  const current = await ensureSettings();
  await db.settings.put({
    ...current,
    ...patch,
    id: SETTINGS_ID,
    updatedAt: new Date().toISOString(),
  });

  const { userId } = getAuthState();
  if (userId) requestSync();
}

export async function setHasSeededDemoData(value: boolean): Promise<void> {
  const current = await ensureSettings();
  if (current.hasSeededDemoData === value) return;
  await updateSettings({ hasSeededDemoData: value });
}
