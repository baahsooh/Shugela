"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { CalendarCheckIcon, CheckIcon, PillIcon, PlusIcon, SettingsIcon } from "@/components/icons";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  calculateAdherence,
  clearDoseLog,
  getAdherenceLogs,
  getDoseLogsForDay,
  getMedications,
  recordDose,
  saveMedication,
} from "@/db/medications";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DoseLog, Medication } from "@/lib/types";

interface Slot {
  medication: Medication;
  scheduledTime: string;
  log: DoseLog | undefined;
  due: boolean;
}

export default function PillsPage() {
  // Live queries keep the checklist in step with any write — including the
  // ones that happen on another device after a sync.
const medications = useLiveQuery(() => getMedications(), [], []);
  const logs = useLiveQuery(() => getDoseLogsForDay(), [], []);
  // No `now` is passed: the querier must use the clock at the moment it runs,
  // otherwise a dose logged after mount falls outside the frozen upper bound.
  const weekLogs = useLiveQuery(() => getAdherenceLogs(7), [], []);
  const [adding, setAdding] = useState(false);

  const now = useMemo(() => new Date(), []);
  const stats = useMemo(
    () => calculateAdherence(medications, weekLogs, 7, now),
    [medications, weekLogs, now],
  );
  const loading = weekLogs === undefined;

  const slots = useMemo<Slot[]>(() => {
    const bySlot = new Map(logs.map((log) => [`${log.medicationId}|${log.scheduledTime}`, log]));

    return medications
      .flatMap((medication) =>
        medication.schedule.map((scheduledTime) => {
          const [hours, minutes] = scheduledTime.split(":").map(Number);
          const due = new Date(now);
          due.setHours(hours, minutes, 0, 0);

          return {
            medication,
            scheduledTime,
            log: bySlot.get(`${medication.id}|${scheduledTime}`),
            due: due.getTime() <= now.getTime(),
          };
        }),
      )
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [medications, logs, now]);

  const toggle = async (slot: Slot, status: "taken" | "skipped") => {
    if (slot.log) {
      // Tapping the same state again clears it, so a mis-tap is recoverable.
      await clearDoseLog(slot.log.id);
    } else {
      await recordDose({
        medicationId: slot.medication.id,
        medicationName: slot.medication.name,
        scheduledTime: slot.scheduledTime,
        status,
      });
    }
  };

  const takenCount = slots.filter((slot) => slot.log?.status === "taken").length;

  return (
    <>
      <PageHeader
        title="Pills"
        subtitle={loading ? "Loading…" : `${takenCount} of ${slots.length} taken today`}
        action={
          <Link
            href="/settings"
            aria-label="Medication settings"
            className="flex size-10 items-center justify-center rounded-full text-ink-soft active:bg-surface-muted"
          >
            <SettingsIcon className="size-5" />
          </Link>
        }
      />

      <PageBody>
        {medications.length > 0 ? (
          <Card>
            <CardTitle
              action={
                <span className="text-xs font-medium text-ink-faint">last 7 days</span>
              }
            >
              Adherence
            </CardTitle>
            <div className="flex items-end gap-3">
              <p className="tabular text-3xl font-semibold leading-none text-ink">
                {Math.round(stats.ratio * 100)}
                <span className="text-lg text-ink-faint">%</span>
              </p>
              <p className="pb-0.5 text-xs text-ink-faint">
                {stats.taken} of {stats.scheduled} doses
              </p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-ok transition-[width] duration-500"
                style={{ width: `${Math.round(stats.ratio * 100)}%` }}
              />
            </div>
          </Card>
        ) : null}

        {medications.length === 0 && !loading ? (
          <EmptyState
            icon={<PillIcon className="size-6" />}
            title="No medications yet"
            description="Add your medicines and their times in Settings, then tick them off here each day."
            action={
              <Link href="/settings#medications">
                <Button size="lg">
                  <PlusIcon className="size-5" />
                  Add a medication
                </Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <CardTitle>Today</CardTitle>

            {slots.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-faint">
                No doses scheduled for today.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {slots.map((slot) => {
                  const key = `${slot.medication.id}|${slot.scheduledTime}`;
                  const state = slot.log?.status;
                  return (
                    <li key={key} className="flex items-center gap-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggle(slot, "taken")}
                        aria-label={`Mark ${slot.medication.name} at ${slot.scheduledTime} as taken`}
                        aria-pressed={state === "taken"}
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors",
                          state === "taken"
                            ? "border-ok bg-ok text-white"
                            : "border-line bg-surface text-transparent",
                        )}
                      >
                        <CheckIcon className="size-5" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            state === "skipped" ? "text-ink-faint line-through" : "text-ink",
                          )}
                        >
                          {slot.medication.name}
                          {slot.medication.dose ? (
                            <span className="ml-1 font-normal text-ink-faint">{slot.medication.dose}</span>
                          ) : null}
                        </p>
                        <p className="tabular text-xs text-ink-faint">
                          {slot.scheduledTime}
                          {state === "taken" && slot.log
                            ? ` · taken ${formatTime(new Date(slot.log.takenAt))}`
                            : state === "skipped"
                              ? " · skipped"
                              : !slot.due
                                ? " · later today"
                                : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggle(slot, "skipped")}
                        aria-pressed={state === "skipped"}
                        className={cn(
                          "h-9 shrink-0 rounded-xl px-3 text-xs font-semibold transition-colors",
                          state === "skipped"
                            ? "bg-danger-soft text-danger"
                            : "bg-surface-muted text-ink-faint",
                        )}
                      >
                        Skip
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        <Card>
          <CardTitle
            action={
              <span className="tabular text-xs text-ink-faint">
                {logs.filter((log) => log.status === "taken").length} taken
              </span>
            }
          >
            <span className="flex items-center gap-1.5">
              <CalendarCheckIcon className="size-4" />
              Recent doses
            </span>
          </CardTitle>

          {logs.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink-faint">Nothing logged yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {logs.slice(0, 12).map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      log.status === "taken" ? "bg-ok" : "bg-danger",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{log.medicationName}</span>
                    <span className="tabular block text-xs text-ink-faint">
                      {new Date(log.takenAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {" · scheduled "}
                      {log.scheduledTime}
                      {log.status === "skipped" ? " · skipped" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await clearDoseLog(log.id);
                    }}
                    className="shrink-0 text-xs font-semibold text-ink-faint"
                  >
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageBody>

      {adding ? (
        <MedicationSheet
          onClose={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      ) : null}
    </>
  );
}

export function MedicationSheet({
  medication,
  onClose,
  onSaved,
}: {
  medication?: Medication;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(medication?.name ?? "");
  const [dose, setDose] = useState(medication?.dose ?? "");
  const [times, setTimes] = useState<string[]>(medication?.schedule ?? ["08:00"]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="animate-sheet max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          {medication ? "Edit medication" : "New medication"}
        </h2>

        {error ? <p className="mb-2 text-xs font-medium text-danger">{error}</p> : null}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Metformin"
              className="h-12 rounded-2xl border border-line bg-surface px-3.5 text-base"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Dose (optional)</span>
            <input
              value={dose}
              onChange={(event) => setDose(event.target.value)}
              placeholder="500 mg"
              className="h-12 rounded-2xl border border-line bg-surface px-3.5 text-base"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Times of day</span>
            <div className="flex flex-wrap gap-2">
              {times.map((time, index) => (
                <div key={`${time}-${index}`} className="flex items-center gap-1">
                  <input
                    type="time"
                    value={time}
                    onChange={(event) =>
                      setTimes((current) =>
                        current.map((entry, i) => (i === index ? event.target.value : entry)),
                      )
                    }
                    className="h-11 rounded-xl border border-line bg-surface px-2.5 text-sm tabular"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${time}`}
                    onClick={() => setTimes((current) => current.filter((_, i) => i !== index))}
                    className="flex size-8 items-center justify-center rounded-lg bg-surface-muted text-xs text-ink-faint"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTimes((current) => [...current, "12:00"])}
                className="flex h-11 items-center gap-1 rounded-xl border border-line px-3 text-xs font-semibold text-ink-soft"
              >
                <PlusIcon className="size-3.5" />
                Add time
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            fullWidth
            onClick={async () => {
              const clean = times.filter((time) => /^\d{2}:\d{2}$/.test(time));
              if (!name.trim()) return setError("Give the medication a name");
              if (clean.length === 0) return setError("Add at least one time of day");
              await saveMedication({ id: medication?.id, name, dose, schedule: clean });
              await onSaved();
            }}
          >
            Save
          </Button>
        </div>

        {medication ? (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            className="mt-2"
            onClick={() => setConfirmDelete(true)}
          >
            Remove medication
          </Button>
        ) : null}

        <ConfirmDialog
          open={confirmDelete}
          title={`Remove ${medication?.name}?`}
          description="Its schedule is deleted. Dose history is kept."
          confirmLabel="Remove"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const { deleteMedication } = await import("@/db/medications");
            await deleteMedication(medication!.id);
            setConfirmDelete(false);
            await onSaved();
          }}
        />
      </div>
    </div>
  );
}