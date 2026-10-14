"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** True once the component has mounted on the client (false during SSR). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Reactive `navigator.onLine`, without a setState-in-effect cascade. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true,
  );
}