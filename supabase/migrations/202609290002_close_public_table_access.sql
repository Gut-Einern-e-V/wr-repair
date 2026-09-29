-- Datenschutz-Audit (Issue #44): Tabellen nicht mehr direkt aus dem Web lesbar.
--
-- Der oeffentliche Schluessel steht in jedem Seitenbundle. Wozu `anon` und
-- `authenticated` Rechte haben, ist also ueber /rest/v1 fuer jede Person
-- abfragbar, an allen Routen der Anwendung vorbei. Das Audit fand zwei
-- Tabellen, die dabei mehr herausgaben als gedacht:
--
-- - `repairs`: Die Spaltenrechte aus 202608260003 gaben jede damals
--   vorhandene Spalte frei ausser der Herkunft. Bei freigegebenen Reparaturen
--   waren damit `moderator_comment`, `moderated_by` (die Nutzer-ID der
--   moderierenden Person), `tags` sowie die ungenutzten `entry_ip` und `exif`
--   oeffentlich - entgegen dem Datenschutzkonzept.
-- - `campaign_settings`: vollstaendig lesbar, samt `rate_limit_allowlist` mit
--   den IP-Adressen der Anzeigegeraete und `updated_by`.
--
-- Die Anwendung braucht keinen dieser Zugriffe: Jede Route, die diese
-- Tabellen liest oder schreibt, nutzt den Service-Role-Key, der RLS und
-- Grants umgeht. Die Sitzung angemeldeter Personen fragt nur `user_roles` ab
-- (lib/admin-auth.ts). Deshalb hier nicht spaltenweise nachbessern, sondern
-- die Tabellen fuer beide API-Rollen ganz schliessen - dann oeffnet auch eine
-- kuenftige Spalte nichts mehr.
--
-- Dasselbe fuer die Gewinnspiel-Tabellen. `lottery_entries` (Namen und
-- Mail-Adressen) und `lottery_exclusions` waren bisher allein durch RLS
-- geschuetzt; die Default-Grants standen noch. Eine einzige zu weit gefasste
-- Policy haette die Namensliste freigegeben. `lottery_prizes` war komplett
-- lesbar, auch noch nicht angekuendigte Preise und die Sponsorenangaben, die
-- /gewinnspiel bewusst ausblendet.
--
-- Die Policies fuer Moderation und Verwaltung bleiben stehen. Ohne Grant
-- greifen sie nicht mehr; sie schaden aber nicht, und wer spaeter einen
-- Browserzugriff einfuehrt, muss den Grant ohnehin bewusst setzen.

drop policy if exists "Anyone can read approved repairs" on public.repairs;
drop policy if exists "Public reads campaign settings" on public.campaign_settings;
drop policy if exists "Public reads lottery prizes" on public.lottery_prizes;

-- Spaltenrechte aus 202608260003 haengen nicht am table-weiten Recht und
-- muessen eigens entzogen werden.
do $$
declare
  all_columns text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into all_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'repairs';

  execute format('revoke all (%s) on public.repairs from anon, authenticated', all_columns);
end;
$$;

revoke all on public.repairs from anon, authenticated;
revoke all on public.campaign_settings from anon, authenticated;
revoke all on public.lottery_entries from anon, authenticated;
revoke all on public.lottery_exclusions from anon, authenticated;
revoke all on public.lottery_prizes from anon, authenticated;
