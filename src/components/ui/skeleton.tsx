import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-fade rounded-2xl bg-surface-muted", className)} />;
}