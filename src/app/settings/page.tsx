"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  CheckIcon,
  DownloadIcon,
  DropletIcon,
  MoonIcon,
  ShieldIcon,
  SparkleIcon,
  SunIcon,
  SystemIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { clearReadings, bulkInsertReadings } from "@/db/readings";
import { estimateStorageUsage, requestPersistentStorage } from "@/db/db";
import { seedDemoData } from "@/db/seed";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useReadings } from "@/hooks/use-readings";
import { useSettings } from "@/hooks/use-settings";
import { MEASUREMENT_TYPES, UNITS } from "@/lib/constants";
import { buildExportBundle, downloadJson, parseReadingsFile, readingsFilename } from "@/lib/transfer";
import type { GlucoseUnit, ThemePreference } from "@/lib/types";
import { AccountCard } from "./account-card";
import { TargetRangeEditor } from "./target-range-editor";
import { TrashCard } from "./trash-card";
import { MedicationsCard } from "./medications-card";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const { settings, unit, theme, update, isLoading } = useSettings();
  const { readings } = useReadings();
  const toast = useToast();
  const { canInstall, isInstalled, install } = useInstallPrompt();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);

  useEffect(() => {
    void (async () => {
      const usage = await estimateStorageUsage();
      const persisted = await requestPersistentStorage();
      setStorage(usage ? { ...usage, persisted } : null);
    })();
  }, []);

  const handleUnitChange = async (next: GlucoseUnit) => {
    await update({ unit: next });
    toast({
      title: `Switched to ${next}`,
      description: "Existing readings keep their original entered value.",
    });
  };

  const handleExport = () => {
    downloadJson(readingsFilename(), buildExportBundle(readings));
    toast({ title: "Export ready", description: `${readings.length} readings saved to a JSON file.` });
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const { readings: parsed, skipped } = parseReadingsFile(text);
      await bulkInsertReadings(parsed);
      toast({
        title: "Import complete",
        description: `${parsed.length} readings added${skipped ? ` · ${skipped} skipped` : ""}.`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const created = await seedDemoData({ days: 30, replace: false });
      toast({ title: "Sample data added", description: `${created} demo readings created.` });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    await clearReadings();
    toast({ title: "All readings deleted" });
  };

  const handleInstall = async () => {
    const result = await install();
    if (result === "accepted") toast({ title: "Shugela installed" });
    else if (result === "unavailable") {
      toast({
        title: "Install from the browser menu",
        description: "Use “Add to Home Screen” in your browser’s share menu.",
        tone: "info",
      });
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Stored locally on this device" />

      <PageBody>
        <TrashCard />
        <MedicationsCard />
        <AccountCard />

        <Card>
          <CardTitle>Units</CardTitle>
          <SegmentedControl<GlucoseUnit>
            label="Preferred unit"
            value={unit}
            onChange={handleUnitChange}
            options={UNITS.map((value) => ({ value, label: value }))}
          />
          <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
            Readings are always stored in mmol/L. mg/dL entries are converted automatically
            (1 mmol/L = 18.016 mg/dL), and your original number is kept for reference.
          </p>
        </Card>

        <Card>
          <CardTitle>Appearance</CardTitle>
          <SegmentedControl<ThemePreference>
            label="Theme"
            value={theme}
            onChange={(next) => void update({ theme: next })}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Card>

        <TargetRangeEditor />

        <Card>
          <CardTitle>Your data</CardTitle>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-2xl bg-surface-muted px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {isLoading ? "—" : `${readings.length} reading${readings.length === 1 ? "" : "s"}`}
                </p>
<p className="text-xs text-ink-faint">
              {storage
                ? `${formatBytes(storage.usage)} on this device${storage.persisted ? " · protected from auto-clearing" : ""}`
                : "Saved in this browser’s IndexedDB"}
            </p>
              </div>
              <DropletIcon className="size-5 shrink-0 text-ink-faint" />
            </div>

            <Button variant="secondary" size="lg" fullWidth onClick={handleExport} disabled={readings.length === 0}>
              <DownloadIcon className="size-5" />
              Export as JSON
            </Button>

            <Button variant="secondary" size="lg" fullWidth onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className="size-5" />
              Import from JSON
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
                event.target.value = "";
              }}
            />

            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => setConfirmClear(true)}
              disabled={readings.length === 0}
            >
              <TrashIcon className="size-5" />
              Delete all readings
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Developer tools</CardTitle>
          <p className="mb-3 text-xs leading-relaxed text-ink-faint">
            Loads 30 days of deterministic demo readings so the charts have something to show.
            Existing readings are kept.
          </p>
          <Button variant="secondary" size="lg" fullWidth onClick={handleSeed} disabled={isSeeding}>
            <SparkleIcon className="size-5" />
            {isSeeding ? "Generating…" : "Load sample data"}
          </Button>
          {settings?.hasSeededDemoData ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ok">
              <CheckIcon className="size-3.5" />
              Sample data has been loaded at least once
            </p>
          ) : null}
        </Card>

        <Card>
          <CardTitle>Install</CardTitle>
          {isInstalled ? (
            <p className="flex items-center gap-2 text-sm font-medium text-ok">
              <CheckIcon className="size-4" />
              Running as an installed app
            </p>
          ) : (
            <>
              <Button variant="primary" size="lg" fullWidth onClick={handleInstall} disabled={!canInstall}>
                <DownloadIcon className="size-5" />
                {canInstall ? "Install Shugela" : "Install from browser menu"}
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                iOS: Share → Add to Home Screen. Android/Chrome: menu → Install app.
              </p>
            </>
          )}
        </Card>

        <Card>
          <CardTitle>About</CardTitle>
          <div className="flex flex-col gap-3 text-sm text-ink-soft">
            <p className="flex items-start gap-2">
              <ShieldIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Shugela keeps everything on your device. There is no account, no sync and no
              analytics — clearing browser data erases your log, so export a backup if it matters.
            </p>
            <p className="flex items-start gap-2">
              <SunIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Shugela is a logging tool, not a medical device. Target ranges are a guide only —
              follow the plan your clinician gave you.
            </p>
            <p className="flex items-start gap-2">
              <MoonIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Works fully offline: readings, trends and settings never leave this phone.
            </p>
          </div>
          <Link
            href="/trends"
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand"
          >
            <SystemIcon className="size-3.5" />
            Back to your trends
          </Link>
        </Card>

        <p className="pb-2 text-center text-[0.7rem] text-ink-faint">
          {MEASUREMENT_TYPES.length} measurement types · v0.1.0
        </p>
      </PageBody>

      <ConfirmDialog
        open={confirmClear}
        title="Delete every reading?"
        description={`${readings.length} readings will be permanently removed from this device. Export a backup first if you might need them.`}
        confirmLabel="Delete all"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={handleClear}
      />
    </>
  );
}