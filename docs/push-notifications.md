# Benachrichtigungen für die Moderation

Wer moderiert, sitzt nicht dauerhaft vor der Warteschlange. Diese Funktion
schickt eine Push-Benachrichtigung an die Geräte der Moderationskonten, wenn eine
neue Reparatur eingetragen wurde (Issue #43).

## Wichtigste Eigenschaft: niemand sonst wird gefragt

Die Browserabfrage nach der Benachrichtigungserlaubnis erscheint nur, wenn Code
`Notification.requestPermission()` aufruft. Dieser Aufruf steht an genau einer
Stelle im Projekt: in `app/moderator/push-toggle.tsx`, hinter einem Klick auf den
Umschalter in der Moderationskonsole.

Öffentliche Seiten rufen ihn nicht auf und registrieren auch den Service Worker
nicht. Wer die Seite bloß besucht, lädt `public/sw.js` nie und kann die Abfrage
nicht zu sehen bekommen. Das ist keine Frage der Wahrscheinlichkeit, sondern der
Struktur — nachprüfbar mit:

    grep -rn "requestPermission\|serviceWorker.register" app components lib

## Einrichtung

### 1. VAPID-Schlüssel erzeugen

Die Schlüssel weisen diesen Server gegenüber den Push-Diensten aus. Einmalig:

    npx web-push generate-vapid-keys

### 2. Drei Variablen setzen

In Vercel für Production und Preview, lokal in `.env.local`:

| Variable | Wert |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | der öffentliche Schlüssel, geht in den Browser |
| `VAPID_PRIVATE_KEY` | der private Schlüssel, **nur** Server, nie committen |
| `VAPID_SUBJECT` | Kontaktadresse, `mailto:…` oder `https://…` |

Fehlt einer der drei Werte, bleibt die Funktion vollständig aus: Der Umschalter
zeigt einen Hinweis statt eines toten Buttons, und Einreichungen laufen
unverändert weiter. `lib/push.test.ts` sichert genau das ab.

### 3. Migration ausrollen

    npx supabase@latest db push

Legt `public.push_subscriptions` an
(`supabase/migrations/202608280001_push_subscriptions.sql`).

### 4. Einschalten

Als Moderation `/moderator` öffnen, auf **Bei neuen Eintragungen
benachrichtigen** tippen, Abfrage bestätigen. Pro Gerät einmal — Rechner und
Handy sind getrennte Abos.

## Auf dem iPhone nur als installierte App

iOS liefert Web Push ausschließlich in einer zum Home-Bildschirm hinzugefügten
App (ab iOS 16.4). In einem normalen Safari-Tab gibt es die Funktion nicht, und
der Umschalter sagt das auch.

Deshalb hat `/moderator` ein eigenes Manifest (`lib/app-manifests.ts`): Über
*Teilen → Zum Home-Bildschirm* entsteht eine eigene Moderations-App mit eigenem
Icon, und darin funktionieren Benachrichtigungen. Auf Android und am Rechner
genügt ein normaler Tab.

## Was übertragen wird

Nur, dass etwas wartet, und wie viele es sind:

    { "title": "Neue Eintragung", "count": 3, "url": "/moderator" }

Keine Bilder, keine Beschreibungen, keine Kategorien. Der Transport ist
Ende-zu-Ende verschlüsselt, aber Einreichungsinhalte haben bei einem Drittdienst
ohnehin nichts zu suchen. Vermerkt in `app/privacy/page.tsx`.

## Wie gebündelt wird

Jede Einreichung löst einen Versand aus, aber alle Nachrichten teilen im Service
Worker denselben `tag` und ersetzen sich gegenseitig. Mitgeschickt wird die Zahl
der **offenen** Einreichungen, nicht diese eine.

Im Rekordmonat heißt das: zwanzig Einreichungen ergeben eine sichtbare
Benachrichtigung, die auf zwanzig hochzählt — kein Stapel, und trotzdem sieht man
die Menge.

## Ablauf im Code

| Schritt | Ort |
| --- | --- |
| Umschalter, Erlaubnis, Abo im Browser | `app/moderator/push-toggle.tsx` |
| Abo speichern und löschen | `app/api/notifications/subscribe/route.ts` |
| Versand und Aufräumen toter Abos | `lib/push.ts` |
| Auslöser bei neuer Einreichung | `app/api/repairs/route.ts` (in `after()`) |
| Anzeigen und Klickziel | `public/sw.js` |

Der Versand hängt in `after()` aus `next/server` und läuft damit **nach** der
Antwort an die eintragende Person. Niemand wartet auf drei Push-Dienste, und eine
Einreichung scheitert nicht, weil einer davon streikt.

Abgelaufene Abos (HTTP 404/410 vom Push-Dienst) löscht `lib/push.ts` selbst —
sonst sammelt die Tabelle tote Endpunkte. Erneuert ein Push-Dienst ein Abo von
sich aus, meldet der `pushsubscriptionchange`-Handler in `public/sw.js` das neue
an; ohne ihn wäre das Gerät danach still abgemeldet.

## Der Service Worker cacht nichts

`public/sw.js` hat bewusst **keinen** `fetch`-Handler. Ein Service Worker, der
Requests abfängt, entscheidet über Caching und kann Seiten veralten lassen.
Dieser reagiert nur auf `push`, `notificationclick` und
`pushsubscriptionchange` — er berührt kein einziges Laden.
