"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CheckIcon, CloudIcon, DownloadIcon, SignOutIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useSyncState } from "@/hooks/use-sync";
import { db } from "@/db/db";
import { formatLastSync, syncNow, uploadLocalReadings } from "@/lib/supabase/sync";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Account + sync status. Signed out it invites you to back up; signed in it
 * shows the last sync and offers the one-time upload of readings that were
 * logged before the account existed.
 */
export function AccountCard() {
  const { status, userId, email, configured } = useAuth();
  const sync = useSyncState();
  const toast = useToast();

  const [unowned, setUnowned] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void db.readings.toArray().then((all) => {
      if (cancelled) return;
      setTotal(all.length);
      setUnowned(all.filter((reading) => !reading.userId).length);
    });
    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  if (!isSupabaseConfigured() && !configured) {
    return (
      <Card>
        <CardTitle>Cloud backup</CardTitle>
        <p className="text-sm leading-relaxed text-ink-soft">
          Cloud sync is not configured on this install. Your readings are still stored on this device —
          export a JSON backup regularly from <span className="font-medium">Your data</span> below.
        </p>
      </Card>
    );
  }

  if (status === "signed-out" || !userId) {
    return (
      <Card>
        <CardTitle>Cloud backup</CardTitle>
        <p className="text-sm leading-relaxed text-ink-soft">
          Sign in and every reading is copied to your own Supabase database — so clearing browser data
          can never take your history with it again.
        </p>
        <Link href="/sign-in" className="mt-3 block">
          <Button size="lg" fullWidth>
            <CloudIcon className="size-5" />
            Sign in
          </Button>
        </Link>
      </Card>
    );
  }

  const handleUpload = async () => {
    setBusy(true);
    try {
      const count = await uploadLocalReadings(userId);
      setUnowned(0);
      await syncNow();
      toast({
        title: count > 0 ? `${count} readings uploaded` : "Nothing to upload",
        description: count > 0 ? "A copy is now in your cloud database." : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      const result = await syncNow();
      if (result) {
        toast({
          title: "Synced",
          description: `${result.pushed} sent · ${result.pulled} received · ${result.deleted} removed`,
        });
      } else if (sync.status === "error") {
        toast({ title: "Sync failed", description: sync.error ?? undefined, tone: "error" });
      } else {
        toast({ title: "Nothing to sync", tone: "info" });
      }
    } finally {
      setBusy(false);
    }
  };

  const stateLine =
    sync.status === "syncing"
      ? "Syncing…"
      : sync.status === "error"
        ? `Sync error — ${sync.error ?? "unknown"}`
        : `Last synced ${formatLastSync(sync.lastRunAt)}`;

  return (
    <Card>
      <CardTitle
        action={
          <span
            className={
              sync.status === "error"
                ? "text-xs font-semibold text-danger"
                : sync.status === "syncing"
                  ? "text-xs font-semibold text-brand"
                  : "text-xs font-medium text-ink-faint"
            }
          >
            {stateLine}
          </span>
        }
      >
        Cloud backup
      </CardTitle>

      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-surface-muted px-3.5 py-3">
        <CheckIcon className="size-4 shrink-0 text-ok" />
        <p className="truncate text-sm font-medium text-ink">{email}</p>
      </div>

      {unowned > 0 ? (
        <div className="mb-3 rounded-2xl border border-brand/30 bg-brand-soft px-3.5 py-3">
          <p className="text-sm font-semibold text-ink">
            {unowned} reading{unowned === 1 ? "" : "s"} on this device {unowned === 1 ? "is" : "are"} not
            backed up
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Upload them to your account so they survive clearing browser data.
          </p>
          <Button size="lg" fullWidth className="mt-3" onClick={handleUpload} disabled={busy}>
            <UploadIcon className="size-5" />
            Upload {unowned} reading{unowned === 1 ? "" : "s"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button variant="secondary" size="lg" fullWidth onClick={handleSync} disabled={busy}>
          <DownloadIcon className="size-5" />
          Sync now
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={() => setConfirmSignOut(true)}>
          <SignOutIcon className="size-5" />
          Sign out
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        {total} reading{total === 1 ? "" : "s"} on this device. Signing out never deletes anything —
        local readings stay, and cloud copies remain in your account.
      </p>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        description="Your readings stay on this device. To use Shugela on another device, sign in with the same email."
        confirmLabel="Sign out"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          void signOut();
          toast({ title: "Signed out" });
        }}
      />
    </Card>
  );
}