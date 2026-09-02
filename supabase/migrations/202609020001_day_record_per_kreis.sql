-- Tagesrekord je Ort statt landesweit (Issue #75).
--
-- Die Marke, gegen die der Tagesrekord laeuft, ist "268 Reparaturen an einem
-- Tag *und Ort*" (2019 in Exeter). Verglichen wurde bisher der landesweite
-- Tagesstand - ein Wert, der die Marke schon bei einer Handvoll gleichzeitig
-- laufender Repair-Cafes reisst, ohne dass irgendwo etwas Vergleichbares
-- passiert waere. Die Aussage "Rekord geknackt" war damit falsch.
--
-- Deshalb kommen zwei Groessen dazu, beide je Kreis bzw. kreisfreie Stadt:
--
-- - `todayKreise`: der heutige Stand je Ort. Daraus liest die Buehne den Ort
--   mit dem hoechsten Tagesstand und die naechsten Plaetze.
-- - `bestKreisDay`: der beste Tag *eines Ortes* vor heute - der eigene
--   Bestwert der laufenden Aktion, gegen den ein Ort heute anlaeuft.
--
-- Die landesweiten `today` und `bestDay` bleiben unveraendert: Sie sind eine
-- eigene, richtige Aussage ("wie viel kam heute in NRW zusammen") und haengen
-- an der Zeitachse und am Rueckblick. Nur der Rekordvergleich wechselt auf den
-- Ort.
--
-- Der Ort ist der Kreis aus der bereits anonymisierten Koordinate (siehe
-- 202608270002). Einreichungen ohne Kreis bleiben in `today`, koennen aber
-- keinen Ortsrekord tragen - ohne Ort gibt es keinen "an einem Ort".
--
-- Gezaehlt wird wie bisher der Einreichungstag (`created_at`) in Berliner
-- Zeit, nicht die Freigabe.

-- Aggregat der Buehne, wie in 202609010004, ergaenzt um die beiden
-- Ortsgroessen.
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select repair_succeeded, category, performed_by, story,
           duration_minutes, item_value_euros, moderated_at, created_at,
           location_lat, location_lon, kreis
    from public.repairs
    where status = 'approved'
  ), counted as (
    select * from approved where repair_succeeded
  ), days as (
    select (created_at at time zone 'Europe/Berlin')::date as day, count(*) as amount
    from counted
    group by 1
  ), kreis_days as (
    -- Ein Eintrag je Tag und Ort. Ohne Kreis kein Ort - solche Einreichungen
    -- zaehlen weiter in `days`, nur nicht hier.
    select (created_at at time zone 'Europe/Berlin')::date as day, kreis, count(*) as amount
    from counted
    where kreis is not null
    group by 1, 2
  )
  select jsonb_build_object(
    'total', (select count(*) from counted),
    -- Alle freigegebenen Einreichungen, gescheiterte Versuche eingeschlossen.
    'attempted', (select count(*) from approved),
    'succeeded', (select count(*) from counted),
    'withStory', (select count(*) from counted where story is not null and story <> ''),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from counted),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from counted),
    'cursor', (select max(moderated_at) from counted),
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
    -- Heutiger Stand je Ort. Die Buehne sortiert daraus die Rangliste des
    -- Tages; ein leeres Objekt heisst: heute noch nichts mit Ortsangabe.
    'todayKreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from kreis_days
      where day = (now() at time zone 'Europe/Berlin')::date
    ), '{}'::jsonb),
    -- Bester Tag eines einzelnen Ortes vor heute - der eigene Bestwert, gegen
    -- den der heute fuehrende Ort anlaeuft.
    'bestKreisDay', (
      select jsonb_build_object('date', day, 'kreis', kreis, 'total', amount)
      from kreis_days
      where day < (now() at time zone 'Europe/Berlin')::date
      order by amount desc, day desc
      limit 1
    ),
    'categories', coalesce((
      select jsonb_object_agg(category, amount)
      from (select category, count(*) as amount from counted group by category) as grouped
    ), '{}'::jsonb),
    'performedBy', coalesce((
      select jsonb_object_agg(performed_by, amount)
      from (
        select performed_by, count(*) as amount
        from counted
        where performed_by is not null
        group by performed_by
      ) as grouped
    ), '{}'::jsonb),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('lat', lat, 'lon', lon, 'count', amount))
      from (
        select location_lat as lat, location_lon as lon, count(*) as amount
        from counted
        where location_lat is not null and location_lon is not null
        group by location_lat, location_lon
      ) as cells
    ), '[]'::jsonb),
    'kreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from (
        select kreis, count(*) as amount
        from counted
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

