"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ReadingForm } from "@/components/forms/reading-form";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteReading, updateReading } from "@/db/readings";
import { useMounted } from "@/hooks/use-environment";
import { useReadings } from "@/hooks/use-readings";
import { useSettings } from "@/hooks/use-settings";
import { toDateTimeLocalValue } from "@/lib/dates";
import { formatGlucose, fromMmol } from "@/lib/glucose";
import type { ReadingDraft } from "@/lib/types";

export default function EditReadingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const mounted = useMounted();
  const { unit } = useSettings();
  const { readings, isLoading } = useReadings();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const id = typeof params?.id === "string" ? params.id : undefined;
  const reading = readings.find((item) => item.id === id);

  if (!mounted || isLoading) {
    return (
      <>
        <PageHeader title="Edit reading" backHref="/history" />
        <PageBody>
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-40 w-full" />
        </PageBody>
      </>
    );
  }

  if (!reading) {
    return (
      <>
        <PageHeader title="Edit reading" backHref="/history" />
        <PageBody>
          <EmptyState
            title="Reading not found"
            description="It may have been deleted from another screen."
            action={
              <Link href="/history">
                <Button variant="secondary">Back to history</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  const handleSubmit = async (draft: ReadingDraft) => {
    await updateReading(reading.id, draft);
    toast({ title: "Reading updated", description: `${formatGlucose(draft.enteredValue, unit)} ${unit}` });
    router.replace("/history");
  };

  const handleDelete = async () => {
    await deleteReading(reading.id);
    toast({ title: "Reading deleted" });
    router.replace("/history");
  };

  return (
    <>
      <PageHeader
        title="Edit reading"
        subtitle={`Logged ${formatGlucose(reading.glucoseMmol, unit)} ${unit}`}
        backHref="/history"
      />

      <PageBody>
        <ReadingForm
          defaultValues={{
            // Always edit in the user's current preferred unit.
            enteredValue: String(fromMmol(reading.glucoseMmol, unit)),
            measurementType: reading.measurementType,
            measuredAt: toDateTimeLocalValue(new Date(reading.measuredAt)),
            note: reading.note ?? "",
          }}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
          onCancel={() => router.back()}
          footer={
            <Button variant="danger" size="lg" fullWidth onClick={() => setConfirmOpen(true)}>
              Delete reading
            </Button>
          }
        />

        <p className="px-1 text-center text-xs text-ink-faint">
          Created {new Date(reading.createdAt).toLocaleString()}
        </p>
      </PageBody>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this reading?"
        description="This removes it from your history and trends. It cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}