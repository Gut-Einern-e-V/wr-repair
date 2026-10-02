-- Kennzahlen der Buehne im Delta-Takt (Issue #142).
--
-- Die Kacheln neben dem Zaehler - Erfolgsquote, Schrauberzeit, Warenwert -
-- kamen bisher nur mit dem vollen Snapshot, also alle fuenf Minuten. Der
-- Zaehler selbst laeuft im Delta-Takt (alle 15 Sekunden). Damit stand eine
-- neue Reparatur schon im Zaehler, ihr Warenwert aber erst Minuten spaeter in
-- der Kachel - und kam ein gescheiterter Versuch dazwischen, sah es so aus, als
-- haette erst er den Wert hochgezogen.
--
-- Diese Funktion liefert genau die Summen der Kacheln, mit derselben Auswahl
-- wie `dashboard_stats()`: Zeit, Warenwert und Geschichten nur aus gelungenen
-- Reparaturen, `attempted` aus allen freigegebenen. Sie ist bewusst schmal,
-- weil der Delta-Pfad sie viermal je Minute abfragt.

create or replace function public.dashboard_metrics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select repair_succeeded, story, duration_minutes, item_value_euros
    from public.repairs
    where status = 'approved'
  ), counted as (
    select * from approved where repair_succeeded
  )
  select jsonb_build_object(
    'attempted', (select count(*) from approved),
    'succeeded', (select count(*) from counted),
    'withStory', (select count(*) from counted where story is not null and story <> ''),
    'minutesSaved', (select coalesce(sum(duration_minutes), 0) from counted),
    'valueSavedEuros', (select coalesce(sum(item_value_euros), 0) from counted)
  );
$$;

revoke all on function public.dashboard_metrics() from public, anon, authenticated;
grant execute on function public.dashboard_metrics() to service_role;
