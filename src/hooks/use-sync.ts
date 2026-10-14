"use client";

import { useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  getSyncSnapshot,
  parseSyncSnapshot,
  subscribeToSync,
  syncNow,
  type SyncStatus,
} from "@/lib/supabase/sync";

export interface SyncState {
  status: SyncStatus;
  lastRunAt: string | null;
  error: string | null;
}

const SERVER_SNAPSHOT = "idle~~";

export function useSyncState(): SyncState {
  const snapshot = useSyncExternalStore(subscribeToSync, getSyncSnapshot, () => SERVER_SNAPSHOT);
  return parseSyncSnapshot(snapshot);
}

/**
 * Drives background sync: on sign-in, when the app regains focus and when the
 * browser comes back online.
 */
export function SyncRunner() {
  const { userId, status } = useAuth();

  useEffect(() => {
    if (!userId || status !== "signed-in") return;
    void syncNow();
  }, [userId, status]);

  useEffect(() => {
    if (!userId) return;

    const onWake = () => {
      void syncNow();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onWake();
    };

    window.addEventListener("online", onWake);
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onWake);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  return null;
}