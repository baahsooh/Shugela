"use client";

import { useEffect, useRef } from "react";

import { db } from "@/db/db";
import { getAllReadings } from "@/db/readings";
import { seedDemoData, shouldAutoSeedDemoData } from "@/db/seed";
import { getStoredSettings } from "@/db/settings";

/**
 * Development convenience: `NEXT_PUBLIC_SEED_DEMO=1 npm run dev` fills an empty
 * database with demo readings so the charts are never blank on a fresh clone.
 *
 * Renders nothing and does nothing unless the flag is set.
 */
export function DemoDataSeeder() {
  const started = useRef(false);

  useEffect(() => {
    if (!shouldAutoSeedDemoData() || started.current) return;
    started.current = true;

    void (async () => {
      const [readings, settings] = await Promise.all([getAllReadings(), getStoredSettings()]);
      if (readings.length > 0 || settings?.hasSeededDemoData) return;

      await seedDemoData({ days: 30 });
      // Keep the live queries in sync if the seed landed after first paint.
      await db.readings.toArray();
    })();
  }, []);

  return null;
}
