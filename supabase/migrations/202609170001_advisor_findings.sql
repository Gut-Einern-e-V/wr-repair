-- Die Befunde des Supabase-Advisors abraeumen (Issue #109).
--
-- Drei Gruppen von Warnungen, und allen dreien liegt dasselbe zugrunde:
-- Supabase vergibt in `public` per Default-Privileg automatisch Rechte an
-- `anon` und `authenticated`. Ein `revoke ... from public` trifft nur die
-- Pseudo-Rolle PUBLIC und laesst diese beiden Grants stehen - deshalb hingen
-- Funktionen, die nur der Service-Role-Key rufen soll, trotzdem als
-- /rest/v1/rpc-Endpunkt im Netz. `public.system_usage()` hat es von Anfang an
-- richtig gemacht (siehe 202608270001) und taucht im Report folgerichtig nicht
-- auf; hier ziehen die uebrigen nach.
--
-- Nicht behandelt, weil es kein Fehler ist: `blocked_submissions`,
-- `submission_failures` und `submission_throttle` melden "RLS enabled, no
-- policy". Genau so sind sie gemeint - Rechte entzogen, RLS an, keine Policy,
-- also kommt ausser dem Service-Role-Key niemand heran. Eine Policy dazu
-- zu erfinden wuerde die Tabellen oeffnen, nicht schuetzen.


-- 1. Oeffentliche Buckets brauchen keine Lese-Policy
--
-- Ein oeffentlicher Bucket liefert seine Objekte ueber
-- /storage/v1/object/public/<bucket>/<pfad> aus, ganz ohne RLS. Die
-- SELECT-Policy war also nie noetig, um ein Logo anzuzeigen - sie erlaubte
-- zusaetzlich das *Auflisten* des Buckets. Damit konnte jeder alle
-- Partnerlogos, Gewinnfotos und Seitenbilder aufzaehlen, auch die, die gerade
-- nirgends eingebunden sind (etwa ein noch nicht angekuendigter Preis).
-- Die Anzeige aendert sich nicht: Alle Bilder kommen ueber `getPublicUrl()`,
-- und jeder schreibende Zugriff laeuft ohnehin ueber den Service-Role-Key.
drop policy if exists "Public reads partner logos" on storage.objects;
drop policy if exists "Public reads prize logos" on storage.objects;
drop policy if exists "Public reads prize photos" on storage.objects;
drop policy if exists "Public reads site assets" on storage.objects;


-- 2. Die Rollenpruefer raus aus dem API-Schema
--
-- `is_moderator_or_higher()`, `is_admin_or_higher()` und `is_superadmin()`
-- werden ausschliesslich in RLS-Policies gerufen, nie von der Anwendung. Sie
-- duerfen aber *nicht* einfach den Rechten nach gesperrt werden: Der
-- USING-Ausdruck einer Policy laeuft mit den Rechten der abfragenden Rolle,
-- nicht mit denen der Tabelle. Ein `revoke execute ... from authenticated`
-- wuerde also jede Policy, die sie ruft, in "permission denied for function"
-- kippen lassen.
--
-- Der richtige Hebel ist deshalb die Erreichbarkeit, nicht das Recht: Das
-- Schema `private` steht nicht in der PostgREST-Konfiguration, damit gibt es
-- keinen /rest/v1/rpc-Endpunkt mehr. Die bestehenden Policies zeigen per OID
-- auf die Funktionen und laufen unveraendert weiter.
--
-- Achtung fuer spaetere Migrationen: Diese drei Funktionen heissen ab hier
-- `private.is_...()`, nicht mehr `public.is_...()`.
create schema if not exists private;

comment on schema private is
  'Hilfsfunktionen, die nur RLS-Policies rufen. Bewusst ausserhalb der PostgREST-API, damit daraus kein /rest/v1/rpc-Endpunkt wird.';

revoke all on schema private from public;

do $$
declare
  fn text;
  grantee text;
begin
  foreach fn in array array['is_moderator_or_higher', 'is_admin_or_higher', 'is_superadmin'] loop
    if to_regprocedure(format('public.%I()', fn)) is not null then
      execute format('alter function public.%I() set schema private', fn);
    end if;

    if to_regprocedure(format('private.%I()', fn)) is null then
      raise exception 'Funktion %.% fehlt - die Migration passt nicht zu dieser Datenbank.', 'private', fn;
    end if;

    execute format('revoke all on function private.%I() from public', fn);
  end loop;

  /* Jede Rolle, unter der eine Policy ausgewertet werden kann, behaelt genau
     die Rechte von vorher. `service_role` umgeht RLS zwar, steht hier aber
     mit, damit ein spaeterer direkter Aufruf nicht ueberraschend scheitert. */
  foreach grantee in array array['authenticated', 'service_role', 'supabase_storage_admin'] loop
    if exists (select 1 from pg_roles where rolname = grantee) then
      execute format('grant usage on schema private to %I', grantee);

      foreach fn in array array['is_moderator_or_higher', 'is_admin_or_higher', 'is_superadmin'] loop
        execute format('grant execute on function private.%I() to %I', fn, grantee);
      end loop;
    end if;
  end loop;
end
$$;


-- 3. Die Aggregatfunktionen gehoeren dem Service-Role-Key allein
--
-- `dashboard_stats()`, `dashboard_today()` und `public_stats()` ruft nur der
-- Server (app/api/dashboard/route.ts und app/api/stats/route.ts, beide ueber
-- `createSupabaseAdminClient()`). Sie bleiben in `public`, weil sie als RPC
-- erreichbar sein muessen - aber eben nur fuer den Service-Role-Key. Ohne
-- diesen Entzug haette jeder mit dem oeffentlichen Schluessel die
-- Rohaggregate abfragen koennen, unter Umgehung der Fenster- und
-- Ratenbegrenzung, die die Routen davorlegen.
revoke all on function public.dashboard_stats() from public, anon, authenticated;
revoke all on function public.dashboard_today() from public, anon, authenticated;
revoke all on function public.public_stats(date, date) from public, anon, authenticated;

grant execute on function public.dashboard_stats() to service_role;
grant execute on function public.dashboard_today() to service_role;
grant execute on function public.public_stats(date, date) to service_role;
