-- Shugela · initial schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- readings ---
create table if not exists public.readings (
  id               uuid        primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  glucose_mmol     numeric(6,2) not null check (glucose_mmol > 0 and glucose_mmol < 200),
  entered_value    numeric(8,2) not null check (entered_value > 0 and entered_value < 2000),
  entered_unit     text        not null check (entered_unit in ('mmol/L', 'mg/dL')),
  measurement_type text        not null check (
                     measurement_type in (
                       'wakeup',
                       'post_breakfast_2h',
                       'post_lunch_2h',
                       'post_supper_2h'
                     )
                   ),
  measured_at      timestamptz not null,
  note             text,
  source           text        not null default 'manual',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Range scans for history/trends: always filtered by user, newest first.
create index if not exists readings_user_measured_idx
  on public.readings (user_id, measured_at desc);

-- Row Level Security: a row is only ever visible to the user that owns it.
-- This is enforced by Postgres, not by the app, so a bug in client code
-- cannot leak data.
alter table public.readings enable row level security;

drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own" on public.readings
  for select using (auth.uid() = user_id);

drop policy if exists "readings_insert_own" on public.readings;
create policy "readings_insert_own" on public.readings
  for insert with check (auth.uid() = user_id);

drop policy if exists "readings_update_own" on public.readings;
create policy "readings_update_own" on public.readings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "readings_delete_own" on public.readings;
create policy "readings_delete_own" on public.readings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- profiles ---
-- One row per user: display settings that follow them across devices.
create table if not exists public.profiles (
  user_id       uuid        primary key references auth.users (id) on delete cascade,
  unit          text        not null default 'mmol/L' check (unit in ('mmol/L', 'mg/dL')),
  theme         text        not null default 'system' check (theme in ('system', 'light', 'dark')),
  target_ranges jsonb       not null default '{"wakeup":{"minMmol":3.9,"maxMmol":6.1},
                                              "post_breakfast_2h":{"minMmol":4.4,"maxMmol":8.0},
                                              "post_lunch_2h":{"minMmol":4.4,"maxMmol":8.0},
                                              "post_supper_2h":{"minMmol":4.4,"maxMmol":8.0}}'::jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every new auth user gets a profile row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------- notes ---
-- `updated_at` is written by the client (not a database trigger) so the sync
-- layer can resolve conflicts last-write-wins using the same clock as Dexie.