-- Tagesdetails in der Zeitachse von `public_stats()`.
--
-- Der Rueckblick unter /stats zeigt beim Ueberfahren eines Tagesbalkens mehr
-- als die Summe: den staerksten Ort, die Orte mit ihrer ersten Reparatur und
-- die haeufigste Kategorie des Tages. Die Felder kommen zu `date` und `total`
-- dazu; angeschlossene Anzeigen (docs/hardware-display-api.md), die nur diese
-- beiden lesen, merken davon nichts.
--
-- Sonst unveraendert gegenueber 202609020001.
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
  ), kreis_firsts as (
    -- Erste gelungene Reparatur je Ort, ueber alle Tage und nicht nur den
    -- angefragten Abschnitt: "Neu dabei" heisst wirklich zum ersten Mal.
    select kreis, min(day) as day
    from counted
    where kreis is not null
    group by 1
  ), category_days as (
    select day, category, count(*) as amount
    from counted
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
      -- Je Tag neben der Summe die Zahlen fuer den Tooltip im Rueckblick:
      -- wie viele Orte dabei waren, welcher vorne lag, welche zum ersten Mal
      -- dabei waren und was am meisten repariert wurde. Nur Aggregate - kein
      -- einzelner Eintrag laesst sich daraus ablesen.
      select jsonb_agg(
        jsonb_build_object(
          'date', span.day,
          'total', coalesce(days.amount, 0),
          'places', (select count(*) from kreis_days where kreis_days.day = span.day),
          'topKreis', (
            select jsonb_build_object('kreis', kreis, 'total', amount)
            from kreis_days
            where kreis_days.day = span.day
            order by amount desc, kreis
            limit 1
          ),
          'newKreise', coalesce((
            select jsonb_agg(kreis order by kreis)
            from kreis_firsts
            where kreis_firsts.day = span.day
          ), '[]'::jsonb),
          'topCategory', (
            select jsonb_build_object('category', category, 'total', amount)
            from category_days
            where category_days.day = span.day
            order by amount desc, category
            limit 1
          )
        )
        order by span.day
      )
      -- Tagesabstand statt eines Zeitstempel-Intervalls: Reine Kalender-
      -- rechnung auf `date` kennt weder Zeitzone noch Sommerzeit. Endet der
      -- Abschnitt vor seinem Anfang, ist die Reihe leer.
      from (select (range_start + shift)::date as day from generate_series(0, range_end - range_start) as shifts(shift)) as span
      left join days on days.day = span.day
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.public_stats(date, date) from public, anon, authenticated;
grant execute on function public.public_stats(date, date) to service_role;
