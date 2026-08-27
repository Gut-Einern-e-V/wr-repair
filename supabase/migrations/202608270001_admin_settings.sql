-- Splits configuration out of the environment: the admin backend maintains the
-- campaign window, the record goal, the participating region and the site logo
-- at runtime. Every column stays nullable so an unconfigured deployment keeps
-- falling back to its environment variables.
alter table public.campaign_settings
  add column if not exists record_goal integer check (record_goal is null or record_goal > 0),
  add column if not exists logo_path text,
  add column if not exists region_enabled boolean,
  add column if not exists region_label text check (region_label is null or char_length(region_label) between 1 and 120),
  add column if not exists region_ip_country text check (region_ip_country is null or char_length(region_ip_country) <= 2),
  add column if not exists region_ip_region text check (region_ip_region is null or char_length(region_ip_region) <= 10),
  add column if not exists region_lat_min double precision check (region_lat_min is null or region_lat_min between -90 and 90),
  add column if not exists region_lat_max double precision check (region_lat_max is null or region_lat_max between -90 and 90),
  add column if not exists region_lon_min double precision check (region_lon_min is null or region_lon_min between -180 and 180),
  add column if not exists region_lon_max double precision check (region_lon_max is null or region_lon_max between -180 and 180);

alter table public.campaign_settings
  drop constraint if exists campaign_region_box_is_valid;

alter table public.campaign_settings
  add constraint campaign_region_box_is_valid check (
    (region_lat_min is null or region_lat_max is null or region_lat_min < region_lat_max)
    and (region_lon_min is null or region_lon_max is null or region_lon_min < region_lon_max)
  );

-- Admins share the settings desk with superadmins; only role management stays
-- superadmin-only (see 202607170006).
drop policy if exists "Superadmins manage campaign settings" on public.campaign_settings;
create policy "Admins manage campaign settings"
on public.campaign_settings for all
to authenticated
using ((select public.is_admin_or_higher()))
with check ((select public.is_admin_or_higher()));

drop policy if exists "Superadmins manage partners" on public.partners;
create policy "Admins manage partners"
on public.partners for all
to authenticated
using ((select public.is_admin_or_higher()))
with check ((select public.is_admin_or_higher()));

drop policy if exists "Superadmins manage partner logos" on storage.objects;
create policy "Admins manage partner logos"
on storage.objects for all
to authenticated
using (bucket_id = 'partner-logos' and (select public.is_admin_or_higher()))
with check (bucket_id = 'partner-logos' and (select public.is_admin_or_higher()));

-- Public bucket for the site logo the admin backend can replace.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads site assets" on storage.objects;
create policy "Public reads site assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'site-assets');

drop policy if exists "Admins manage site assets" on storage.objects;
create policy "Admins manage site assets"
on storage.objects for all
to authenticated
using (bucket_id = 'site-assets' and (select public.is_admin_or_higher()))
with check (bucket_id = 'site-assets' and (select public.is_admin_or_higher()));

-- Systemstatus fuer das Admin-Backend: Speicherbelegung je Bucket, Datenbank-
-- groesse und Zeilenzahlen. Nur der Service-Role-Key darf die Funktion rufen,
-- damit die Zahlen nicht oeffentlich abfragbar sind.
create or replace function public.system_usage()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'databaseBytes', pg_database_size(current_database()),
    'buckets', coalesce((
      select jsonb_agg(bucket order by bucket->>'id')
      from (
        select jsonb_build_object(
          'id', b.id,
          'objects', count(o.id),
          'bytes', coalesce(sum((o.metadata->>'size')::bigint), 0)
        ) as bucket
        from storage.buckets b
        left join storage.objects o on o.bucket_id = b.id
        group by b.id
      ) buckets
    ), '[]'::jsonb),
    'repairs', jsonb_build_object(
      'pending', (select count(*) from public.repairs where status = 'pending'),
      'approved', (select count(*) from public.repairs where status = 'approved'),
      'rejected', (select count(*) from public.repairs where status = 'rejected')
    ),
    'accounts', (select count(*) from public.user_roles),
    'partners', (select count(*) from public.partners)
  );
$$;

revoke execute on function public.system_usage() from public, anon, authenticated;
grant execute on function public.system_usage() to service_role;
