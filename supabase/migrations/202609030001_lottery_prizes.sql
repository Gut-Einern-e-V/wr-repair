-- Gewinnspiel: Preise, Ausschluesse und eine Ziehung je Preis (Issue #45).
--
-- Bisher war das Gewinnspiel ein Haekchen im Formular und ein Knopf im
-- Backend, der irgendeine Person zog. Was es zu gewinnen gibt, stand nirgends,
-- und wer einmal gezogen war, konnte gleich noch einmal gezogen werden.
--
-- Drei Dinge kommen deshalb dazu:
--
-- 1. `lottery_prizes` - die Preise selbst, pflegbar durch Superadmins. Sie
--    werden gestiftet, meist von Unternehmen, gelegentlich von Privatpersonen;
--    beides muss sich benennen lassen, weshalb `sponsor_kind` unterscheidet.
-- 2. `lottery_exclusions` - Adressen und Domains, die nicht gewinnen koennen.
--    Das Projektteam ist von der Verlosung ausgeschlossen, und niemand soll
--    sich darauf verlassen muessen, das bei jeder Ziehung von Hand zu merken.
-- 3. Zwei Spalten an `lottery_entries`: welchen Preis eine Anmeldung gewonnen
--    hat, und ob sie von der Ziehung ausgenommen ist.

create table public.lottery_prizes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  -- Der kurze Erklaertext, der auf der oeffentlichen Seite am Preis haengt.
  description text check (char_length(description) <= 600),
  sponsor_name text check (char_length(sponsor_name) <= 160),
  -- Ein Preis kommt nicht immer von einer Firma. Bei einer Privatperson steht
  -- kein Logo daneben, und die Seite schreibt "gestiftet von" statt des Logos.
  sponsor_kind text not null default 'organisation'
    check (sponsor_kind in ('organisation', 'person')),
  sponsor_website text check (char_length(sponsor_website) <= 500),
  logo_path text,
  -- Wie viele Exemplare es davon gibt; so oft wird fuer diesen Preis gezogen.
  quantity integer not null default 1 check (quantity between 1 and 999),
  -- Hauptpreis: wird auf der Buehne gezogen (siehe /tombola), nicht zusammen
  -- mit den kleinen Preisen im Backend.
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.lottery_prizes is
  'Gestiftete Preise des Gewinnspiels. Keine personenbezogenen Daten - die stehen in lottery_entries.';

create index lottery_prizes_order_idx on public.lottery_prizes (is_main desc, sort_order, created_at);

create table public.lottery_exclusions (
  id uuid primary key default gen_random_uuid(),
  -- Entweder eine ganze Adresse ("anna@example.org") oder eine Domain
  -- ("@example.org"). Immer kleingeschrieben gespeichert, damit der Vergleich
  -- nicht an der Schreibweise scheitert.
  pattern text not null check (char_length(pattern) between 3 and 320),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (pattern)
);

comment on table public.lottery_exclusions is
  'Adressen und Domains, die nicht gewinnen koennen - Projektteam und Durchfuehrende.';

alter table public.lottery_entries
  -- Welchen Preis diese Anmeldung gewonnen hat. `restrict` statt `set null`:
  -- Ein Preis, auf den bereits gezogen wurde, darf nicht verschwinden und
  -- einen Gewinn ohne Gegenstand zuruecklassen.
  add column prize_id uuid references public.lottery_prizes(id) on delete restrict,
  -- Von der Ziehung ausgenommen: entweder ueber die Ausschlussliste oder weil
  -- eine Ziehung zurueckgenommen wurde. Ohne diese Spalte kaeme dieselbe
  -- Person beim naechsten Zug sofort wieder heraus.
  add column excluded_at timestamptz;

comment on column public.lottery_entries.prize_id is
  'Der gewonnene Preis. Null heisst: noch nichts gewonnen.';
comment on column public.lottery_entries.excluded_at is
  'Zeitpunkt des Ausschlusses von der Ziehung. Null heisst: nimmt teil.';

create index lottery_entries_prize_idx on public.lottery_entries (prize_id);

-- Der Veranstalter des Gewinnspiels steht in den Teilnahmebedingungen und ist
-- noch nicht abschliessend geklaert. Er gehoert deshalb ins Backend und nicht
-- in den Quelltext: Sobald Name, Anschrift und Kontaktadresse feststehen,
-- werden sie eingetragen, ohne dass jemand ein Deployment braucht.
alter table public.campaign_settings
  add column lottery_organizer_name text,
  add column lottery_organizer_address text,
  add column lottery_organizer_email text;

create trigger lottery_prizes_set_updated_at
before update on public.lottery_prizes
for each row execute function public.set_updated_at();

alter table public.lottery_prizes enable row level security;
alter table public.lottery_exclusions enable row level security;

-- Die Preise stehen oeffentlich auf /gewinnspiel; sie enthalten nichts, was
-- nicht ohnehin dort steht.
create policy "Public reads lottery prizes"
on public.lottery_prizes for select
to anon, authenticated
using (true);

create policy "Superadmins manage lottery prizes"
on public.lottery_prizes for all
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));

-- Die Ausschlussliste ist eine Liste von Adressen und damit nichts fuer die
-- Oeffentlichkeit.
create policy "Superadmins manage lottery exclusions"
on public.lottery_exclusions for all
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prize-logos',
  'prize-logos',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads prize logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'prize-logos');

create policy "Superadmins manage prize logos"
on storage.objects for all
to authenticated
using (bucket_id = 'prize-logos' and (select public.is_superadmin()))
with check (bucket_id = 'prize-logos' and (select public.is_superadmin()));
