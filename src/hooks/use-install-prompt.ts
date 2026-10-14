"use client";

import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Module level store for the browser install prompt.
 *
 * `beforeinstallprompt` fires once, long before anyone presses a button, so it
 * has to be captured outside of React and read back through a subscription.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listenersAttached = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function ensureListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });
}

function subscribe(callback: () => void) {
  ensureListeners();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Primitive snapshot so React can compare it cheaply. */
function getSnapshot() {
  return `${installed ? "1" : "0"}:${deferredPrompt ? "1" : "0"}`;
}

export function useInstallPrompt() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "0:0");
  const [isInstalled, canInstall] = snapshot === "0:0" ? [false, false] : snapshot.split(":");

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    emit();
    return outcome;
  };

  return { canInstall: canInstall === "1", isInstalled: isInstalled === "1", install };
}