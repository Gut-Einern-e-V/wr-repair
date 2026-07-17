# Teststrategie

Stand: 17. Juli 2026

## Automatisiert

`npm test` prueft die datenbankfreien Sicherheitsregeln mit Vitest:

- Einreichungszeitfenster: fehlende, ungueltige und umgedrehte Konfiguration bleibt geschlossen; valide Konfiguration liefert `before`, `open` und `after`.
- NRW-Check: nur die Kombination `DE` und `NW` wird akzeptiert; der lokale Override funktioniert ausschliesslich in `development`.
- Rate Limit: Versuche werden pro Namespace und erster Forwarded-IP begrenzt und nach Ablauf des Fensters wieder freigegeben.

`npm run lint`, `npx tsc --noEmit` und `npm run build` bleiben verpflichtende Checks vor einem Deployment.

## Vor dem Launch manuell pruefen

- Einreichung im produktionsnahen Vercel-Preview: Zeitfenster, Friendly Captcha, NRW-Header, erlaubte Dateitypen, 200-KiB-Grenze und EXIF-freies Bild pruefen.
- Moderator*innen: Rollen `moderator`, `admin` und `superadmin`, Freigabe/Ablehnung, Bildloeschung sowie CSV-Export mit Testkonten pruefen.
- Ansichten bei 360 px, 768 px und 1280 px: Navigation, Formulardialog, Partnerlogos, Fokusreihenfolge und horizontalen Ueberlauf pruefen.
- Barrierefreiheit: vollstaendige Tastaturbedienung, Screenreader-Meldungen im Formular, Kontrast und Reduced Motion pruefen.
- Wiederherstellungsuebung: Supabase-Backup, Bildbucket und Rollenverwaltung nach dokumentiertem Prozess wiederherstellen.

## Nicht in Tests abbilden

Echte Friendly-Captcha-Pruefungen, Vercel-Geodaten und Supabase-Service-Role-Zugriffe verwenden Produktionsgeheimnisse beziehungsweise Plattformdaten. Sie werden in einer geschuetzten Preview mit eigens angelegten Testdaten geprueft und duerfen nicht in lokale Unit-Tests gelangen.