-- Update repairs table: new categories, new fields, optional image_path, add story and performed_by.
-- Replace the old category constraint with the new 12-category set.
alter table public.repairs
  drop constraint if exists repairs_category_check;

-- Remap legacy category values (from the pre-rebuild 9-category set) onto
-- their closest match in the new 12-category set before the constraint
-- below enforces it. No-op for rows that already use a current value.
update public.repairs set category = 'household_appliances' where category = 'electrical_appliances';
update public.repairs set category = 'computers_and_phones' where category = 'computers_and_communication';
update public.repairs set category = 'bicycle' where category = 'bicycles';
update public.repairs set category = 'textiles' where category = 'textiles_and_clothing';
update public.repairs set category = 'toys' where category = 'toys_and_leisure';

alter table public.repairs
  add constraint repairs_category_check check (category in (
    'other',
    'computers_and_phones',
    'bicycle',
    'photo_video_car',
    'household_appliances',
    'furniture',
    'sharpening',
    'jewelry_glasses',
    'toys',
    'textiles',
    'watches',
    'tools'
  ));

-- Allow image_path to be NULL (photo is now optional).
alter table public.repairs
  alter column image_path drop not null;

-- New structured fields.
alter table public.repairs
  add column if not exists brand_model text,
  add column if not exists duration_minutes integer check (duration_minutes > 0),
  add column if not exists item_value_euros numeric(10, 2) check (item_value_euros >= 0),
  add column if not exists performed_by text check (performed_by in ('alone', 'with_support', 'by_someone')),
  add column if not exists story text;

-- Lottery entries: stored separately from repairs so PII stays isolated.
-- Only superadmins may read or manage entries; public may insert via the service role (API).
create table if not exists public.lottery_entries (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs(id) on delete cascade,
  name text not null,
  email text not null,
  winner boolean not null default false,
  drawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (repair_id)
);

alter table public.lottery_entries enable row level security;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

create policy "Superadmins can manage lottery entries"
on public.lottery_entries for all
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));
