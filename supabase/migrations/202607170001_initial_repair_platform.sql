-- Initial database schema for the Reparaturrekord NRW platform.
-- Apply with: supabase db push

create extension if not exists pgcrypto;

create type public.repair_status as enum ('pending', 'approved', 'rejected');
create type public.app_role as enum ('moderator', 'admin', 'superadmin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.repairs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'electrical_appliances',
    'household_appliances',
    'computers_and_communication',
    'bicycles',
    'furniture',
    'textiles_and_clothing',
    'tools',
    'toys_and_leisure',
    'other'
  )),
  product_name text,
  context text check (context in (
    'professional',
    'diy',
    'hobby',
    'school',
    'university',
    'work',
    'repair_cafe',
    'other'
  )),
  description text,
  repair_succeeded boolean not null default true,
  image_path text not null,
  image_alt_text text,
  consent_publication boolean not null,
  status public.repair_status not null default 'pending',
  location_region text,
  entry_ip inet,
  exif jsonb,
  tags text[] not null default '{}',
  moderator_comment text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_time timestamptz not null default now(),
  constraint approved_repairs_are_moderated check (
    status <> 'approved' or (moderated_at is not null and moderated_by is not null)
  ),
  constraint rejected_repairs_are_moderated check (
    status <> 'rejected' or (moderated_at is not null and moderated_by is not null)
  ),
  constraint public_repairs_require_consent check (
    status <> 'approved' or consent_publication
  )
);

create index repairs_public_feed_idx on public.repairs (created_at desc)
  where status = 'approved';
create index repairs_moderation_queue_idx on public.repairs (status, entry_time asc);
create index repairs_category_idx on public.repairs (category)
  where status = 'approved';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger repairs_set_updated_at
before update on public.repairs
for each row execute function public.set_updated_at();

create or replace function public.is_moderator_or_higher()
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
      and role in ('moderator', 'admin', 'superadmin')
  );
$$;

grant execute on function public.is_moderator_or_higher() to authenticated;

create or replace function public.is_admin_or_higher()
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
      and role in ('admin', 'superadmin')
  );
$$;

grant execute on function public.is_admin_or_higher() to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.repairs enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Moderators can view profiles"
on public.profiles for select
to authenticated
using ((select public.is_moderator_or_higher()));

create policy "Admins manage moderator roles"
on public.user_roles for all
to authenticated
using ((select public.is_admin_or_higher()))
with check ((select public.is_admin_or_higher()));

create policy "Anyone can read approved repairs"
on public.repairs for select
to anon, authenticated
using (status = 'approved');

create policy "Moderators can read every repair"
on public.repairs for select
to authenticated
using ((select public.is_moderator_or_higher()));

create policy "Moderators can update repairs"
on public.repairs for update
to authenticated
using ((select public.is_moderator_or_higher()))
with check ((select public.is_moderator_or_higher()));

-- Public clients do not upload directly. The Next.js API uses the service role
-- after it has validated CAPTCHA, the NRW check, the opening window and image data.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-images',
  'repair-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;