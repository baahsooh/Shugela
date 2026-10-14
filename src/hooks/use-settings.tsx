"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { ensureSettings, getStoredSettings, updateSettings as persistSettings } from "@/db/settings";
import { DEFAULT_TARGET_RANGES } from "@/lib/constants";
import type { AppSettings, GlucoseUnit, TargetRanges, ThemePreference } from "@/lib/types";

interface SettingsContextValue {
  settings: AppSettings | undefined;
  unit: GlucoseUnit;
  theme: ThemePreference;
  targetRanges: TargetRanges;
  isLoading: boolean;
  update: (patch: Partial<Omit<AppSettings, "id" | "createdAt">>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(callback: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Read-only querier: Dexie forbids writes inside liveQuery.
  const settings = useLiveQuery(() => getStoredSettings(), [], undefined);

  // Seed the singleton row on first launch (outside of the querier).
  useEffect(() => {
    void ensureSettings();
  }, []);

  const systemPrefersDark = useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );

  const theme = settings?.theme ?? "system";
  const isDark = theme === "system" ? systemPrefersDark : theme === "dark";

  // Side effect only: mirror the resolved theme onto <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";

    // Keep the OS/browser status bar in step with the app theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0a0a0a" : "#f5f5f5");
  }, [isDark]);

  const update = useCallback(
    async (patch: Partial<Omit<AppSettings, "id" | "createdAt">>) => {
      await persistSettings(patch);
    },
    [],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      unit: settings?.unit ?? "mmol/L",
      theme,
      targetRanges: settings?.targetRanges ?? DEFAULT_TARGET_RANGES,
      isLoading: settings === undefined,
      update,
    }),
    [settings, theme, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside <SettingsProvider>");
  return context;
}