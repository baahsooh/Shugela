# Shugela

A mobile-first, offline-capable blood glucose tracker. You test with your meter,
type the number in, and Shugela timestamps it for you and shows how your numbers
move over time.

Everything is stored **locally on the device** (IndexedDB via Dexie). No account,
no server, no analytics. Installable as a PWA.

---

## 1. Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script            | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Dev server (Turbopack) on port 3000                     |
| `npm run build`   | Production build                                        |
| `npm start`       | Serve the production build                              |
| `npm run lint`    | ESLint (`eslint-config-next`)                           |
| `npm run typecheck` | `tsc --noEmit`                                        |
| `npm run check`   | lint + typecheck                                        |
| `npm run icons`   | Regenerate `public/icons/*.png` from `scripts/generate-icons.mjs` |
| `npm run unused`  | Report exported symbols that are never referenced       |

Requires **Node 20.9+** (Node 22/24 recommended).

### Try it with data

The app starts empty on purpose, so the charts have empty states to show.
To generate 30 days of realistic demo readings:

* open **Settings → Developer tools → Load sample data**, or
* run `NEXT_PUBLIC_SEED_DEMO=1 npm run dev` (PowerShell:
  `$env:NEXT_PUBLIC_SEED_DEMO="1"; npm run dev`) and the demo data is written
  automatically the first time an empty database is opened.

The seed is deterministic (fixed PRNG seed), so the same readings are produced on
every machine — handy for screenshots and bug reports.

### Install as an app

The service worker and manifest only activate in a production build:

```bash
npm run build && npm start
```

Then open `http://localhost:3000` in Chrome/Edge and use the install icon in the
address bar (or **Settings → Install** inside the app). On iOS Safari:
*Share → Add to Home Screen*. After the first visit the app works fully offline.

> Service workers require `http://localhost` (treated as secure) or HTTPS.

---

## 2. Tech stack

| Concern    | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)               |
| Language   | TypeScript 5.9 (strict)                           |
| Styling    | Tailwind CSS 4 (CSS-variable theme, class dark mode) |
| Storage    | Dexie 4 + `dexie-react-hooks` (`useLiveQuery`)    |
| Charts     | Recharts 3                                        |
| Forms      | React Hook Form 7 + Zod 4                         |
| Cloud sync | Supabase (Postgres + magic-link auth + RLS)       |
| PWA        | `app/manifest.ts` + hand-written `public/sw.js`   |

---

## 3. Project structure

```
shugela/
├── public/
│   ├── sw.js                     # offline app-shell service worker
│   └── icons/                    # generated PWA icons (192/512/maskable/apple)
├── supabase/
│   └── migrations/0001_init.sql  # schema + Row Level Security policies
├── scripts/
│   ├── generate-icons.mjs        # dependency-free PNG icon generator
│   └── check-unused-exports.mjs  # dev helper
├── src/
│   ├── app/
│   │   ├── layout.tsx            # metadata, viewport, providers + app shell
│   │   ├── globals.css           # Tailwind theme tokens, dark mode, utilities
│   │   ├── manifest.ts           # PWA manifest (metadata route)
│   │   ├── page.tsx              # Home
│   │   ├── log/page.tsx          # Add reading
│   │   ├── history/page.tsx      # History
│   │   ├── trends/page.tsx       # Trends
│   │   ├── sign-in/page.tsx      # Magic-link sign in
│   │   ├── settings/
│   │   │   ├── page.tsx          # Settings
│   │   │   ├── account-card.tsx  # Cloud backup / sync status
│   │   │   └── target-range-editor.tsx
│   │   └── readings/[id]/page.tsx# Edit / delete a single reading
│   ├── components/
│   │   ├── charts/               # glucose-trend-chart, type-average-chart, …
│   │   ├── forms/                # reading-form, glucose-input, pickers, fields
│   │   ├── layout/               # app-shell, bottom-nav, page-header, offline-banner
│   │   ├── providers/            # settings, toasts, SW registration, demo seeder
│   │   ├── readings/             # reading-card, reading-row
│   │   ├── ui/                   # button, card, badge, stat-tile, dialog, …
│   │   └── icons.tsx             # inline SVG icon set (no icon dependency)
│   ├── db/
│   │   ├── db.ts                 # Dexie schema (v1 → v2 for cloud sync)
│   │   ├── readings.ts           # CRUD repository
│   │   ├── settings.ts           # settings repository
│   │   └── seed.ts               # deterministic demo data
│   ├── hooks/                    # use-auth, use-sync, use-readings, use-settings, …
│   └── lib/
│       ├── types.ts              # domain types
│       ├── constants.ts          # measurement types, labels, defaults
│       ├── glucose.ts            # conversion, parsing, validation, classification
│       ├── trends.ts             # windows, daily series, stats, summaries
│       ├── dates.ts              # local-time date helpers
│       ├── validation.ts         # Zod schemas
│       ├── transfer.ts           # JSON export / import
│       ├── supabase/
│       │   ├── client.ts         # optional client (null when unconfigured)
│       │   └── sync.ts           # pull / merge / push / tombstones
│       └── utils.ts              # cn(), ids, rounding
```

