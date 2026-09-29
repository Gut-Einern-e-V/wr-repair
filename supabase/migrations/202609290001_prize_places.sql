-- Gewinnspiel: Platzierungen statt Reihenfolge und Anzahl (Issue #119).
--
-- Bisher hatte ein Preis eine Anzahl und eine Position in einer von Hand
-- sortierten Liste. Gewuenscht ist, was eine Preisliste ueblicherweise ist:
-- "1. Platz ...", "2. Platz ...", und fuer mehrfach gestiftete Preise ein
-- Bereich - "10.-20. Platz ...". Der Bereich ist dann auch die Anzahl, und
-- die Reihenfolge ergibt sich aus dem ersten Platz.
--
-- `quantity` bleibt als Spalte stehen, weil die Ziehung danach zaehlt. Eine
-- Pruefbedingung haelt sie mit dem Bereich gleich, damit nie zwei Angaben
-- auseinanderlaufen. `sort_order` wird nicht mehr gelesen und bleibt nur
-- stehen, damit ein zurueckgerolltes Deployment noch funktioniert.

alter table public.lottery_prizes
  add column if not exists place_from integer,
  add column if not exists place_to integer;

comment on column public.lottery_prizes.place_from is
  'Erster Platz, den dieser Preis belegt. Bestimmt die Reihenfolge auf /gewinnspiel.';
comment on column public.lottery_prizes.place_to is
  'Letzter Platz, den dieser Preis belegt. Gleich place_from bei einem einzelnen Platz.';

-- Bestehende Preise in ihrer bisherigen Reihenfolge lueckenlos hintereinander
-- platzieren, jeder so breit wie seine Anzahl. Dieselbe Regel steht als
-- derivePlaces() in lib/prize-list.ts fuer die Zeit bis zu dieser Migration.
with ordered as (
  select
    id,
    sum(quantity) over (order by is_main desc, sort_order, created_at, id) as running,
    quantity
  from public.lottery_prizes
)
update public.lottery_prizes prize
set place_from = ordered.running - ordered.quantity + 1,
    place_to = ordered.running
from ordered
where prize.id = ordered.id
  and prize.place_from is null;

alter table public.lottery_prizes
  alter column place_from set not null,
  alter column place_to set not null;

alter table public.lottery_prizes
  drop constraint if exists lottery_prizes_places_check,
  add constraint lottery_prizes_places_check
    check (place_from >= 1 and place_to >= place_from);

alter table public.lottery_prizes
  drop constraint if exists lottery_prizes_quantity_matches_places,
  add constraint lottery_prizes_quantity_matches_places
    check (quantity = place_to - place_from + 1);

-- Jeder Platz gehoert hoechstens einem Preis. Ohne diese Bedingung koennten
-- zwei gleichzeitig gespeicherte Preise denselben Platz bekommen, obwohl die
-- Route vorher nachsieht.
alter table public.lottery_prizes
  drop constraint if exists lottery_prizes_places_disjoint,
  add constraint lottery_prizes_places_disjoint
    exclude using gist (int4range(place_from, place_to, '[]') with &&);

drop index if exists public.lottery_prizes_order_idx;
create index if not exists lottery_prizes_place_idx on public.lottery_prizes (place_from);
