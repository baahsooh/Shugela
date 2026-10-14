"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthSnapshot {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** False when the app has no Supabase env vars — sync is then disabled. */
  configured: boolean;
}

const SIGNED_OUT: AuthSnapshot = {
  status: "signed-out",
  userId: null,
  email: null,
  configured: false,
};

/**
 * Module level auth store.
 *
 * Supabase owns the session and pushes changes to us, so it lives outside React
 * and is read back through `useSyncExternalStore` (no setState-in-effect).
 */
let state: AuthSnapshot = { ...SIGNED_OUT, configured: isSupabaseConfigured() };
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function applySession(session: Session | null) {
  const configured = isSupabaseConfigured();
  const user = session?.user ?? null;
  const next: AuthSnapshot = user
    ? { status: "signed-in", userId: user.id, email: user.email ?? null, configured }
    : { status: "signed-out", userId: null, email: null, configured };

  // Keep the same object reference when nothing changed so React can bail out.
  if (
    next.status === state.status &&
    next.userId === state.userId &&
    next.email === state.email &&
    next.configured === state.configured
  ) {
    return;
  }
  state = next;
  emit();
}

function start() {
  if (started) return;
  started = true;

  const supabase = getSupabase();
  if (!supabase) {
    state = { ...SIGNED_OUT, configured: false };
    emit();
    return;
  }

  void supabase.auth.getSession().then(({ data }) => applySession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => applySession(session));
}

function subscribe(callback: () => void) {
  start();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): AuthSnapshot {
  return state;
}

function getServerSnapshot(): AuthSnapshot {
  return SIGNED_OUT;
}

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-reactive access, for the sync engine and event handlers. */
export function getAuthState(): AuthSnapshot {
  start();
  return state;
}

/**
 * GoTrue errors arrive as `{ code, message }`. Developers want the code, users
 * want to know what to do next — this maps the common ones to plain English.
 */
function friendlyAuthError(code: string, message: string): string {
  const key = code.toLowerCase();

  if (key.includes("over_email_send_rate_limit")) {
    return "A link was just sent. Wait about a minute before asking for another.";
  }
  if (key.includes("over_request_rate_limit") || key.includes("over_email_address")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (key.includes("email_address_invalid") || /is invalid/i.test(message)) {
    return "That email address does not look right. Check it and try again.";
  }
  if (key.includes("signups_not_allowed")) {
    return "New sign-ups are switched off for this project. Turn them on under Authentication → Providers → Email.";
  }
  if (key.includes("redirect_to_not_allowed") || key.includes("invalid_redirect")) {
    return "This site is not a trusted sign-in address yet. Add it under Authentication → URL Configuration → Redirect URLs.";
  }
  if (key.includes("otp_expired")) {
    return "That link has expired. Request a new one.";
  }
  if (/fetch|network|resolve/i.test(message) || key.includes("failed")) {
    return `Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local.`;
  }
  return message;
}

export async function sendMagicLink(email: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return "Cloud sync is not configured on this install — check the Supabase keys in .env.local";
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/` },
  });

  return error ? friendlyAuthError(error.code ?? "", error.message) : null;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}