---

## 4. Data model

`src/lib/types.ts`

```ts
export type GlucoseUnit = "mmol/L" | "mg/dL";

export type MeasurementType =
  | "wakeup"               // Wake up
  | "post_breakfast_2h"    // 2h after breakfast
  | "post_lunch_2h"        // 2h after lunch
  | "post_supper_2h";      // 2h after supper

export interface GlucoseReading {
  id: string;                    // client-generated uuid
  glucoseMmol: number;           // canonical value — everything is computed from this
  enteredValue: number;          // exactly what the user typed…
  enteredUnit: GlucoseUnit;      // …in the unit they typed it in
  measurementType: MeasurementType;
  measuredAt: string;            // ISO-8601 timestamp of the measurement
  note?: string;
  source: "manual";
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "settings";
  unit: GlucoseUnit;             // unit used for entry + display
  theme: "system" | "light" | "dark";
  targetRanges: Record<MeasurementType, { minMmol: number; maxMmol: number }>;
  hasSeededDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Why both `glucoseMmol` and `enteredValue`?** `glucoseMmol` is the single source
of truth for statistics and charts, so switching the display unit never changes
the maths. `enteredValue` / `enteredUnit` are kept for auditability — history can
show "146 mg/dL entered" for a reading displayed as 8.1 mmol/L.

---

## 5. Database (Dexie / IndexedDB)

`src/db/db.ts`

```ts
export class ShugelaDatabase extends Dexie {
  readings!: Table<GlucoseReading, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("shugela");
    this.version(1).stores({
      readings: "id, measuredAt, measurementType, createdAt, [measurementType+measuredAt]",
      settings: "id",
    });
  }
}

