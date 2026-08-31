-- Zuverlaessigkeit der Einreichung (Issue #64).
--
-- Beim ersten User-Test sind Einreichungen fehlgeschlagen oder haben sehr
-- lange gedauert. Drei Ursachen liegen im Datenmodell, und diese Migration
-- raeumt sie aus:
--
-- 1. Das Einreichungslimit lag im Arbeitsspeicher der jeweiligen
--    Serverless-Instanz. Es war damit gleichzeitig zu streng (drei
--    Einreichungen je Viertelstunde und IP - bei einem Test sitzen alle im
--    selben WLAN, also auf *einer* IP) und wirkungslos gegen Missbrauch, weil
--    jede neue Instanz wieder bei null anfing. `submission_throttle` haelt den
--    Zaehler jetzt einmal fuer alle Instanzen.
-- 2. Ein abgebrochener Sendeversuch liess sich nicht von einem echten
--    Zweiteintrag unterscheiden. `repairs.client_key` macht den erneuten
--    Versuch des Browsers folgenlos: dieselbe Einreichung landet einmal in der
--    Tabelle, egal wie oft sie ankommt.
-- 3. Warum eine Einreichung scheiterte, war hinterher nicht mehr feststellbar
--    - die Routen haben jeden Fehler stillschweigend in eine deutsche
--    Meldung uebersetzt. `submission_failures` schreibt den Grund auf.

-- ---------------------------------------------------------------------------
-- Einreichungslimit
-- ---------------------------------------------------------------------------

-- Ein gleitendes Fenster je Schluessel. Der Schluessel ist *kein* Klartext:
-- Die Einreichungsseite verspricht, dass die IP-Adresse nicht gespeichert
-- wird, und dieses Versprechen gilt auch hier. Was ankommt, ist ein gesalzener
-- SHA-256-Abdruck (siehe throttleKey() in lib/submission-gate.ts) - genug, um
-- zwei Anfragen derselben Verbindung zusammenzufuehren, und zu wenig, um
-- daraus wieder eine Adresse zu machen.
create table if not exists public.submission_throttle (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);

comment on table public.submission_throttle is
  'Zaehler des Einreichungslimits je gesalzenem IP-Abdruck. Enthaelt keine Klartext-Adressen.';

alter table public.submission_throttle enable row level security;
-- Bewusst ohne Policy: Nur der Service-Role-Schluessel des Servers greift
-- darauf zu, und der umgeht RLS ohnehin. Alles andere sieht nichts.
revoke all on public.submission_throttle from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Wiederholte Sendeversuche
-- ---------------------------------------------------------------------------

-- Vom Browser vergebener Schluessel eines Einreichungsvorgangs. Er bleibt
-- ueber alle Wiederholungsversuche derselben Person gleich, weshalb der
-- eindeutige Index aus einem doppelt angekommenen Versuch einen Konflikt macht
-- statt eines zweiten Eintrags. Null bleibt erlaubt: Aeltere Browser-Sitzungen
-- und die Moderation schicken keinen.
alter table public.repairs add column if not exists client_key text;

comment on column public.repairs.client_key is
  'Schluessel des Sendevorgangs aus dem Browser. Verhindert, dass ein Wiederholungsversuch eine zweite Zeile anlegt.';

create unique index if not exists repairs_client_key_idx
  on public.repairs (client_key)
  where client_key is not null;

-- ---------------------------------------------------------------------------
-- Fehlerprotokoll
-- ---------------------------------------------------------------------------

-- Was beim Einreichen schiefging, in der Sprache des Servers. Bewusst ohne
-- alles, was auf eine Person zurueckfuehrt: kein Inhalt, keine Adresse, keine
-- Mail. `ip_region` ist dieselbe grobe Angabe wie in `blocked_submissions`
-- ("DE-NW"), damit sich ein Ausfall einer einzelnen Gegend zuordnen laesst.
create table if not exists public.submission_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Wo im Ablauf: 'gate', 'captcha', 'insert', 'image', 'lottery', 'notify'.
  stage text not null,
  -- Kurzform fuer die Auswertung, z. B. 'captcha_unavailable'.
  reason text not null,
  -- Meldung des Dienstes, gekuerzt. Fuer Menschen, nicht fuer Abfragen.
  detail text,
  ip_region text,
  -- Gesetzt, wenn die Einreichung trotz des Fehlers zustande kam - dann sagt
  -- die Zeile nicht "verloren", sondern "unvollstaendig".
  repair_id uuid references public.repairs(id) on delete set null
);

comment on table public.submission_failures is
  'Fehlgeschlagene oder unvollstaendige Einreichungen. Ohne Inhalte und ohne Personenbezug, nur Grund und Zeitpunkt.';

create index if not exists submission_failures_created_at_idx
  on public.submission_failures (created_at desc);

alter table public.submission_failures enable row level security;
-- Auch hier ohne Policy: Gelesen wird ausschliesslich ueber /api/admin/status,
-- und das laeuft mit dem Service-Role-Schluessel hinter der Admin-Anmeldung.
revoke all on public.submission_failures from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Torwaechter
-- ---------------------------------------------------------------------------

-- Limitpruefung und Kampagneneinstellungen in einem einzigen Aufruf.
--
-- Die beiden gehoeren fachlich nicht zusammen, in der Laufzeit aber sehr wohl:
-- Die Einreichungsroute braucht vor jeder Entscheidung beides, und jeder
-- zusaetzliche Roundtrip nach Frankfurt ist Wartezeit fuer den Menschen vor
-- dem Formular. Genau diese Wartezeit ist die zweite Haelfte von Issue #64,
-- deshalb steht der persistente Zaehler hier zusammen mit den Einstellungen
-- statt als eigene Abfrage daneben.
--
-- `volatile`, weil die Funktion schreibt. Das Fenster ist bewusst ein
-- springendes und kein gleitendes: Ein springendes Fenster braucht eine Zeile
-- je Verbindung, ein gleitendes eine Zeile je Versuch.
create or replace function public.submission_gate(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window interval := make_interval(secs => greatest(p_window_seconds, 1));
  v_start timestamptz;
  v_hits integer;
  v_settings jsonb;
begin
  -- Abgelaufene Zeilen wegraeumen, solange es billig ist. Ein eigener Cronjob
  -- waere fuer eine Tabelle, die pro Aktionswoche ein paar hundert Zeilen
  -- sieht, mehr Betrieb als Nutzen.
  delete from public.submission_throttle
  where window_start < now() - v_window - interval '1 hour';

  insert into public.submission_throttle as t (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set
      -- Fenster abgelaufen: von vorn. Sonst hochzaehlen.
      window_start = case when t.window_start < now() - v_window then now() else t.window_start end,
      hits = case when t.window_start < now() - v_window then 1 else t.hits + 1 end
  returning t.window_start, t.hits into v_start, v_hits;

  select to_jsonb(s) into v_settings
  from public.campaign_settings s
  where s.id = true;

  return jsonb_build_object(
    'allowed', v_hits <= greatest(p_limit, 1),
    'hits', v_hits,
    'retryAfterSeconds', greatest(1, ceil(extract(epoch from (v_start + v_window - now())))::integer),
    'settings', v_settings
  );
end;
$$;

comment on function public.submission_gate(text, integer, integer) is
  'Einreichungslimit fortschreiben und Kampagneneinstellungen liefern - ein Roundtrip statt zwei.';

revoke all on function public.submission_gate(text, integer, integer) from public, anon, authenticated;
grant execute on function public.submission_gate(text, integer, integer) to service_role;
