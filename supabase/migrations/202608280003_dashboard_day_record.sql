-- Tagesrekord fuer das Buehnen-Dashboard.
--
-- Der bisherige Bestwert - die meisten Reparaturen an einem einzigen Tag -
-- steht bislang nur in einer Tabellenkalkulation. Er bekommt hier eine Spalte
-- in den Kampagneneinstellungen, damit das Dashboard den heutigen Stand
-- dagegen laufen lassen kann.
--
-- Gezaehlt wird der *Einreichungstag* (`created_at`), nicht die Freigabe: Ein
-- Tag ist der Tag, an dem repariert wurde. Sonst haenge der Rekord daran, wann
-- die Moderation Zeit hatte - und ein Nachmittag Moderationsarbeit erzeugte
-- einen Rekordtag, an dem niemand geschraubt hat.
alter table public.campaign_settings
  add column if not exists day_record integer check (day_record is null or day_record > 0);

-- Aggregat wie in 202608270003, ergaenzt um 'today' und 'bestDay'. Die
-- Zeitachse wechselt aus demselben Grund von `moderated_at` auf `created_at`.
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select category, performed_by, repair_succeeded, story,
           duration_minutes, item_value_euros, moderated_at, created_at,
           location_lat, location_lon, kreis
    from public.repairs
    where status = 'approved'
  ), days as (
    select (created_at at time zone 'Europe/Berlin')::date as day, count(*) as amount
    from approved
    group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from approved),
    'succeeded', (select count(*) from approved where repair_succeeded),
    'withStory', (select count(*) from approved where story is not null and story <> ''),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from approved),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from approved),
    'cursor', (select max(moderated_at) from approved),
    -- Stand des laufenden Tages, gemessen in Berliner Zeit.
    'today', coalesce((
      select amount from days where day = (now() at time zone 'Europe/Berlin')::date
    ), 0),
    -- Bester Tag *vor* heute. Der laufende Tag bleibt aussen vor, sonst waere er
    -- immer schon sein eigener Rekord und nie zu schlagen.
    'bestDay', (
      select jsonb_build_object('date', day, 'total', amount)
      from days
      where day < (now() at time zone 'Europe/Berlin')::date
      order by amount desc, day desc
      limit 1
    ),
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
      from days
      where day >= (now() at time zone 'Europe/Berlin')::date - 29
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.dashboard_stats() from public;
grant execute on function public.dashboard_stats() to service_role;

-- Nur der Tagesstand, fuer den Delta-Pfad der Dashboard-Route.
--
-- Der Delta-Pfad ruft `dashboard_stats()` bewusst nicht auf - genau das macht
-- ihn billig. Er braucht den Tagesstand trotzdem alle 15 Sekunden. Die Grenze
-- des Kalendertages gehoert dabei nach Postgres und nicht in den Node-Prozess:
-- Am Tag der Zeitumstellung liegt die Berliner Mitternacht sonst um eine Stunde
-- daneben.
create or replace function public.dashboard_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.repairs
  where status = 'approved'
    and (created_at at time zone 'Europe/Berlin')::date = (now() at time zone 'Europe/Berlin')::date;
$$;

revoke all on function public.dashboard_today() from public;
grant execute on function public.dashboard_today() to service_role;