export const db = new ShugelaDatabase();
```

`measuredAt` is the range-scan index used by history/trends;
`[measurementType+measuredAt]` supports per-measurement aggregation.

Reads go through `useLiveQuery`, so every screen updates the moment a reading is
written — no manual refetching:

```ts
const { readings, isLoading } = useReadings(); // db.readings.toArray(), live
```

> **Dexie rule worth knowing:** a `liveQuery` querier must be **read-only**.
> Dexie throws `ReadonlyError: Readwrite transaction in liveQuery context` if you
> write inside one. That is why `getStoredSettings()` is a pure read and the
> default row is created by `ensureSettings()` from a `useEffect` instead.

---

## 6. Utilities

### `lib/glucose.ts` — conversion, validation, classification

| Export | Purpose |
| --- | --- |
| `MG_DL_PER_MMOL = 18.016` | glucose molar mass conversion factor |
| `toMmol` / `fromMmol` | canonical ⇄ display value |
| `roundForUnit` / `formatGlucose` | 1 decimal for mmol/L, whole numbers for mg/dL |
| `parseDecimalInput` / `parseEnteredValue` | keypad-tolerant parsing (`7,2` → `7.2`) + range check |
| `INPUT_LIMITS` | plausible input range: 1–40 mmol/L, 18–720 mg/dL |
| `stepValue` | ± steppers (0.1 mmol/L, 1 mg/dL) |
| `classify` | `low` / `in-range` / `high` against the target range for that measurement |
| `isCritical` | outside 2.8–25 mmol/L, flagged prominently |

### `lib/trends.ts` — aggregation

* `getTimeWindow(days)` — last *N* calendar days including today, ending now
* `buildDaySeries(readings, days)` — continuous day buckets (empty days included)
  so the x-axis never skips a date
* `computeStats(readings, targets)` — count, average, highest, lowest, in-range
  share, low/high counts, active days
* `summariseByType(readings, targets)` — average/spread per measurement type
* `rollingAverage`, `averageDelta`, `comparisonWindow` — smoothing and
  period-over-period comparison

All day bucketing is **local time** (`dayKey()` builds `YYYY-MM-DD` from local
getters) so a 07:00 reading never drifts into the previous UTC day.

### `lib/validation.ts` — Zod

`readingFormSchema(unit)` validates the raw keypad string, the measurement type,
the timestamp (no future readings) and the note length. It is unit-aware: the
same "must be between …" error reads `1–40 mmol/L` or `18–720 mg/dL`.

---

## 7. Screens

| Route | Contents |
| --- | --- |
| `/` **Home** | Greeting, latest-reading hero card with status, quick-log tiles for all four measurement types, 7-day stats (average, in-range %, highest, lowest), 7-day sparkline chart, today's readings |
| `/log` **Add reading** | Large numeric input with ± steppers and live range badge, measurement picker, editable date/time with one-tap offsets (Now / 15m / 30m / 1h / 2h ago), optional note |
| `/readings/[id]` **Edit** | Same form prefilled (converted into your current unit), plus delete with confirmation |
| `/history` **History** | Readings grouped by day with a daily average, filter by measurement type, incremental "load more" (25 per page) |
| `/trends` **Trends** | 7 / 14 / 30-day window, average (+ % vs previous period), highest, lowest, total; daily-average chart with target band and min–max range; time-in-range bar; average per measurement type |
| `/settings` **Settings** | Unit, theme, per-measurement target ranges, storage usage, JSON export/import, delete all, demo data, install prompt, about |

Shared chrome (`components/layout`): sticky page header, offline banner, and a
fixed bottom tab bar (Home · History · **+** · Trends · Settings).

Every screen renders an explicit empty state when there is no data.

---

## 8. Reusable components

`ui/` — `Button`, `Card`/`CardTitle`, `Badge`, `StatTile`, `EmptyState`,
`SegmentedControl` (radio group), `ConfirmDialog` (native `<dialog>`, focus trap
and Esc handling for free), `Skeleton`.

`forms/` — `ReadingForm` (RHF + Zod), `GlucoseInput` (huge `inputMode="decimal"`
field, steppers, live status badge), `MeasurementTypePicker`, `DateTimeField`.

`charts/` — `GlucoseTrendChart` (daily average, 3-day smoothing, target band,
min–max range, custom tooltip), `TypeAverageChart`, `TimeInRangeBar`,
`TrendRangePicker`.

`readings/` — `ReadingCard` (history row with status and "entered as" note),
`ReadingRow` (compact home list).

### Mobile details

* Bottom tab bar with a raised centre action and safe-area padding
  (`env(safe-area-inset-bottom)`); content is offset so nothing hides behind it.
* `viewport-fit=cover` + `interactive-widget=resizes-content`; inputs are ≥16px so
  iOS never zooms on focus.
* `inputMode="decimal"` numeric keypad, `touch-action: manipulation`,
  ≥44px touch targets, `overscroll-behavior: none`.
* Phone-width column (`max-w-md`) centred on tablets/desktop, light + dark themes,
  `prefers-reduced-motion` respected.

---

## 9. Offline & PWA

`public/sw.js` caches the app shell on install and then:

* **navigations** → network-first (3s timeout) → cached page → `/`
* **assets & RSC payloads** → stale-while-revalidate
* old caches are dropped on `activate` (bump `CACHE_VERSION` on release)

Because data lives in IndexedDB, logging a reading while offline works exactly
the same as online — nothing is queued because nothing is sent.

`app/manifest.ts` declares the app name, standalone display, portrait
orientation, theme colour, icons (including a maskable one) and shortcuts to
"Add a reading" and "History".

---

## 10. Cloud backup (Supabase)

Shugela is **local-first**: Dexie/IndexedDB is what the UI renders from, so the app
works with no network at all. Supabase is a *mirror* — it exists so clearing
browser data can never take your history with it again.

### How sync works

```
log a reading → IndexedDB (instant, offline-safe)
             → supabase.readings upsert  (debounced 1.2s, if signed in + online)

