-- Verlorene Einreichungen zaehlen und aufheben (Issue #107).
--
-- Bisher beantwortete das Fehlerprotokoll die Frage "woran hat es gelegen?",
-- aber nicht die beiden, die im Issue stehen: *wie viele* sind es, und ist die
-- Reparatur damit endgueltig weg?
--
-- Zur ersten Frage: `submission_failures` bekam je Grund und Serverinstanz
-- genau eine Zeile (siehe logSubmissionFailureOnce). Das war gegen eine
-- volllaufende Tabelle gedacht und ist als Schutz richtig - als Zaehlung ist
-- es wertlos, weil drei Zeilen fuer drei Faelle stehen koennen oder fuer
-- dreihundert. Ein Zaehler loest beides: eine Zeile je Grund, aber mit der
-- Anzahl daran.
--
-- Zur zweiten Frage: Ja, sie war weg. Die Angaben blieben allein im
-- Browserformular stehen; wer den Tab schloss, hatte sie verloren, und wir
-- haetten nie erfahren, was da nicht angekommen ist. `abandoned_submissions`
-- hebt deshalb auf, was bis zum Abbruch eingetragen war.


-- ---------------------------------------------------------------------------
-- 1. Zaehler statt Einzelzeilen
-- ---------------------------------------------------------------------------

alter table public.submission_failures
  add column if not exists hits integer not null default 1,
  add column if not exists last_at timestamptz not null default now();

comment on column public.submission_failures.hits is
  'Wie oft dieser Grund seit dem ersten Auftreten gezaehlt wurde. Zeilen mit repair_id bleiben Einzelfaelle (hits = 1).';
comment on column public.submission_failures.last_at is
  'Letztes Auftreten. created_at bleibt das erste - zusammen ergeben sie den Zeitraum.';

/* Ein Vorfall ohne `repair_id` heiszt "verloren" und beschreibt ein Muster:
   Der Spam-Schutz antwortet nicht, der Schluessel fehlt, die Datenbank nimmt
   nichts an. Dafuer genuegt eine Zeile je Grund. Eine Zeile *mit* repair_id
   heiszt dagegen "unvollstaendig" und gehoert zu genau einer Reparatur - die
   darf nie mit einer anderen zusammenfallen, sonst zeigt die Moderation auf
   die falsche. */
create or replace function public.record_submission_failure(
  p_stage text,
  p_reason text,
  p_detail text,
  p_ip_region text
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- Die juengste Zeile dieses Grundes fortschreiben. Bewusst nur eine: Vor
  -- dieser Migration konnten mehrere entstehen, und die sollen ihre eigenen
  -- Zeitstempel behalten statt nachtraeglich verschmolzen zu werden.
  select f.id into v_id
  from public.submission_failures f
  where f.repair_id is null and f.stage = p_stage and f.reason = p_reason
  order by f.created_at desc
  limit 1;

  if v_id is null then
    insert into public.submission_failures (stage, reason, detail, ip_region)
    values (p_stage, p_reason, p_detail, p_ip_region);
  else
    update public.submission_failures
    set
      hits = hits + 1,
      last_at = now(),
      -- Die letzte Meldung ist die nuetzlichere: Sie sagt, ob die Stoerung
      -- noch dieselbe ist.
      detail = coalesce(p_detail, detail),
      ip_region = coalesce(p_ip_region, ip_region)
    where id = v_id;
  end if;
end;
$$;

comment on function public.record_submission_failure(text, text, text, text) is
  'Einen verlorenen Vorfall zaehlen: je Stufe und Grund eine Zeile, mit Anzahl und letztem Zeitpunkt.';

revoke all on function public.record_submission_failure(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_submission_failure(text, text, text, text) to service_role;


-- ---------------------------------------------------------------------------
-- 2. Was bis zum Abbruch eingetragen war
-- ---------------------------------------------------------------------------

-- Bewusst nicht alles. Was hier steht, beschreibt eine *Reparatur* - Geraet,
-- Dauer, Wert, Text, Kreis -, also dieselben Angaben, die bei einer
-- gelungenen Einreichung ohnehin in `repairs` landen und fuer die
-- Veroeffentlichung gedacht waren.
--
-- Was hier nicht steht, fehlt mit Absicht:
--
-- - Name und Mail-Adresse der Verlosung. Ohne gueltige Einreichung gibt es
--   keine Teilnahme, die sie tragen wuerde; wir haetten also eine
--   Adressliste ohne Zweck. `wants_lottery` haelt fest, dass jemand
--   teilnehmen wollte - mehr braucht die Nacherfassung nicht.
-- - Das Foto. Es ist der teuerste Teil der Einreichung und der einzige, der
--   ungefragt Gesichter enthalten kann. `has_image` sagt, dass eines dabei
--   war, damit beim Nachfassen klar ist, dass es fehlt.
-- - Die IP-Adresse. Wie ueberall sonst nur die grobe Gegend ("DE-NW").
--
-- Und ebenfalls mit Absicht *nicht* befuellt wird diese Tabelle bei einer
-- Absage von ausserhalb des Gebiets: Das ist keine Stoerung, sondern eine
-- Entscheidung. `blocked_submissions` zaehlt diese Faelle seit 202608280002
-- ohne Inhalte, und dabei bleibt es.
create table if not exists public.abandoned_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  -- Alle Versuche desselben Sendevorgangs ergeben eine Zeile, nicht fuenf.
  -- Derselbe Schluessel wie repairs.client_key (siehe 202608310001).
  client_key text unique,
  attempts integer not null default 1,
  stage text not null,
  reason text not null,
  detail text,
  ip_region text,
  -- Der Kreis aus der Herkunftspruefung, also dieselbe Genauigkeit wie bei
  -- einer angenommenen Reparatur. Keine Koordinate.
  kreis text,
  origin_source text,
  category text,
  brand_model text,
  duration_minutes integer,
  item_value_euros numeric(10, 2),
  performed_by text,
  story text,
  has_image boolean not null default false,
  wants_lottery boolean not null default false
);

comment on table public.abandoned_submissions is
  'Einreichungen, die unterwegs verlorengingen, mit den bis dahin eingetragenen Angaben. Ohne Foto, ohne Name und Mail, ohne IP-Adresse.';

create index if not exists abandoned_submissions_last_at_idx
  on public.abandoned_submissions (last_at desc);

alter table public.abandoned_submissions enable row level security;
-- Wie bei submission_failures: keine Policy, keine Grants. Gelesen wird
-- ausschliesslich ueber /api/admin/status hinter der Admin-Anmeldung, und das
-- laeuft mit dem Service-Role-Schluessel.
revoke all on public.abandoned_submissions from anon, authenticated;

/* Ein Sendevorgang, eine Zeile. Der Browser haelt seinen `client_key` ueber
   alle Wiederholungsversuche fest - ohne diesen Abgleich wuerde ein Mensch,
   der dreimal auf Absenden drueckt, dreimal in der Liste stehen und die
   Nacherfassung dreimal dieselbe Reparatur eintragen. */
create or replace function public.record_abandoned_submission(
  p_client_key text,
  p_stage text,
  p_reason text,
  p_detail text,
  p_ip_region text,
  p_kreis text,
  p_origin_source text,
  p_category text,
  p_brand_model text,
  p_duration_minutes integer,
  p_item_value_euros numeric,
  p_performed_by text,
  p_story text,
  p_has_image boolean,
  p_wants_lottery boolean
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- Aufraeumen, solange es billig ist - wie in public.submission_gate. Eine
  -- abgebrochene Einreichung ist nach einem Monat nicht mehr nachzuerfassen:
  -- Der Rekordversuch ist dann gezaehlt, und die Angaben haetten keinen
  -- Zweck mehr, der ihr Aufheben rechtfertigt.
  delete from public.abandoned_submissions
  where last_at < now() - interval '30 days';

  insert into public.abandoned_submissions as a (
    client_key, stage, reason, detail, ip_region, kreis, origin_source,
    category, brand_model, duration_minutes, item_value_euros, performed_by,
    story, has_image, wants_lottery
  ) values (
    p_client_key, p_stage, p_reason, p_detail, p_ip_region, p_kreis, p_origin_source,
    p_category, p_brand_model, p_duration_minutes, p_item_value_euros, p_performed_by,
    p_story, p_has_image, p_wants_lottery
  )
  on conflict (client_key) do update
    set
      attempts = a.attempts + 1,
      last_at = now(),
      -- Der letzte Versuch beschreibt den Stand am besten: Wer zwischendurch
      -- noch etwas ergaenzt hat, soll das Ergaenzte wiederfinden.
      stage = excluded.stage,
      reason = excluded.reason,
      detail = excluded.detail,
      kreis = coalesce(excluded.kreis, a.kreis),
      origin_source = coalesce(excluded.origin_source, a.origin_source),
      category = coalesce(excluded.category, a.category),
      brand_model = coalesce(excluded.brand_model, a.brand_model),
      duration_minutes = coalesce(excluded.duration_minutes, a.duration_minutes),
      item_value_euros = coalesce(excluded.item_value_euros, a.item_value_euros),
      performed_by = coalesce(excluded.performed_by, a.performed_by),
      story = coalesce(excluded.story, a.story),
      has_image = excluded.has_image or a.has_image,
      wants_lottery = excluded.wants_lottery or a.wants_lottery;
end;
$$;

comment on function public.record_abandoned_submission(text, text, text, text, text, text, text, text, text, integer, numeric, text, text, boolean, boolean) is
  'Eine verlorene Einreichung mit ihren Angaben aufheben. Mehrere Versuche desselben Sendevorgangs ergeben eine Zeile.';

revoke all on function public.record_abandoned_submission(text, text, text, text, text, text, text, text, text, integer, numeric, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.record_abandoned_submission(text, text, text, text, text, text, text, text, text, integer, numeric, text, text, boolean, boolean) to service_role;
