-- Rueckblick nach dem Einreichungszeitraum (Issue #66).
--
-- Nach dem Rekordversuch soll `/stats` nicht verschlossen sein, sondern zeigen,
-- was zusammengekommen ist: Reparaturen je Tag ueber den ganzen Zeitraum, das
-- Ergebnis am Ziel gemessen - und ein paar Zahlen, die man sonst nirgends
-- sieht, etwa wie viele Stunden in Uhren gesteckt wurden.
--
-- Grundlage ist `public_stats()` und nicht `dashboard_stats()`: Die Zeitachse
-- der Buehne umfasst fest die letzten 30 Tage und trifft einen laenger
-- zurueckliegenden Zeitraum irgendwann gar nicht mehr; `public_stats()`
-- bekommt den Abschnitt dagegen als Parameter. Ausserdem braucht ein Rueckblick
-- weder Einzeleintraege noch Bilder, ist damit fuer alle gleich und kann im
-- CDN liegen.
--
-- Diese Migration ergaenzt die fehlenden Summen. Alles bisherige bleibt
-- unveraendert, damit angeschlossene Anzeigen (siehe
-- docs/hardware-display-api.md) weiterlaufen; `lib/public-stats.ts` liest die
-- neuen Felder ohnehin defensiv und kommt auch ohne sie zurecht.
create or replace function public.public_stats(range_start date, range_end date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select
      category,
      kreis,
      performed_by,
      repair_succeeded,
      story,
      duration_minutes,
      item_value_euros,
      (created_at at time zone 'Europe/Berlin')::date as day
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
    -- Ab hier der Rueckblick. Dieselben Groessen wie auf der Buehne, damit
    -- waehrend und nach der Aktion dieselben Zahlen stehen.
    'succeeded', (select count(*) from approved where repair_succeeded),
    'withStory', (select count(*) from approved where story is not null and story <> ''),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from approved),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from approved),
    'performedBy', coalesce((
      select jsonb_object_agg(performed_by, amount)
      from (
        select performed_by, count(*) as amount
        from approved
        where performed_by is not null
        group by performed_by
      ) as grouped
    ), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_object_agg(category, amount)
      from (select category, count(*) as amount from approved group by category) as grouped
    ), '{}'::jsonb),
    -- Reparaturzeit je Kategorie. Erst damit laesst sich sagen, wie viele
    -- Stunden in Uhren, Fahrraedern oder Textilien steckten - die reine
    -- Gesamtsumme sagt das nicht.
    'categoryMinutes', coalesce((
      select jsonb_object_agg(category, minutes)
      from (
        select category, coalesce(sum(duration_minutes), 0) as minutes
        from approved
        group by category
      ) as grouped
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
