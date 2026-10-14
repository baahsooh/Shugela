"use client";

import type { ReactNode } from "react";

import { SettingsProvider } from "@/hooks/use-settings";
import { SyncRunner } from "@/hooks/use-sync";
import { DemoDataSeeder } from "./demo-data-seeder";
import { ServiceWorkerRegistrar } from "./service-worker-registrar";
import { ToastProvider } from "./toast-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <ToastProvider>
        <ServiceWorkerRegistrar />
        <SyncRunner />
        <DemoDataSeeder />
        {children}
      </ToastProvider>
    </SettingsProvider>
  );
}