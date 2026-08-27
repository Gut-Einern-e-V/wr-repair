-- Entfernt die 5-pro-Zelle-Schwelle aus Karte und Kreis-Rangliste.
--
-- Die Herkunftszellen sind bereits auf ein ~5-km-Raster gerastert und
-- zusaetzlich innerhalb der Zelle zufaellig verschoben (siehe
-- lib/geo-anonymize.ts). Diese beiden Schritte gelten als ausreichender
-- Schutz, auch fuer einzelne Reparaturen - die Schwelle war eine zusaetzliche
-- Vorsichtsmassnahme, keine Voraussetzung der Rasterung selbst.
--
-- Betroffen sind nur 'cells' (Kartenpunkte/Partikelwolke) und 'kreise'
-- (Kreis-Summen fuer Fuellung und Rangliste). Die Schwelle fuer einzelne
-- Laufband-Eintraege (KREIS_MIN_FOR_LABEL in lib/dashboard.ts) bleibt
-- unveraendert bestehen - ein benannter Einzeleintrag mit Kategorie und
-- Zeitstempel ist deutlich identifizierender als eine aggregierte Summe.
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
      ) as cells
    ), '[]'::jsonb),
    'kreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from (
        select kreis, count(*) as amount
        from approved
        where kreis is not null
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
