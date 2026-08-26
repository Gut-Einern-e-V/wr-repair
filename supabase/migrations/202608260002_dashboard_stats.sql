-- Aggregatfunktion fuer das Live-Dashboard.
--
-- Ohne sie muesste die API alle freigegebenen Zeilen seitenweise laden
-- (bei 10.000 Eintraegen zehn Roundtrips pro Cache-Miss). Die Funktion
-- aggregiert alles in einer einzigen Query und gibt ein kompaktes JSON zurueck.

create index if not exists repairs_approved_moderated_at_idx
  on public.repairs (moderated_at desc)
  where status = 'approved';

create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select category, performed_by, repair_succeeded, story,
           duration_minutes, item_value_euros, moderated_at
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
