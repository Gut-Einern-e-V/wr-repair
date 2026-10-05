-- Delta der Buehne in einem Aufruf statt in vier.
--
-- Der Delta-Pfad von /api/dashboard fragte bisher nacheinander die Zaehlung
-- (HEAD auf repairs), `dashboard_today()`, `dashboard_metrics()` und die neuen
-- Zeilen ab. Eine laufende Buehne tut das alle 15 Sekunden, und jede dieser
-- Anfragen ist eine eigene Zeile im API-Gateway-Log. Das machte Anfang Oktober
-- rund 90 % der Log Ingestion des Projekts aus.
--
-- Die Funktion liefert dieselben vier Teile zusammen. Zaehlung und Kennzahlen
-- beruhen auf derselben Auswahl wie bisher: `total` ist `succeeded` aus
-- `dashboard_metrics()`, also freigegeben und gelungen - genau das, was die
-- Zaehlung per HEAD gezaehlt hat. Die Zeilen tragen dieselben Spalten wie
-- `highlightColumns` in app/api/dashboard/route.ts.
--
-- Ohne diese Migration faellt die Route auf die vier Einzelabfragen zurueck.

create or replace function public.dashboard_delta(since timestamptz, max_rows integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with metrics as (
    select public.dashboard_metrics() as value
  ), added as (
    select id, category, brand_model, image_path, image_alt_text, created_at, moderated_at, kreis, location_lat, location_lon
    from public.repairs
    where status = 'approved'
      and repair_succeeded
      and moderated_at > since
    order by moderated_at
    limit max_rows
  )
  select jsonb_build_object(
    'total', (select (value ->> 'succeeded')::integer from metrics),
    'today', public.dashboard_today(),
    'metrics', (select value from metrics),
    'rows', coalesce((select jsonb_agg(to_jsonb(added) order by added.moderated_at) from added), '[]'::jsonb)
  );
$$;

revoke all on function public.dashboard_delta(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.dashboard_delta(timestamptz, integer) to service_role;