-- Oeffentliche Statistik, wie in 202609010004, ebenfalls um die beiden
-- Ortsgroessen ergaenzt: Ein angeschlossenes Display soll denselben
-- Rekordvergleich anzeigen koennen wie die Buehne, ohne die Einzeleintraege
-- der Dashboard-Route zu laden.
create or replace function public.public_stats(range_start date, range_end date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select
      repair_succeeded,
      category,
      kreis,
      performed_by,
      story,
      duration_minutes,
      item_value_euros,
      (created_at at time zone 'Europe/Berlin')::date as day
    from public.repairs
    where status = 'approved'
  ), counted as (
    select * from approved where repair_succeeded
  ), days as (
    select day, count(*) as amount
    from counted
    group by 1
  ), kreis_days as (
    select day, kreis, count(*) as amount
    from counted
    where kreis is not null
    group by 1, 2
  )
  select jsonb_build_object(
    'total', (select count(*) from counted),
    'attempted', (select count(*) from approved),
    -- Laenge der Moderationsschlange. Eine reine Zahl: Sie sagt, wie viel
    -- gerade nachrueckt, und nichts ueber einzelne Einreichungen. Hier zaehlt
    -- weiter alles Offene - was davon zaehlen wird, entscheidet sich erst mit
    -- der Pruefung.
    'pending', (select count(*) from public.repairs where status = 'pending'),
    'today', coalesce((
      select amount from days where day = (now() at time zone 'Europe/Berlin')::date
    ), 0),
    -- Bester Tag *vor* heute, damit der laufende Tag nicht sein eigener
    -- Rekord ist (wie in `dashboard_stats()`).
    'bestDay', (
      select jsonb_build_object('date', day, 'total', amount)
      from days
      where day < (now() at time zone 'Europe/Berlin')::date
      order by amount desc, day desc
      limit 1
    ),
    -- Tagesrekord je Ort (Issue #75), gleiche Bedeutung wie im
    -- Buehnen-Aggregat.
    'todayKreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from kreis_days
      where day = (now() at time zone 'Europe/Berlin')::date
    ), '{}'::jsonb),
    'bestKreisDay', (
      select jsonb_build_object('date', day, 'kreis', kreis, 'total', amount)
      from kreis_days
      where day < (now() at time zone 'Europe/Berlin')::date
      order by amount desc, day desc
      limit 1
    ),
    -- Ab hier der Rueckblick. Dieselben Groessen wie auf der Buehne, damit
    -- waehrend und nach der Aktion dieselben Zahlen stehen.
    'succeeded', (select count(*) from counted),
    'withStory', (select count(*) from counted where story is not null and story <> ''),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from counted),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from counted),
    'performedBy', coalesce((
      select jsonb_object_agg(performed_by, amount)
      from (
        select performed_by, count(*) as amount
        from counted
        where performed_by is not null
        group by performed_by
      ) as grouped
    ), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_object_agg(category, amount)
      from (select category, count(*) as amount from counted group by category) as grouped
    ), '{}'::jsonb),
    -- Reparaturzeit je Kategorie. Erst damit laesst sich sagen, wie viele
    -- Stunden in Uhren, Fahrraedern oder Textilien steckten - die reine
    -- Gesamtsumme sagt das nicht.
    'categoryMinutes', coalesce((
      select jsonb_object_agg(category, minutes)
      from (
        select category, coalesce(sum(duration_minutes), 0) as minutes
        from counted
        group by category
      ) as grouped
    ), '{}'::jsonb),
    -- Alle Kreise, nicht nur die vorderen: Die Rangliste auf der Buehne
    -- kuerzt fuer die Anzeige, die Schnittstelle soll das nicht vorwegnehmen.
    'kreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from (
        select kreis, count(*) as amount
        from counted
        where kreis is not null
        group by kreis
      ) as grouped
    ), '{}'::jsonb),
    -- Ein Eintrag je Tag des angefragten Abschnitts, auch fuer Tage ohne
    -- Reparatur. Das Auffuellen gehoert hierher und nicht in die Route: Sonst
    -- muessten beide Seiten dieselbe Kalenderrechnung koennen.
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('date', span.day, 'total', coalesce(days.amount, 0)) order by span.day)
      -- Tagesabstand statt eines Zeitstempel-Intervalls: Reine Kalender-
      -- rechnung auf `date` kennt weder Zeitzone noch Sommerzeit. Endet der
      -- Abschnitt vor seinem Anfang, ist die Reihe leer.
      from (select (range_start + shift)::date as day from generate_series(0, range_end - range_start) as shifts(shift)) as span
      left join days on days.day = span.day
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.public_stats(date, date) from public;
grant execute on function public.public_stats(date, date) to service_role;
