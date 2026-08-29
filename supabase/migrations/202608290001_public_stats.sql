-- Aggregat fuer die oeffentliche Statistikroute `/api/stats`.
--
-- Die Route hat ihre Zahlen bisher selbst zusammengezaehlt: Sie hat alle
-- freigegebenen Zeilen seitenweise geholt und in Node gruppiert. Das war
-- schon fuer Gesamtzahl und Kategorien mehr Arbeit als noetig und traegt die
-- Kreis-Summen erst recht nicht. Hier steht dieselbe Auskunft als eine
-- Abfrage - wie `dashboard_stats()` fuer die Buehne, nur ohne alles, was
-- Displays nichts angeht: keine Herkunftszellen, keine Einzeleintraege, keine
-- Bilder.
--
-- Der Zeitraum kommt als Parameter herein statt als fest verdrahtete 30 Tage:
-- Der Einreichungszeitraum ist im Backend einstellbar, und die Zeitachse soll
-- ihm folgen (siehe `timelineRange` in `lib/public-stats.ts`).
--
-- Gezaehlt wird wie auf der Buehne der *Einreichungstag* (`created_at`), nicht
-- die Freigabe: Ein Tag ist der Tag, an dem repariert wurde. Sonst haengt die
-- Zeitachse daran, wann die Moderation Zeit hatte.
create or replace function public.public_stats(range_start date, range_end date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select category, kreis, (created_at at time zone 'Europe/Berlin')::date as day
    from public.repairs
    where status = 'approved'
  ), days as (
    select day, count(*) as amount
    from approved
    group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from approved),
    -- Laenge der Moderationsschlange. Eine reine Zahl: Sie sagt, wie viel
    -- gerade nachrueckt, und nichts ueber einzelne Einreichungen.
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
    'categories', coalesce((
      select jsonb_object_agg(category, amount)
      from (select category, count(*) as amount from approved group by category) as grouped
    ), '{}'::jsonb),
    -- Alle Kreise, nicht nur die vorderen: Die Rangliste auf der Buehne
    -- kuerzt fuer die Anzeige, die Schnittstelle soll das nicht vorwegnehmen.
    'kreise', coalesce((
      select jsonb_object_agg(kreis, amount)
      from (
        select kreis, count(*) as amount
        from approved
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
