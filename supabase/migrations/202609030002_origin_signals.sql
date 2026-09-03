-- Widerspruechliche Herkunftssignale einer Einreichung (Issue #87).
--
-- Bisher stand an jeder Einreichung genau eine Ortsangabe: die mit der
-- hoechsten Beweiskraft, die im Gebiet lag (location_lat/location_lon/kreis),
-- dazu ihre Quelle (origin_source) und die grobe Gegend der Verbindung
-- (origin_ip_region). Fuer den Normalfall reicht das. Fuer den Fall, um den es
-- hier geht, nicht:
--
-- Wer ein Foto aus Bayern hochlaedt und im Formular "Wuppertal" anklickt, sieht
-- in der Moderationskonsole genauso aus wie jemand aus Wuppertal. Karte und
-- Koordinaten zeigen den ausgewaehlten Kreis, nicht den Ort der Aufnahme, und
-- das einzige Gegenzeugnis war der Vercel-Geo-Header - eine Bundeslandangabe,
-- die bei jeder Zugfahrt danebenliegt. Eine begruendete Entscheidung war so
-- nicht zu treffen.
--
-- Diese Spalte haelt deshalb *alle* erhobenen Signale nebeneinander: Foto-EXIF,
-- Standortfreigabe im Browser, IP-Herkunft und Kreis-Auswahl, jeweils mit dem
-- Kreis, in dem der Punkt liegt.

alter table public.repairs
  add column if not exists origin_signals jsonb;

-- Nur ein Array, sonst nichts: Die Struktur der Eintraege prueft die
-- Anwendung (OriginSignal in lib/origin-check.ts). Hier steht nur die Zusage,
-- dass die Moderation etwas zum Durchlaufen bekommt und keinen Skalar.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'repairs_origin_signals_check'
  ) then
    alter table public.repairs
      add constraint repairs_origin_signals_check
      check (origin_signals is null or jsonb_typeof(origin_signals) = 'array');
  end if;
end;
$$;

comment on column public.repairs.origin_signals is
  'Alle erhobenen Herkunftssignale als Array von {source, lat, lon, kreis} - aber nur, wenn sie sich widersprechen. Jeder Punkt ist bereits anonymisiert (1-km-Zufallsversatz bzw. Streuung ueber den Kreis, auf ~110 m gerundet) und damit nicht genauer als die ohnehin gespeicherte Hauptangabe. Bei einstimmigen Signalen bleibt die Spalte leer: Dann gibt es nichts zu entscheiden, und weniger gespeicherte Standortdaten sind das bessere Ergebnis.';

-- Ob eines der Signale aus dem Land herauszeigt - abgeleitet und nicht
-- gepflegt.
--
-- Diese Frage entscheidet, ob eine Einreichung in die Schnellpruefung darf
-- (siehe unten), und sie wird an zwei Stellen gebraucht: in
-- `claim_next_repair()` und im Zaehler der offenen Einreichungen, den
-- app/api/moderation/repairs/next/route.ts ueber PostgREST stellt. Ein
-- Unterabfrage-Ausdruck ueber das Array laesst sich dort nicht formulieren,
-- zwei getrennte Formeln liefen frueher oder spaeter auseinander - und dann
-- stuende in der Konsole "noch 20 offen" neben einer leeren Schlange.
--
-- `@>` prueft, ob irgendein Element des Arrays ein Feld `kreis` mit dem Wert
-- null traegt; genau so speichert die Anwendung einen Punkt ausserhalb des
-- Gebiets. Der Operator ist immutable, deshalb darf die Spalte generiert sein
-- und muss von niemandem mitgeschrieben werden.
alter table public.repairs
  add column if not exists origin_signals_outside boolean
  generated always as (origin_signals @> '[{"kreis": null}]'::jsonb) stored;

comment on column public.repairs.origin_signals_outside is
  'Abgeleitet aus origin_signals: true, wenn mindestens ein erhobenes Herkunftssignal ausserhalb des Gebiets liegt. Null, solange keine widerspruechlichen Signale gespeichert sind.';

/* Kein GRANT: 202608260003_anonymized_origin.sql hat das table-weite SELECT
   fuer anon/authenticated entzogen und die uebrigen Spalten einzeln
   zurueckgegeben. Eine neue Spalte ist damit von aussen nicht lesbar, solange
   sie nicht ausdruecklich gegrantet wird - und diese hier soll es nie sein.
   Sie ist ausschliesslich fuer die Moderation da, die mit dem Service-Role-Key
   liest. */

-- Die Schnellpruefung ueberspringt auch diese Faelle.
--
-- 202608280004_quick_review_clear_origin.sql hat dafuer eine Regel aufgestellt:
-- Was originWarning() in app/moderator/repair-types.ts kennzeichnet, gehoert
-- nicht in die Wischschlange, sondern in die Liste - ueber eine unklare
-- Herkunft entscheidet man nicht in zwei Sekunden. Der neue Hinweis "Angaben
-- widersprechen sich" ist genau so ein Fall, und er ist sogar der Grund, aus
-- dem es diese Spalte gibt. Ohne diese Zeile lagen die widerspruechlichen
-- Einreichungen weiter im Takt der Wischgeste - mit einem Hinweis-Chip, den
-- man beim Durchwischen uebersieht.
--
-- Nicht jeder Unterschied reicht dafuer. Gefuellt wird die Spalte schon,
-- sobald zwei Signale auf verschiedene Kreise zeigen - das passiert oft, weil
-- die IP-Herkunft stadtgenau raet und im Nachbarkreis landen kann. Fuer die
-- Frage, ob eine Reparatur zaehlt, ist das ohne Belang: Beide Kreise liegen im
-- Land. Aus der Schnellpruefung genommen wird deshalb nur, was mindestens ein
-- Signal *ausserhalb* hat - der Fall aus dem Issue. Sonst waere die
-- Wischschlange bald leer und die Liste voll.
--
-- Uebersprungen heisst wie dort nicht verschwunden: In der Listenfreigabe
-- stehen die Einreichungen unveraendert unter "Offen", jetzt mit allen
-- Angaben nebeneinander auf der Karte.

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
