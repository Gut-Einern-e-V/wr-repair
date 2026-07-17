# Eigene Reparaturkampagne aufsetzen

Diese Anwendung ist als Vorlage gedacht, nicht als vorkonfigurierter Produktionsdienst. Eine Kopie braucht ein eigenes Supabase-Projekt, eigene Zugangsdaten, eine eigene Friendly-Captcha-Anwendung und rechtlich geprüfte Inhalte.

## 1. Projekt kopieren und Inhalte ersetzen

1. Repository forken oder klonen und einen eigenen GitHub-Remote einrichten.
2. Organisation, Kampagnenname, Termine, Zielwert, Kontaktadresse, Partner, Förderhinweise und alle Rechtstexte ersetzen.
3. Die offenen Punkte in `docs/data-protection-concept.md` sowie `to-do.md` vor dem Launch rechtlich und organisatorisch abschließen.

## 2. Eigenes Supabase-Projekt

1. Ein neues Supabase-Projekt erstellen und dessen Project URL, Publishable Key und Service Role Key beschaffen.
2. `.env.example` nach `.env.local` kopieren und die lokalen Werte eintragen. `.env.local` bleibt lokal und wird nicht committed.
3. Die Migrationen auf das eigene Projekt anwenden:

```powershell
npx supabase@latest db push
npx supabase@latest migration list
```

4. Den privaten Bucket `repair-images` beibehalten. Öffentliche Bilder werden ausschließlich über signierte URLs ausgeliefert.
5. Die erste Superadmin-Rolle entsprechend `docs/supabase-admin-bootstrap.md` setzen. Service-Role-Schlüssel gehören nie in Browsercode oder Hardware.

## 3. Friendly Captcha v2 vollständig aktivieren

Das Frontend verwendet bereits die offizielle programmatische v2-SDK-Variante. Der öffentliche Sitekey `FCMNM3R7JRA5C82C` ist im Beispiel eingetragen, erlaubt aber ohne Serverprüfung keine echten Einreichungen.

1. In Friendly Captcha die lokale Entwicklungsdomain sowie die Vercel-Preview- und Produktionsdomain für diese Anwendung freigeben.
2. Den Sitekey als `NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY` konfigurieren.
3. Einen API-Key erstellen und ausschließlich als geheime Variable `FRIENDLY_CAPTCHA_API_KEY` in `.env.local` und Vercel hinterlegen.
4. Eine Testeinreichung ausführen. Der Server prüft das Widget-Ergebnis gegen Friendly Captchas Siteverify-Endpoint; bei fehlendem API-Key oder nicht freigegebener Domain wird die Einreichung absichtlich abgelehnt.

Der API-Key darf weder in Git, noch im Browser, noch in einem ESP32, Arduino oder Raspberry Pi stehen.

## 4. Vercel bereitstellen

1. Das eigene Repository in Vercel importieren.
2. Alle Variablen aus `.env.example` unter **Settings > Environment Variables** setzen. Die vollständige Tabelle steht in `docs/vercel-deployment.md`.
3. Nach dem ersten Deployment `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, Supabase-Redirect-URLs und die Friendly-Captcha-Domains auf die tatsächliche Produktionsdomain aktualisieren.
4. Teilnahmebeginn und -ende im Superadmin-Bereich festlegen. Ohne aktives Zeitfenster bleiben Einreichungen und öffentliche Statistik bewusst gesperrt.

## 5. Vor dem Öffnen prüfen

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Zusätzlich manuell prüfen: Captcha-Validierung, NRW-Geo-Prüfung auf Vercel, Moderationsrollen, Bilder-Löschung bei Ablehnung, Rechtstexte, Backup- und Wiederherstellungsplan sowie WAF-/plattformweite Rate Limits.