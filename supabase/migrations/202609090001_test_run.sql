-- Testlauf-Schalter fuer die ganze Aktion (Issue #102).
--
-- Vor einer Veranstaltung soll der ganze Weg einmal durchgespielt werden
-- koennen: einreichen, moderieren, auf der Buehne auftauchen. Bisher ging das
-- nur, indem jemand den Teilnahmezeitraum vorruebergehend aufgemacht hat - und
-- dann sah die oeffentliche Seite aus wie im Ernstfall. Niemand konnte
-- erkennen, dass gerade geprobt wird.
--
-- Der Schalter steht deshalb neben dem Zeitraum in derselben Zeile: Er oeffnet
-- die Einreichung unabhaengig vom Zeitraum und laesst jede oeffentliche Seite
-- sagen, dass es ein Testlauf ist. Null und false sind dasselbe - "kein
-- Testlauf" -, damit eine Umgebung ohne diese Migration sich genau wie bisher
-- verhaelt (siehe lib/app-settings.ts).
--
-- Bewusst *kein* Merkmal an der einzelnen Einreichung: Die Einreichungen eines
-- Testlaufs bleiben normale Einreichungen und werden von der Moderation
-- abgelehnt. Damit sie dort auffindbar sind, setzt die Einreichungsroute bei
-- aktivem Testlauf den vorhandenen Tag `testlauf` (siehe
-- app/api/repairs/route.ts).
alter table public.campaign_settings
  add column if not exists test_run_enabled boolean;

comment on column public.campaign_settings.test_run_enabled is
  'Testlauf aktiv: Einreichungen sind unabhaengig vom Zeitraum offen und alle oeffentlichen Seiten weisen darauf hin. Null heisst: kein Testlauf.';
