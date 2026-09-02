-- Schaltbare Drosselung der oeffentlichen Leseroute (Issue #80).
--
-- Die oeffentlichen Routen haben feste, absichtlich grosszuegige Grenzen: Bei
-- einer Veranstaltung stecken alle Geraete hinter derselben IP-Adresse, und ein
-- zu strenges Limit hat schon einmal den Kreis-Vorschlag im Formular
-- abgeschossen (siehe Issue #64). Grosszuegig heisst aber auch: Wer die Routen
-- im Sekundentakt abfragt, kommt weit - und Vercel wie Supabase rechnen im
-- kostenlosen Tarif nach Aufrufen und ausgeliefertem Datenvolumen.
--
-- Deshalb keine dauerhaft strengere Grenze, sondern ein Schalter: Im
-- Normalbetrieb bleiben die Vorgaben der Routen, und wenn ein Kontingent knapp
-- wird, laesst sich im Backend eine engere Grenze je IP-Adresse einschalten -
-- ohne Deployment, also auch mitten in einer Veranstaltung.
--
-- Beide Spalten bleiben nullbar: Ohne Wert gilt der Normalbetrieb, eine
-- Bereitstellung ohne diese Migration verhaelt sich also genau wie bisher.
--
-- `rate_limit_per_minute` ist bewusst nicht auf einen technischen Maximalwert
-- gedeckelt, sondern auf eine Zahl, die noch als Grenze gemeint sein kann. Wer
-- eine Million eintraegt, will nicht drosseln, sondern hat sich vertippt.
alter table public.campaign_settings
  add column if not exists rate_limit_enabled boolean,
  add column if not exists rate_limit_per_minute integer
    check (rate_limit_per_minute is null or rate_limit_per_minute between 1 and 100000);

comment on column public.campaign_settings.rate_limit_enabled is
  'Drosselung der oeffentlichen Leseroute je IP-Adresse aktiv. Null/false: es gelten die Vorgaben der Routen.';
comment on column public.campaign_settings.rate_limit_per_minute is
  'Anfragen je Minute und IP-Adresse, solange die Drosselung aktiv ist. Null: Standardwert der Anwendung.';
