/* Service Worker ausschliesslich fuer Push in der Moderation (Issue #43).
 *
 * Absichtlich ohne `fetch`-Handler: Sobald ein Service Worker Requests
 * abfaengt, entscheidet er ueber Caching und kann Seiten veralten lassen. Dieser
 * hier beruehrt kein einziges Laden - er reagiert nur auf Push-Nachrichten.
 *
 * Registriert wird er nur von der Moderationskonsole, nie von einer
 * oeffentlichen Seite. Wer die Seite bloss besucht, laedt diese Datei nicht.
 */

// Sofort uebernehmen statt auf das Schliessen aller Tabs zu warten - sonst
// laeuft nach einem Deploy noch die alte Fassung.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const TARGET = "/moderator";

self.addEventListener("push", (event) => {
  /* Der Server schickt JSON. Faellt das Parsen aus, wird trotzdem etwas
     angezeigt: Eine stumme Push-Nachricht darf der Browser als Missbrauch
     werten und die Berechtigung entziehen. */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const count = Number(payload.count) || 1;
  const body = count > 1
    ? `${count} Einreichungen warten auf Prüfung.`
    : "Eine Einreichung wartet auf Prüfung.";

  event.waitUntil(
    self.registration.showNotification(payload.title || "Neue Eintragung", {
      body,
      icon: "/icons/moderator-icon-192.png",
      badge: "/icons/moderator-icon-maskable-192.png",
      lang: "de",
      /* Gleicher tag fuer alle: Eine neue Nachricht ersetzt die vorherige statt
         sich daraufzustapeln. Im Rekordmonat waeren das sonst zwanzig
         Benachrichtigungen fuer zwanzig Einreichungen. `renotify` sorgt dafuer,
         dass das Ersetzen trotzdem bemerkt wird. */
      tag: "neue-eintragung",
      renotify: true,
      data: { url: payload.url || TARGET },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || TARGET;

  /* Ein bereits offenes Moderationsfenster wird nach vorn geholt, statt ein
     zweites zu oeffnen - zwei Konsolen auf demselben Geraet wuerden sich um
     dieselbe Einreichung streiten (siehe claim_next_repair). */
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).pathname.startsWith(TARGET)) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

/* Push-Dienste erneuern Abos gelegentlich von sich aus. Ohne diesen Handler
   waere das Abo danach still tot. Das neue wird an denselben Endpunkt gemeldet,
   den die Konsole benutzt; der Server ersetzt die Zeile ueber den Endpoint. */
self.addEventListener("pushsubscriptionchange", (event) => {
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
  if (!applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((subscription) =>
        fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        }),
      )
      .catch(() => {
        // Beim naechsten Oeffnen der Konsole wird das Abo ohnehin erneuert.
      }),
  );
});
