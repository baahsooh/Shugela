"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native `<dialog>` gives us focus trapping, Esc handling and an inert
 * background for free — the same primitives iOS/Android dialogs are built on.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel();
      }}
      className={cn(
        "m-auto w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-line bg-bg-elevated p-5 text-ink shadow-card backdrop:bg-black/50",
        "open:animate-sheet",
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            size="lg"
            fullWidth
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}