-- Shugela · pre-meal measurement types
-- Adds "before breakfast", "before lunch" and "before supper" alongside the
-- existing wake-up and 2h-after-meal types, and widens the CHECK constraint
-- that guards `measurement_type`.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

alter table public.readings drop constraint if exists readings_measurement_type_check;

alter table public.readings
  add constraint readings_measurement_type_check check (
    measurement_type in (
      'wakeup',
      'pre_breakfast',
      'post_breakfast_2h',
      'pre_lunch',
      'post_lunch_2h',
      'pre_supper',
      'post_supper_2h'
    )
  );

-- Backfill the three new keys on any existing profile so the in-range badges
-- have a window to compare against.
update public.profiles
   set target_ranges = target_ranges || '{"pre_breakfast":{"minMmol":3.9,"maxMmol":6.1},
                                         "pre_lunch":{"minMmol":4.0,"maxMmol":7.0},
                                         "pre_supper":{"minMmol":4.0,"maxMmol":7.0}}'::jsonb
 where target_ranges ? 'wakeup'
   and not (target_ranges ? 'pre_breakfast');