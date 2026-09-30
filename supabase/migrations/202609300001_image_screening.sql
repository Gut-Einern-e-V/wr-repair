-- Bildpruefung mit Sightengine (lib/image-screening.ts).
--
-- Jedes eingereichte Foto geht vor dem Speichern einmal an Sightengine, das
-- Werte fuer Nacktheit und Gore zurueckgibt. Eindeutige Treffer nimmt die
-- Einreichungsroute gar nicht erst an; sie kommen nie in den Storage und nie
-- in diese Tabelle. Hier landet das Ergebnis aller anderen:
--
--   {"verdict": "flagged" | "clear",
--    "scores": {"explicit": 0..1, "suggestive": 0..1, "gore": 0..1},
--    "reasons": ["explicit" | "suggestive" | "gore", ...]}
--
-- Leer heisst "nicht geprueft": kein Foto, kein Schluessel, Sightengine hat
-- nicht geantwortet. Die Werte sind reine Modellausgaben und sagen nichts
-- ueber eine Person.
--
-- Freigegeben wird dadurch nichts. Die Moderation sieht bei "flagged" einen
-- Hinweis und das Foto zunaechst verdeckt, und die Schnellpruefung
-- ueberspringt diese Einreichungen - dieselbe Regel wie in
-- 202608280004_quick_review_clear_origin.sql: Was einen Hinweis traegt,
-- gehoert in die Liste.
--
-- Kein GRANT: `repairs` ist seit 202609290002 fuer anon und authenticated
-- ganz geschlossen.

alter table public.repairs
  add column if not exists image_screening jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'repairs_image_screening_check'
  ) then
    alter table public.repairs
      add constraint repairs_image_screening_check
      check (image_screening is null or jsonb_typeof(image_screening) = 'object');
  end if;
end;
$$;

comment on column public.repairs.image_screening is
  'Ergebnis der Bildpruefung durch Sightengine: {verdict, scores, reasons}. Leer, wenn nicht geprueft. Nur Modellwerte, kein Personenbezug.';

-- Generiert wie origin_signals_outside, damit claim_next_repair() und die
-- Zaehlung in app/api/moderation/repairs/next/route.ts dieselbe Bedingung
-- ohne jsonb-Ausdruck stellen koennen.
alter table public.repairs
  add column if not exists image_screening_flagged boolean
  generated always as (image_screening ->> 'verdict' = 'flagged') stored;

comment on column public.repairs.image_screening_flagged is
  'Abgeleitet aus image_screening: true, wenn die Bildpruefung das Foto als auffaellig markiert hat. Null, wenn nicht geprueft.';

create or replace function public.claim_next_repair(
  p_moderator uuid,
  p_lease_seconds integer default 300,
  p_skip uuid[] default '{}',
  p_expected_ip_region text default null
)
returns setof public.repairs
language sql
security definer
set search_path = ''
as $$
  with candidate as (
    select id
    from public.repairs
    where status = 'pending'
      -- Frei ist, was niemand haelt, was die eigene Sitzung haelt (Neuladen
      -- der Seite) oder was ueber die Frist hinaus liegen geblieben ist.
      and (
        claimed_at is null
        or claimed_by = p_moderator
        or claimed_at < now() - make_interval(secs => p_lease_seconds)
      )
      and id <> all (coalesce(p_skip, '{}'::uuid[]))
      -- Herkunft eindeutig, sonst gehoert die Einreichung in die Liste.
      and kreis is not null
      -- Kein erhobenes Signal darf aus dem Land herauszeigen. Null heisst
      -- hier "es gab nichts zu speichern" und ist damit unverdaechtig.
      and coalesce(origin_signals_outside, false) = false
      -- Ein auffaelliges Foto entscheidet man nicht im Takt der Wischgeste.
      -- Null heisst "nicht geprueft" und bleibt drin - sonst waere die
      -- Schlange leer, solange kein Schluessel hinterlegt ist.
      and coalesce(image_screening_flagged, false) = false
      and (
        p_expected_ip_region is null
        or origin_ip_region is null
        or origin_ip_region = p_expected_ip_region
      )
    order by entry_time asc
    limit 1
    -- `skip locked` haelt zwei gleichzeitige Anfragen auseinander: Die zweite
    -- ueberspringt die gesperrte Zeile, statt auf sie zu warten, und bekommt
    -- die naechste. Ohne das lesen beide dieselbe Zeile.
    for update skip locked
  )
  update public.repairs as target
     set claimed_by = p_moderator,
         claimed_at = now()
    from candidate
   where target.id = candidate.id
  returning target.*;
$$;

revoke all on function public.claim_next_repair(uuid, integer, uuid[], text) from public, anon, authenticated;
grant execute on function public.claim_next_repair(uuid, integer, uuid[], text) to service_role;
