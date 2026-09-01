-- Abgelehnte Einreichungen: Bild weg, Eintrag bleibt (Issue #58).
--
-- Das Bild einer abgelehnten Einreichung wird schon heute aus dem Speicher
-- entfernt - der Datenspeicher soll nichts aufbewahren, was niemand mehr sehen
-- darf. `image_path` blieb dabei aber stehen und zeigte danach ins Leere: Die
-- Moderation bekam eine signierte Adresse auf eine geloeschte Datei und damit
-- ein kaputtes Bild.
--
-- Die Zeile selbst bleibt bewusst erhalten. Wer sich ueber eine Ablehnung
-- beschwert, soll von der Administration wieder eingesetzt werden koennen -
-- ohne Bild, aber mit der Reparatur, die dann fuer den Rekord zaehlt. Dafuer
-- muss unterscheidbar sein, ob nie ein Bild eingereicht wurde oder ob es die
-- Ablehnung geloescht hat.
alter table public.repairs
  add column if not exists image_deleted_at timestamptz;

comment on column public.repairs.image_deleted_at is
  'Zeitpunkt, zu dem das Bild nach einer Ablehnung geloescht wurde. Null heisst: Es gab nie eines, oder es liegt noch da.';

-- Wie claimed_by/claimed_at und die Herkunftsspalten ohne GRANT fuer
-- anon/authenticated (siehe 202608260003_anonymized_origin.sql): Das
-- tabellenweite SELECT ist dort entzogen, und diese Angabe geht allein die
-- Moderation etwas an, die mit dem Service-Role-Schluessel liest.
