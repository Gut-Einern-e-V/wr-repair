-- Freigabeliste fuer IP-Adressen der oeffentlichen Leseroute (Issue #80).
--
-- Die Drosselung aus 202609020002 trifft alle gleich - auch den Rechner am
-- Beamer, der die Buehne stundenlang offen haelt und dabei vier Deltas je
-- Minute abfragt. Genau der soll nie anschlagen: Er ist die Anzeige, um deren
-- Betrieb es geht, und wenn er stehenbleibt, sieht es der ganze Saal.
--
-- Deshalb eine Liste von Adressen, die von der Grenze ausgenommen sind.
-- Erlaubt sind einzelne Adressen und Praefixe in CIDR-Schreibweise; das
-- Praefix ist kein Komfort, sondern der Normalfall, weil der Anschluss einer
-- Veranstaltung taeglich eine neue Adresse aus demselben Netz bekommt (siehe
-- lib/ip-allowlist.ts).
--
-- Bewusst nur fuer die *Leseroute*: Die Einreichung bleibt gedrosselt. Ihr
-- Limit ist die einzige Bremse gegen ein Skript, das ohne Captcha auf die
-- Route eindrischt, und mit 40 Einreichungen je Minute ohnehin auf ein volles
-- Reparatur-Cafe hinter einer IP-Adresse ausgelegt.
--
-- Die Spalte bleibt nullbar: Ohne Wert gibt es keine Freigabe, eine
-- Bereitstellung ohne diese Migration verhaelt sich also wie bisher.
--
-- Datenschutz: Hier stehen Adressen von *Anzeigegeraeten*, die jemand von Hand
-- eintraegt - keine mitgeschriebenen Adressen einreichender Menschen. Die
-- werden weiterhin nirgends gespeichert; das Einreichungslimit zaehlt auf einem
-- gesalzenen Abdruck (siehe throttleKey in lib/submission-gate.ts).
alter table public.campaign_settings
  add column if not exists rate_limit_allowlist text[];

-- Ein Deckel gegen die verrutschte Zwischenablage. Die Pruefung der einzelnen
-- Schreibweisen sitzt in der Anwendung, weil dort die Fehlermeldung entsteht,
-- die jemand lesen soll.
alter table public.campaign_settings
  drop constraint if exists campaign_rate_limit_allowlist_is_short;

alter table public.campaign_settings
  add constraint campaign_rate_limit_allowlist_is_short check (
    rate_limit_allowlist is null or array_length(rate_limit_allowlist, 1) <= 32
  );

comment on column public.campaign_settings.rate_limit_allowlist is
  'IP-Adressen und CIDR-Praefixe, die von der Drosselung der oeffentlichen Leseroute ausgenommen sind. Gilt nicht fuer die Einreichung.';
