-- Strichlisten von Repair-Cafes (Issue #158).
--
-- Manche Repair-Cafes zaehlen ihre Reparaturen auf Papier, statt jede einzeln
-- ins Formular einzutragen. Das Team traegt solche Listen im Admin-Backend als
-- Sammeleingabe nach: "12 Fahrraeder, 5 Moebel" an einem Ort und Tag.
--
-- Jede Reparatur der Liste wird eine eigene Zeile in `repairs`. Damit zaehlen
-- sie ueberall mit, wo heute gezaehlt wird - Live-Stand, Kreise, Tagesrekord,
-- Kategorien -, ohne dass eine einzige Statistikfunktion davon wissen muss.
-- `tally_sheets` haelt fest, woher diese Zeilen stammen: Ein Fehler in der
-- Liste laesst sich so als Ganzes zuruecknehmen (`on delete cascade`).
--
-- Die Mail-Adresse fuer das Gewinnspiel steht nicht hier, sondern wie bei
-- jeder Einreichung in `lottery_entries` - personenbezogene Daten bleiben an
-- einer Stelle.

create table public.tally_sheets (
  id uuid primary key default gen_random_uuid(),
  cafe_name text not null check (char_length(cafe_name) between 1 and 160),
  -- Freitext zur Dokumentation. Gezaehlt wird ueber Kreis und Punkt.
  address text check (char_length(address) <= 300),
  event_date date not null,
  -- Ein Repair-Cafe ist ein oeffentlicher Ort; der Punkt wird nur gerundet,
  -- nicht verschoben (coarsenCoordinates in lib/geo-anonymize.ts).
  location_lat numeric(6,3),
  location_lon numeric(6,3),
  kreis text,
  repair_count integer not null check (repair_count > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.tally_sheets is
  'Nachgetragene Strichlisten von Repair-Cafes. Jede Reparatur steht zusaetzlich als Zeile in repairs (tally_sheet_id).';

create index tally_sheets_created_idx on public.tally_sheets (created_at desc);

alter table public.repairs
  add column if not exists tally_sheet_id uuid references public.tally_sheets(id) on delete cascade;

create index if not exists repairs_tally_sheet_idx on public.repairs (tally_sheet_id)
  where tally_sheet_id is not null;

-- Wie alle Verwaltungstabellen nur ueber den Service-Role-Key erreichbar
-- (siehe 202609290002_close_public_table_access.sql).
alter table public.tally_sheets enable row level security;

create policy "Admins read tally sheets"
on public.tally_sheets for select
to authenticated
using ((select private.is_admin_or_higher()));

revoke all on public.tally_sheets from anon, authenticated;
