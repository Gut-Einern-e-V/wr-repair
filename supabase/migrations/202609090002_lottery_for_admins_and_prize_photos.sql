-- Verlosung fuer Admins, Foto am Preis, Reihenfolge der Partner (Issues #98, #99).
--
-- Drei Aenderungen, die alle an denselben Tabellen haengen:
--
-- 1. Die Verlosung war ganz Superadmin-Sache. Wer die Preise pflegt, ist aber
--    nicht dieselbe Person, die am Ende zieht: Preise kommen waehrend der
--    Aktion herein, oft telefonisch, und muessen gleich eingetragen werden.
--    Preise und Ausschlussliste pflegen deshalb Admins. Die Ziehung selbst
--    bleibt bei den Superadmins - sie ist der unumkehrbare Teil (siehe
--    app/api/admin/lottery/route.ts).
-- 2. Ein Preis zeigte bisher hoechstens das Logo der stiftenden Organisation.
--    Was es zu gewinnen gibt, sah man nicht. `image_path` haelt das Foto des
--    Gegenstands - anders als das Logo auch bei privat gestifteten Preisen.
-- 3. Die Reihenfolge der Partner wird ueber /api/admin/partners gepflegt und
--    braucht kein Schema: `sort_order` steht seit 202607170007, und die
--    Richtlinie dazu hat bereits 202608270001 von Superadmin auf Admin
--    gestellt. Hier ist deshalb nichts mehr zu tun.
--
-- Jedes `create policy` steht hinter einem `drop policy if exists` auf den
-- *eigenen* Namen. Sonst bricht ein zweiter Durchlauf mit 42710 ab - genau
-- daran ist die erste Fassung dieser Datei gescheitert, weil sie die
-- Partner-Richtlinien ein zweites Mal anlegen wollte.

alter table public.lottery_prizes
  add column if not exists image_path text;

comment on column public.lottery_prizes.image_path is
  'Foto des Gewinns im Eimer prize-photos. Null heisst: kein Foto, dann steht auf der Seite nur der Text.';

-- Preise: pflegen darf, wer die Aktion verwaltet.
drop policy if exists "Superadmins manage lottery prizes" on public.lottery_prizes;
drop policy if exists "Admins manage lottery prizes" on public.lottery_prizes;

create policy "Admins manage lottery prizes"
on public.lottery_prizes for all
to authenticated
using ((select public.is_admin_or_higher()))
with check ((select public.is_admin_or_higher()));

-- Ausschlussliste: dieselbe Runde. Sie ist Voraussetzung dafuer, dass eine
-- Ziehung ueberhaupt sauber laufen kann, und muss vorher stehen - nicht in dem
-- Moment, in dem eine Superadmin Zeit hat.
drop policy if exists "Superadmins manage lottery exclusions" on public.lottery_exclusions;
drop policy if exists "Admins manage lottery exclusions" on public.lottery_exclusions;

create policy "Admins manage lottery exclusions"
on public.lottery_exclusions for all
to authenticated
using ((select public.is_admin_or_higher()))
with check ((select public.is_admin_or_higher()));

-- Das Foto des Gewinns. Eigener Eimer und nicht der der Logos: Ein Logo ist
-- meist ein SVG und wird klein dargestellt, ein Foto ist ein Foto. Dieselbe
-- knappe Grenze von 1 MB, damit auf der Gewinnspielseite nicht zwanzig
-- Handybilder in Originalgroesse liegen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prize-photos',
  'prize-photos',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads prize photos" on storage.objects;

create policy "Public reads prize photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'prize-photos');

drop policy if exists "Admins manage prize photos" on storage.objects;

create policy "Admins manage prize photos"
on storage.objects for all
to authenticated
using (bucket_id = 'prize-photos' and (select public.is_admin_or_higher()))
with check (bucket_id = 'prize-photos' and (select public.is_admin_or_higher()));

-- Die Logos gehoeren zum selben Formular und folgen derselben Regel.
drop policy if exists "Superadmins manage prize logos" on storage.objects;
drop policy if exists "Admins manage prize logos" on storage.objects;

create policy "Admins manage prize logos"
on storage.objects for all
to authenticated
using (bucket_id = 'prize-logos' and (select public.is_admin_or_higher()))
with check (bucket_id = 'prize-logos' and (select public.is_admin_or_higher()));
