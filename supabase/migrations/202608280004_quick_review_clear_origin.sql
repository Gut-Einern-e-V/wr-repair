-- Die Schnellpruefung bekommt nur noch Einreichungen mit eindeutiger Herkunft.
--
-- Die Wischkarte zeigt Kategorie, Bild und ein paar Angaben - genug, um ueber
-- eine klare Einreichung in zwei Sekunden zu entscheiden. Ueber die Herkunft
-- entscheidet man so aber nicht: Dafuer braucht es die Karte, die angegebene
-- Quelle und die Gegend der Verbindung nebeneinander, und die stehen nur in
-- der Vollansicht der Listenfreigabe (app/moderator/repair-detail.tsx).
--
-- Bisher lagen diese Faelle mit in der Wischschlange und trugen dort nur einen
-- kleinen Hinweis-Chip. Wer im Takt durchwischt, uebersieht den - und genau so
-- sind Einreichungen von ausserhalb freigegeben worden, die die Karte danach
-- neben das Land gemalt hat.
--
-- Uebersprungen wird, was die Konsole als unsicher kennzeichnet
-- (originWarning() in app/moderator/repair-types.ts):
--
--   "Ohne Ortsangabe"     -> kein Kreis, weil keine Koordinate vorliegt
--   "Herkunft ausserhalb" -> kein Kreis, weil der Punkt ausserhalb liegt
--   "Verbindung woanders" -> Kreis vorhanden, aber die IP kam von woanders
--
-- Die ersten beiden Faelle sind zusammen genau `kreis is null`. Der dritte
-- braucht den erwarteten Verbindungs-Tag, der aus der Gebietskonfiguration in
-- der Umgebung stammt und deshalb als Parameter hereinkommt - siehe
-- expectedIpRegionTag() in lib/origin-check.ts. Kommt null an, wird der
-- Verbindungsabgleich uebersprungen; das entspricht einer abgeschalteten
-- Gebietsbeschraenkung.
--
-- Uebersprungen heisst nicht verschwunden: In der Listenfreigabe stehen die
-- Einreichungen unveraendert unter "Offen", mit ihrem Hinweis in der Spalte
-- Herkunft. Die Schnellpruefung sagt beim Leerlaufen ausdruecklich, dass dort
-- noch etwas liegen kann (app/moderator/quick-review.tsx).

-- Der zusaetzliche Parameter ergibt eine neue Signatur. Ohne das Loeschen der
-- alten waere ein Aufruf mit drei Argumenten mehrdeutig und schluege fehl.
drop function if exists public.claim_next_repair(uuid, integer, uuid[]);

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
