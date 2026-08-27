-- Kreis (NRW-Landkreis/kreisfreie Stadt) einer Reparatur, einmalig berechnet.
--
-- Der Kreis ergibt sich rein geometrisch aus der bereits anonymisierten
-- ~5-km-Zelle (location_lat/location_lon) - siehe kreisForPoint() in
-- lib/nrw-map.ts. Die Kreisgrenzen liegen nur als Polygone im Anwendungscode
-- vor, deshalb wird die Spalte von der API beim Einreichen einmal befuellt
-- (app/api/repairs/route.ts), statt bei jedem Dashboard-Aufruf serverseitig
-- und clientseitig erneut per Punkt-in-Polygon-Test hergeleitet zu werden.
--
-- Wie location_lat/location_lon bleibt auch diese Spalte fuer anon/authenticated
-- ungrantet (siehe 202608260003_anonymized_origin.sql): Ein table-weites SELECT
-- ist bereits entzogen, eine neue Spalte ist ohne expliziten GRANT nicht lesbar.

alter table public.repairs
  add column if not exists kreis text;

comment on column public.repairs.kreis is
  'Kreis/kreisfreie Stadt der anonymisierten Herkunftszelle, einmalig bei der Einreichung berechnet (siehe lib/nrw-map.ts kreisForPoint).';

create index if not exists repairs_approved_kreis_idx
  on public.repairs (kreis)
  where status = 'approved' and kreis is not null;

-- Dashboard-Aggregat um die Kreis-Summen erweitert.
--
-- Dieselbe k-Anonymitaetsschwelle wie bei den Herkunftszellen: Nur Zellen mit
-- mindestens fuenf freigegebenen Reparaturen tragen zur Kreis-Summe bei. Damit
-- ist 'kreise' exakt die serverseitige Fassung dessen, was bisher aus 'cells'
-- clientseitig per kreisTotals() nachgerechnet wurde - nur eben einmal in SQL
-- statt bei jedem Snapshot erneut per Geometrie in JavaScript.
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
           location_lat, location_lon, kreis
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
    'kreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from (
        select kreis, sum(cell_amount) as amount
        from (
          select kreis, count(*) as cell_amount
          from approved
          where location_lat is not null and location_lon is not null and kreis is not null
          group by location_lat, location_lon, kreis
          having count(*) >= 5
        ) as busy_cells
        group by kreis
      ) as grouped
    ), '{}'::jsonb),
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
