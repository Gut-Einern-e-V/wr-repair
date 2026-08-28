-- Herkunftsnachweis einer Einreichung und Zaehler fuer blockierte Versuche.
--
-- Bisher speicherte die Einreichung nur das *Ergebnis* der Ortsbestimmung
-- (location_lat/location_lon/kreis), nicht aber, woher dieses Ergebnis stammt.
-- Fuer die Moderation ist genau das der Unterschied zwischen "Foto mit GPS aus
-- Wuppertal" und "im Dropdown Wuppertal angeklickt". Beides landet auf
-- derselben Rasterzelle, hat aber voellig unterschiedliche Beweiskraft.
--
-- Die beiden neuen Spalten machen diesen Unterschied sichtbar, ohne mehr ueber
-- die einreichende Person zu speichern als vorher: origin_source ist eine
-- Angabe des Browsers ueber sich selbst, origin_ip_region ist die Bundesland-
-- Ebene des Vercel-Geo-Headers - also deutlich groeber als die bereits
-- gespeicherte 5-km-Zelle und keine neue Offenlegung.

alter table public.repairs
  add column if not exists origin_source text,
  add column if not exists origin_ip_region text;

-- Der Wert kommt aus dem Browser und ist damit nicht verifizierbar. Die
-- Einschraenkung haelt lediglich Muell aus der Spalte; als Beleg taugt sie
-- nicht, deshalb steht sie in der Moderation auch als "Angabe" und nicht als
-- Tatsache. Verifiziert ist nur der Punkt selbst: Er muss exakt auf einem
-- Rasterzellpunkt liegen (isAnonymizedPoint in lib/geo-anonymize.ts).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'repairs_origin_source_check'
  ) then
    alter table public.repairs
      add constraint repairs_origin_source_check
      check (origin_source is null or origin_source in ('photo', 'gps', 'manual', 'ip'));
  end if;
end;
$$;

comment on column public.repairs.origin_source is
  'Woher die Herkunftszelle stammt: photo (EXIF), gps (Standortfreigabe), manual (Kreis-Auswahl), ip (Vercel-Geo-Header). Angabe des Browsers, nicht verifiziert.';
comment on column public.repairs.origin_ip_region is
  'Grobe Herkunft der Verbindung als "DE-BY", aus dem Vercel-Geo-Header. Bundesland-Ebene, nie die IP selbst. Dient der Moderation als Gegenprobe zur angegebenen Herkunft.';

/* Kein GRANT noetig: 202608260003_anonymized_origin.sql hat das table-weite
   SELECT fuer anon/authenticated entzogen und die uebrigen Spalten einzeln
   zurueckgegeben. Eine neue Spalte ist damit von aussen nicht lesbar, solange
   sie nicht ausdruecklich gegrantet wird - genau wie kreis in
   202608270002_repair_kreis_column.sql. */

-- Blockierte Einreichungsversuche von ausserhalb des Gebiets.
--
-- Der Rekordversuch zaehlt nur Reparaturen aus Nordrhein-Westfalen. Wer von
-- ausserhalb einreicht, bekommt jetzt eine freundliche Absage mit Verweis auf
-- die Reparatur-Initiativen in der eigenen Gegend (siehe
-- lib/outside-region-help.ts) - die Einreichung selbst wird abgewiesen, bevor
-- ueberhaupt ein Bild hochgeladen wird.
--
-- Diese Tabelle haelt bewusst *nur* den Zaehler und die grobe Gegend: keinen
-- Text, kein Foto, keine Kategorie, keine ID. Wir wollen sagen koennen "so
-- viele Menschen von ausserhalb wollten mitmachen", ohne die Daten von
-- Menschen zu speichern, denen wir gerade abgesagt haben.
create table if not exists public.blocked_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- ISO 3166-1 alpha-2 aus x-vercel-ip-country, z. B. 'DE'.
  ip_country text,
  -- Sub-Region aus x-vercel-ip-country-region, z. B. 'BY'.
  ip_region text,
  -- Stadt aus x-vercel-ip-city. Stadtgenau ist die groebste Angabe, mit der
  -- sich noch sagen laesst, wohin verwiesen wurde - und sie steht ohnehin im
  -- Link, den die abgewiesene Person zu sehen bekommt.
  ip_city text
);

comment on table public.blocked_submissions is
  'Zaehler abgewiesener Einreichungen von ausserhalb des Gebiets. Enthaelt keine Inhalte und keinen Bezug zu einer Person - nur Zeitpunkt und grobe Gegend der Verbindung.';

create index if not exists blocked_submissions_created_at_idx
  on public.blocked_submissions (created_at desc);

alter table public.blocked_submissions enable row level security;

/* Wie bei push_subscriptions: geschrieben und gelesen wird ausschliesslich mit
   dem Service-Role-Key, der RLS umgeht. Ohne GRANT und ohne Policy kommt
   niemand sonst an die Tabelle. */
revoke all on public.blocked_submissions from anon, authenticated;
