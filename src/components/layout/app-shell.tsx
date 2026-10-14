import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { OfflineBanner } from "./offline-banner";

/**
 * App chrome shared by every screen: a phone-width column, a sticky header per
 * page, the offline banner and the fixed bottom tab bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-bg">
      <OfflineBanner />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-safe-nav">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

/** Standard page body spacing. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("animate-rise flex flex-col gap-4 px-4 py-4", className)}>{children}</div>;
}