app opens / regains focus / comes back online
             → pull rows changed since last sync
             → merge last-write-wins on updated_at
             → push anything local is newer than
```

* Deletions made offline are written to a `tombstones` table and replayed later,
  so "delete" also deletes in the cloud.
* Readings logged *before* signing up are never uploaded automatically — you
  explicitly claim them with **Upload N readings**, so a second person signing in
  on a shared device cannot silently inherit someone else's data.
* Unit, theme and target ranges sync through a `profiles` row, so a new device
  opens already configured.
* If Supabase is unreachable or the keys are missing, every sync path is a no-op
  and the app behaves exactly as it did before.

### One-time setup

1. **Create a project** in [supabase.com](https://supabase.com) and wait for it
   to finish provisioning.
2. **Run the schema**: open `supabase/migrations/0001_init.sql`, paste it into
   *SQL Editor → New query*, press **Run**. You should see `readings` and
   `profiles` in *Table Editor*. It is idempotent.
3. **Copy the keys** from *Project Settings → API* into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```

   Use the **anon public** key only. The `service_role` key bypasses Row Level
   Security — if it ever reaches a client bundle, every user's readings are
   exposed. Rotate it immediately if that happens.

4. **Email sign-in**: *Authentication → Providers → Email* → enable it. Raise
   *Email rate limit* (the built-in SMTP defaults to roughly **2 emails/hour**,
   which is easy to hit while testing). For a real inbox, add your own SMTP under
   *Authentication → SMTP Settings*.
5. **Redirect URLs**: *Authentication → URL Configuration → Redirect URLs* →
   add `http://localhost:3000` and, after deploying, your Vercel domain.
   Supabase silently refuses magic links to unlisted origins.

Then restart `npm run dev`, open **Settings → Cloud backup → Sign in**, and enter
your email. A link arrives; opening it signs you in and starts the first sync.

### Security model

Access is enforced by Postgres, not by the app. Every table has Row Level
Security with `auth.uid() = user_id` policies for select/insert/update/delete, so
a bug in client code cannot leak another account's rows. The anon key is designed
to be public — it grants nothing without those policies.

---

## 11. Deploying to Vercel

Vercel serves the app; it is not the database.

```bash
npm i -g vercel          # once
vercel                   # preview deploy
vercel --prod            # production
```

Or push this folder to GitHub and add the repo at *vercel.com → Add New →
Project* (import the Next.js preset).

Add the environment variables in *Vercel → Project → Settings → Environment
Variables*:

| Variable                       | Value                        |
| ------------------------------ | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| your anon public key         |

`NEXT_PUBLIC_*` values are **inlined at build time**, so adding them in the
dashboard triggers a rebuild — a redeploy is required for them to take effect.

Finally add the Vercel URL to Supabase's redirect URLs list. A real HTTPS origin
is also what makes the PWA install properly on a phone.

---

## 12. Notes & limitations

* **Local-only by default.** Nothing leaves the device until you sign in, and
  Settings → Your data → *Export as JSON* still writes a portable backup.
* The `readings` sync is a mirror, not a multi-device conflict-free editor: last
  write wins, which is the right trade for a single-user log.
* Target ranges are a starting point for colour-coding, not medical advice.
