-- Superadmins can configure the campaign window and maintain the visible partner directory.
create table public.campaign_settings (
  id boolean primary key default true check (id),
  submission_start_at timestamptz,
  submission_end_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint campaign_window_is_valid check (
    submission_start_at is null
    or submission_end_at is null
    or submission_start_at < submission_end_at
  )
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  website_url text not null check (char_length(website_url) <= 500),
  logo_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaign_settings_set_updated_at
before update on public.campaign_settings
for each row execute function public.set_updated_at();

create trigger partners_set_updated_at
before update on public.partners
for each row execute function public.set_updated_at();

alter table public.campaign_settings enable row level security;
alter table public.partners enable row level security;

create policy "Public reads campaign settings"
on public.campaign_settings for select
to anon, authenticated
using (true);

create policy "Superadmins manage campaign settings"
on public.campaign_settings for all
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));

create policy "Public reads partners"
on public.partners for select
to anon, authenticated
using (true);

create policy "Superadmins manage partners"
on public.partners for all
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads partner logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'partner-logos');

create policy "Superadmins manage partner logos"
on storage.objects for all
to authenticated
using (bucket_id = 'partner-logos' and (select public.is_superadmin()))
with check (bucket_id = 'partner-logos' and (select public.is_superadmin()));
