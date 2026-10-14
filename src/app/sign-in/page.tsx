"use client";

import Link from "next/link";
import { useState } from "react";

import { CheckIcon, DropletIcon, ShieldIcon } from "@/components/icons";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAuth, sendMagicLink } from "@/hooks/use-auth";

export default function SignInPage() {
  const { configured, status, email: signedInEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }

    setState("sending");
    const failure = await sendMagicLink(trimmed);
    if (failure) {
      setError(failure);
      setState("idle");
      return;
    }
    setState("sent");
  };

  return (
    <>
      <PageHeader title="Cloud backup" subtitle="Keep a copy of your readings" backHref="/settings" />

      <PageBody>
        <div className="flex flex-col items-center gap-2 pt-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <DropletIcon className="size-7" />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {status === "signed-in" ? "You are signed in" : "Sign in to sync"}
          </h2>
        </div>

        {status === "signed-in" ? (
          <div className="rounded-3xl border border-line bg-surface p-5 text-center shadow-card">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-ok">
              <CheckIcon className="size-4" />
              {signedInEmail}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              Your readings are backed up automatically whenever the app is open, and restored on any
              other device you sign in from.
            </p>
            <Link href="/settings">
              <Button variant="secondary" size="lg" fullWidth className="mt-4">
                Back to settings
              </Button>
            </Link>
          </div>
        ) : state === "sent" ? (
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <p className="text-sm font-semibold text-ink">Check your inbox</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              We sent a sign-in link to <span className="font-semibold">{email.trim()}</span>. Open it
              on this device and you will be signed in automatically.
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              The link expires in an hour. Still nothing? Check spam, or send another.
            </p>
            <Button variant="secondary" size="lg" fullWidth className="mt-4" onClick={() => setState("idle")}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-13 w-full rounded-2xl border border-line bg-surface-muted px-4 text-base text-ink placeholder:text-ink-faint/70"
              />
              {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}

              <Button type="submit" size="lg" fullWidth className="mt-4" disabled={state === "sending" || !configured}>
                {state === "sending" ? "Sending…" : "Email me a sign-in link"}
              </Button>

              {!configured ? (
                <p className="mt-3 text-xs leading-relaxed text-warn">
                  Cloud sync is not configured on this install. Add the Supabase keys to
                  <span className="font-mono"> .env.local</span> to enable it. Your readings still work
                  locally.
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-faint">
              <ShieldIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                No password. Readings are stored in your own Supabase database and are readable by you
                only — Row Level Security policies block every other account.
              </p>
            </div>
          </form>
        )}
      </PageBody>
    </>
  );
}