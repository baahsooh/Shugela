import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase access is optional.
 *
 * When the env vars are missing (or the app is running somewhere that was never
 * configured) every sync path becomes a no-op and Shugela keeps working as a
 * pure local-first app. Nothing here throws.
 */

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

/** Trimmed + validated so a stray space or newline in .env.local is caught early. */
export function supabaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(raw)) {
    if (typeof console !== "undefined") {
      console.warn(
        "[shugela] NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL " +
          `(got "${raw}"). Copy it again from Project Settings → API.`,
      );
    }
    return null;
  }
  return raw.replace(/\/+$/, "");
}

export function supabaseAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
}

/** Lazily created singleton; `null` when Supabase is not configured. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  client = url && anonKey ? createClient(url, anonKey, defaultOptions()) : null;
  return client;
}

function defaultOptions() {
  return {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "shugela-auth",
    },
    global: {
      headers: { "x-application-name": "shugela" },
    },
  } as const;
}