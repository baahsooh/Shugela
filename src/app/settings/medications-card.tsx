"use client";

import Link from "next/link";
import { useState } from "react";

import { PillIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MedicationSheet } from "@/app/pills/page";
import { useLiveQuery } from "dexie-react-hooks";
import { deleteMedication, getMedications, setMedicationActive } from "@/db/medications";
import { cn } from "@/lib/utils";
import type { Medication } from "@/lib/types";

/** Medication schedule management, reachable from Settings and from Pills. */
export function MedicationsCard() {
  const medications = useLiveQuery(() => getMedications(true), [], []);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Medication | null>(null);

  return (
    <Card id="medications">
      <CardTitle
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-semibold text-brand"
          >
            <PlusIcon className="size-3.5" />
            Add
          </button>
        }
      >
        Medications
      </CardTitle>

      {medications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <PillIcon className="size-6 text-ink-faint" />
          <p className="text-sm text-ink-faint">
            Add your medicines and their times, then tick them off each day.
          </p>
          <Link href="/pills">
            <Button variant="secondary" size="sm">
              Go to today&apos;s checklist
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {medications.map((medication) => (
            <li key={medication.id} className="flex items-center gap-3 py-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={medication.active}
                aria-label={`${medication.active ? "Pause" : "Resume"} ${medication.name}`}
                onClick={() =>
                  setMedicationActive(medication.id, !medication.active)
                }
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  medication.active ? "bg-ok" : "bg-surface-sunken",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    medication.active ? "translate-x-[1.4rem]" : "translate-x-0.5",
                  )}
                />
              </button>

              <button
                type="button"
                onClick={() => setEditing(medication)}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={cn(
                    "block truncate text-sm font-semibold",
                    medication.active ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {medication.name}
                  {medication.dose ? (
                    <span className="ml-1 font-normal text-ink-faint">{medication.dose}</span>
                  ) : null}
                </span>
                <span className="tabular block text-xs text-ink-faint">
                  {medication.schedule.join(" · ") || "no times"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmDelete(medication)}
                className="shrink-0 text-xs font-semibold text-ink-faint"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-ink-faint">
        Paused medicines stay in your list but stop appearing on the daily checklist.
      </p>

      {adding || editing ? (
        <MedicationSheet
          medication={editing ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Remove ${confirmDelete?.name}?`}
        description="Its schedule is deleted. Dose history is kept."
        confirmLabel="Remove"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await deleteMedication(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </Card>
  );
}

