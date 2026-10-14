"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ReadingForm } from "@/components/forms/reading-form";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/providers/toast-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { createReading } from "@/db/readings";
import { useMounted } from "@/hooks/use-environment";
import { useSettings } from "@/hooks/use-settings";
import { isMeasurementType } from "@/lib/constants";
import { toDateTimeLocalValue } from "@/lib/dates";
import { formatGlucose } from "@/lib/glucose";
import type { ReadingDraft } from "@/lib/types";

export default function LogPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LogForm />
    </Suspense>
  );
}

function LogForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const { unit } = useSettings();

  // Quick-log tiles deep-link into the form with a pre-selected measurement.
  const requestedType = searchParams.get("type");
  const measurementType = isMeasurementType(requestedType) ? requestedType : undefined;

  if (!mounted) return <FormSkeleton />;

  const handleSubmit = async (draft: ReadingDraft) => {
    const reading = await createReading(draft);
    toast({ title: "Reading saved", description: `${formatGlucose(reading.glucoseMmol, unit)} ${unit}` });
    router.replace("/");
  };

  return (
    <>
      <PageHeader title="Add reading" subtitle={`Values in ${unit}`} backHref="/" />
      <PageBody>
        <ReadingForm
          defaultValues={{
            measuredAt: toDateTimeLocalValue(new Date()),
            ...(measurementType ? { measurementType } : {}),
          }}
          onSubmit={handleSubmit}
          submitLabel="Save reading"
          onCancel={() => router.back()}
        />

        <p className="-mt-1 px-1 text-center text-xs leading-relaxed text-ink-faint">
          Stored in mmol/L on this device
          {unit === "mg/dL" ? " after converting from mg/dL" : ""}.
          <br />
          Everything works offline — nothing is uploaded.
        </p>
      </PageBody>
    </>
  );
}

function FormSkeleton() {
  return (
    <>
      <PageHeader title="Add reading" />
      <PageBody>
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
      </PageBody>
    </>
  );
}