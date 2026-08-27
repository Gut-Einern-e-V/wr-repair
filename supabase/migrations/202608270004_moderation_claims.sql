-- Parallele Moderation ohne Doppelarbeit (Issue #38).
--
-- Bisher holte sich jede Moderationssitzung dieselbe Warteschlange und
-- entschied unabhaengig davon, woran gerade jemand anderes sass. Zwei
-- gleichzeitige Sitzungen haben deshalb dieselbe Einreichung zweimal gelesen,
-- zweimal bewertet - und die zweite Entscheidung hat die erste ueberschrieben.
--
-- Die Schnellpruefung fordert jetzt genau eine Einreichung an und haelt darauf
-- einen zeitlich begrenzten Anspruch. Bewusst eine Frist statt eines echten
-- Locks: Ein geschlossener Tab darf eine Einreichung nicht dauerhaft blockieren.
alter table public.repairs
  add column if not exists claimed_by uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz;

comment on column public.repairs.claimed_by is
  'Moderationskonto, das diese Einreichung gerade prueft (siehe claim_next_repair).';
comment on column public.repairs.claimed_at is
  'Beginn des Anspruchs. Laeuft nach der Frist aus claim_next_repair ab und gibt die Einreichung wieder frei.';

-- Wie location_lat/location_lon bleiben beide Spalten fuer anon/authenticated
-- ungrantet (siehe 202608260003_anonymized_origin.sql): Das table-weite SELECT
-- ist dort entzogen, eine neue Spalte ist ohne expliziten GRANT nicht lesbar.
-- Wer eine Einreichung prueft, geht die Oeffentlichkeit nichts an; die
-- Moderations-API liest die Spalten mit dem Service-Role-Key.

-- Naechste offene Einreichung holen und in einem Zug beanspruchen.
create or replace function public.claim_next_repair(
  p_moderator uuid,
  p_lease_seconds integer default 300,
  p_skip uuid[] default '{}'
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

revoke all on function public.claim_next_repair(uuid, integer, uuid[]) from public, anon, authenticated;
grant execute on function public.claim_next_repair(uuid, integer, uuid[]) to service_role;
