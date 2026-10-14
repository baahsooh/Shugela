-- Shugela · food tracking and medication log
-- Adds the three tables behind the Meal and Pill features, with the same
-- Row Level Security model as `readings`: a row is visible only to the account
-- that owns it, enforced by Postgres rather than by the app.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- ------------------------------------------------------------------- meals ---
create table if not exists public.meals (
  id         uuid        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  meal_type  text        not null check (meal_type in ('breakfast', 'lunch', 'supper', 'snack')),
  eaten_at   timestamptz not null,
  items      jsonb       not null default '[]'::jsonb,
  carbs_g    numeric(7,2) not null default 0 check (carbs_g >= 0),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_eaten_idx on public.meals (user_id, eaten_at desc);

alter table public.meals enable row level security;

drop policy if exists "meals_select_own" on public.meals;
create policy "meals_select_own" on public.meals for select using (auth.uid() = user_id);
drop policy if exists "meals_insert_own" on public.meals;
create policy "meals_insert_own" on public.meals for insert with check (auth.uid() = user_id);
drop policy if exists "meals_update_own" on public.meals;
create policy "meals_update_own" on public.meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "meals_delete_own" on public.meals;
create policy "meals_delete_own" on public.meals for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------- medications ---
create table if not exists public.medications (
  id         uuid        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  dose       text,
  schedule   jsonb       not null default '[]'::jsonb,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medications_user_idx on public.medications (user_id, name);

alter table public.medications enable row level security;

drop policy if exists "medications_select_own" on public.medications;
create policy "medications_select_own" on public.medications
  for select using (auth.uid() = user_id);
drop policy if exists "medications_insert_own" on public.medications;
create policy "medications_insert_own" on public.medications
  for insert with check (auth.uid() = user_id);
drop policy if exists "medications_update_own" on public.medications;
create policy "medications_update_own" on public.medications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "medications_delete_own" on public.medications;
create policy "medications_delete_own" on public.medications
  for delete using (auth.uid() = user_id);

-- --------------------------------------------------------------- dose logs ---
create table if not exists public.dose_logs (
  id              uuid        primary key,
  user_id         uuid        not null references auth.users (id) on delete cascade,
  medication_id   uuid        not null,
  medication_name text        not null,
  scheduled_time  text        not null,
  taken_at        timestamptz not null,
  status          text        not null check (status in ('taken', 'skipped')),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists dose_logs_user_taken_idx on public.dose_logs (user_id, taken_at desc);
create index if not exists dose_logs_medication_idx
  on public.dose_logs (user_id, medication_id, scheduled_time);

alter table public.dose_logs enable row level security;

drop policy if exists "dose_logs_select_own" on public.dose_logs;
create policy "dose_logs_select_own" on public.dose_logs for select using (auth.uid() = user_id);
drop policy if exists "dose_logs_insert_own" on public.dose_logs;
create policy "dose_logs_insert_own" on public.dose_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "dose_logs_update_own" on public.dose_logs;
create policy "dose_logs_update_own" on public.dose_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "dose_logs_delete_own" on public.dose_logs;
create policy "dose_logs_delete_own" on public.dose_logs for delete using (auth.uid() = user_id);

-- Dose logs deliberately do not reference medications(id): removing a
-- medication keeps its dose history, so the log must survive the medicine.