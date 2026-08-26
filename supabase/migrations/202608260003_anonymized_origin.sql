-- Anonymisierte Herkunft einer Reparatur.
--
-- Gespeichert wird ausschliesslich der Repraesentant einer Rasterzelle von rund
-- 5 km Kantenlaenge (siehe lib/geo-anonymize.ts). Die Rohkoordinate - egal ob
-- aus EXIF im Browser oder aus dem Vercel-Geo-Header - verlaesst niemals den
-- jeweiligen Verarbeitungsschritt und wird nie geschrieben.
--
-- numeric(6,3) ist bewusst gewaehlt: Die drei Nachkommastellen begrenzen die
-- Aufloesung schon auf Schemaebene auf etwa 110 m. Selbst ein fehlerhafter
-- Client kann damit keine hausgenaue Position ablegen.

alter table public.repairs
  add column if not exists location_lat numeric(6,3),
  add column if not exists location_lon numeric(6,3);

comment on column public.repairs.location_lat is
  'Anonymisierte Breite: Repraesentant einer ~5-km-Zelle, nie die Rohkoordinate.';
comment on column public.repairs.location_lon is
  'Anonymisierte Laenge: Repraesentant einer ~5-km-Zelle, nie die Rohkoordinate.';

create index if not exists repairs_approved_location_idx
  on public.repairs (location_lat, location_lon)
  where status = 'approved' and location_lat is not null;

-- Spaltenrechte: Die Herkunft darf nur aggregiert nach aussen.
--
-- Die Policy "Anyone can read approved repairs" erlaubt anon den Lesezugriff
-- auf freigegebene Zeilen. Ohne die folgende Einschraenkung koennte damit jede
-- einzelne Zellkoordinate zeilenweise abgefragt und der k-Anonymitaetsschwelle
-- in dashboard_stats() ausgewichen werden. RLS wirkt nur auf Zeilen, deshalb
-- braucht es hier Spaltenrechte.
--
-- Postgres laesst ein table-weites SELECT nicht spaltenweise zurueckziehen.
-- Also: table-weites SELECT entziehen und alle uebrigen Spalten einzeln
-- zurueckgeben. Dynamisch, damit kuenftige Spalten nicht versehentlich
-- unlesbar werden.
do $$
declare
  columns_without_origin text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into columns_without_origin
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'repairs'
    and column_name not in ('location_lat', 'location_lon');

  revoke select on public.repairs from anon, authenticated;
  execute format('grant select (%s) on public.repairs to anon, authenticated', columns_without_origin);
end;
$$;

-- Dashboard-Aggregat um die Herkunftszellen erweitert.
--
-- Zellen werden erst ab fuenf freigegebenen Reparaturen ausgeliefert. Ohne
-- diese Schwelle wuerde ein Punkt in einer duenn besiedelten
-- Gegend faktisch auf einen einzelnen Haushalt zeigen, obwohl die Koordinate
-- gerastert ist. Unterhalb der Schwelle faellt das Dashboard auf die
-- symbolische Position aus der Repair-ID zurueck.
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select category, performed_by, repair_succeeded, story,
           duration_minutes, item_value_euros, moderated_at,
           location_lat, location_lon
    from public.repairs
    where status = 'approved'
  )
  select jsonb_build_object(
    'total', (select count(*) from approved),
    'succeeded', (select count(*) from approved where repair_succeeded),
    'withStory', (select count(*) from approved where story is not null and story <> ''),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from approved),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from approved),
    'cursor', (select max(moderated_at) from approved),
    'categories', coalesce((
      select jsonb_object_agg(category, amount)
      from (select category, count(*) as amount from approved group by category) as grouped
    ), '{}'::jsonb),
    'performedBy', coalesce((
      select jsonb_object_agg(performed_by, amount)
      from (
        select performed_by, count(*) as amount
        from approved
        where performed_by is not null
        group by performed_by
      ) as grouped
    ), '{}'::jsonb),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('lat', lat, 'lon', lon, 'count', amount))
      from (
        select location_lat as lat, location_lon as lon, count(*) as amount
        from approved
        where location_lat is not null and location_lon is not null
        group by location_lat, location_lon
        having count(*) >= 5
      ) as cells
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('date', day, 'total', amount) order by day)
      from (
        select (moderated_at at time zone 'Europe/Berlin')::date as day, count(*) as amount
        from approved
        where moderated_at >= now() - interval '30 days'
        group by 1
      ) as days
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.dashboard_stats() from public;
grant execute on function public.dashboard_stats() to service_role;
