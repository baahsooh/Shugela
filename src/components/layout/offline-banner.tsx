"use client";

import { WifiOffIcon } from "@/components/icons";
import { useOnlineStatus } from "@/hooks/use-environment";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warn-soft px-4 py-1.5 text-[0.7rem] font-semibold text-warn"
    >
      <WifiOffIcon className="size-3.5" />
      Offline — readings are saved on this device
    </div>
  );
}