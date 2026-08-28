-- Push-Benachrichtigungen fuer die Moderation.
--
-- Wer moderiert, sitzt nicht dauerhaft vor der Warteschlange. Bisher fiel eine
-- neue Einreichung erst auf, wenn jemand /moderator von sich aus aufrief. Diese
-- Tabelle haelt die Web-Push-Abos der Moderationskonten, damit der Server sie
-- bei einer neuen Einreichung erreichen kann.
--
-- Bewusst je Geraet eine Zeile statt je Konto: Wer am Rechner und am Handy
-- arbeitet, hat zwei Abos, und ein abgelaufenes Geraet soll das andere nicht
-- mitnehmen.
create table if not exists public.push_subscriptions (
  -- Der Endpoint ist die vom Push-Dienst vergebene, eindeutige Adresse des
  -- Geraets und damit der natuerliche Schluessel.
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Oeffentlicher Schluessel und Auth-Secret des Browsers. Ohne beide laesst
  -- sich die Nachricht nicht verschluesseln.
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- Letzter erfolgreicher Versand; macht in der Tabelle sichtbar, welche Abos
  -- noch leben, ohne dafuer den Push-Dienst zu befragen.
  last_success_at timestamptz
);

comment on table public.push_subscriptions is
  'Web-Push-Abos der Moderationskonten. Eine Zeile je Geraet, Schluessel ist der Endpoint des Push-Dienstes.';

-- Alle Abos eines Kontos abmelden, wenn die Rolle entzogen wird.
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

/* Kein GRANT fuer anon/authenticated und damit keine Policy fuer den normalen
   Zugriff: Gelesen und geschrieben wird ausschliesslich mit dem
   Service-Role-Key aus app/api/notifications/, der RLS ohnehin umgeht. Das
   entspricht der Handhabung der anonymisierten Herkunftsspalten in
   202608260003_anonymized_origin.sql - die Daten gehen den Browser nichts an.

   p256dh und auth sind Geheimnisse: Wer sie hat, kann diesem Geraet
   Benachrichtigungen schicken. Sie duerfen den Server nie verlassen. */
revoke all on public.push_subscriptions from anon, authenticated;

/* Moderierende duerfen ihre eigenen Abos sehen - nur dafuer, damit die Konsole
   anzeigen kann, ob dieses Geraet angemeldet ist, falls das spaeter ohne
   Service-Role gebraucht wird. Die Schluesselspalten bleiben ausgespart. */
grant select (endpoint, user_id, created_at, last_success_at)
  on public.push_subscriptions to authenticated;

create policy "Moderators read their own push subscriptions"
on public.push_subscriptions for select
to authenticated
using (user_id = (select auth.uid()) and (select public.is_moderator_or_higher()));
