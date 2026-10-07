-- Rueckschau fuer die Sharepics: Zahlen je Zeitraum und optional je Ort.
--
-- `public_stats()` summiert ueber alle freigegebenen Reparaturen; nur die
-- Zeitachse kennt einen Zeitraum. Eine Wochenrueckschau ("Was kam diese Woche
-- zusammen?") und eine Stadtrueckschau brauchen aber alle Summen im Zeitraum,
-- deshalb eine eigene Funktion statt weiterer Parameter an `public_stats()`,
-- dessen Antwort angeschlossene Anzeigen (docs/hardware-display-api.md)
-- unveraendert erwarten.
--
-- Gezaehlt wird wie beim Rekord: `succeeded` sind die gelungenen
-- Reparaturen, `failed` die freigegebenen Fehlversuche. Das gesparte Geld und
-- die Stunden zaehlen nur gelungene Reparaturen - bei einem gescheiterten
-- Versuch ist nichts gerettet worden.
--
-- Tage sind Berliner Kalendertage. `range_start` null heisst: von der ersten
-- freigegebenen Reparatur an. `kreis_filter` null heisst: ganz NRW.
create or replace function public.recap_stats(
  range_start date,
  range_end date,
  kreis_filter text default null
)
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
      duration_minutes,
      item_value_euros,
      (created_at at time zone 'Europe/Berlin')::date as day
    from public.repairs
    where status = 'approved'
  ), in_range as (
    select * from approved
    where (range_start is null or day >= range_start) and day <= range_end
  ), scoped as (
    select * from in_range
    where kreis_filter is null or kreis = kreis_filter
  ), counted as (
    select * from scoped where repair_succeeded
  ), days as (
    select
      day,
      count(*) filter (where repair_succeeded) as succeeded,
      count(*) filter (where not repair_succeeded) as failed
    from scoped
    group by 1
  ), day_categories as (
    select day, category, count(*) as amount
    from counted
    group by 1, 2
  ), span as (
    -- Hoechstens ein Jahr zurueck, damit ein versehentlich offenes Fenster
    -- keine endlose Reihe erzeugt.
    select greatest(
      coalesce(range_start, (select min(day) from in_range), range_end),
      range_end - 365
    ) as first_day
  )
  select jsonb_build_object(
    'succeeded', (select count(*) from counted),
    'failed', (select count(*) from scoped where not repair_succeeded),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from counted),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from counted),
    'categories', coalesce((
      select jsonb_object_agg(category, amount)
      from (select category, count(*) as amount from counted group by category) as grouped
    ), '{}'::jsonb),
    -- Der Bezug fuer den Anteil eines Ortes: alle gelungenen Reparaturen in
    -- NRW im selben Zeitraum.
    'nrwSucceeded', (select count(*) from in_range where repair_succeeded),
    -- Gleich langer Zeitraum davor, fuer den Vergleich. Ohne Anfang (seit
    -- Beginn) gibt es keinen Vergleich.
    'previousSucceeded', case
      when range_start is null then null
      else (
        select count(*)
        from approved
        where repair_succeeded
          and day between range_start - (range_end - range_start + 1) and range_start - 1
          and (kreis_filter is null or kreis = kreis_filter)
      )
    end,
    'timeline', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', series.day,
          'succeeded', coalesce(days.succeeded, 0),
          'failed', coalesce(days.failed, 0),
          'categories', coalesce((
            select jsonb_object_agg(day_categories.category, day_categories.amount)
            from day_categories
            where day_categories.day = series.day
          ), '{}'::jsonb)
        )
        order by series.day
      )
      from (
        select (span.first_day + shift)::date as day
        from span, generate_series(0, greatest(range_end - span.first_day, -1)) as shifts(shift)
      ) as series
      left join days on days.day = series.day
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.recap_stats(date, date, text) from public, anon, authenticated;
grant execute on function public.recap_stats(date, date, text) to service_role;
