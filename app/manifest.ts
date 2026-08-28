import type { MetadataRoute } from "next";

/* Ohne Manifest legt Chrome auf Android beim "Zum Startbildschirm hinzufuegen"
   nur eine Verknuepfung an und nimmt dafuer das Favicon. Das Icon laeuft dann
   durch die adaptive Maske des Launchers - ein Kreis mit 80% Durchmesser - und
   wird beschnitten (Issue #43). Deshalb liegen hier ausdrueckliche Icons:
   `purpose: "any"` fuellt die Flaeche randlos, `purpose: "maskable"` haelt das R
   zusaetzlich innerhalb der Safe Zone, damit die Maske nichts abschneidet. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Reparaturrekord NRW",
    short_name: "Reparaturrekord",
    description: "Gemeinsam reparieren wir den Weltrekord.",
    lang: "de",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Beide Werte auf --bg, damit Splashscreen und Statusleiste zum
    // Seitenhintergrund passen und kein dunkler Rahmen aufblitzt.
    background_color: "#efece5",
    theme_color: "#efece5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    /* Android zeigt diese Eintraege beim langen Druck auf das App-Icon. Von dort
       laesst sich jeder einzelne auf den Startbildschirm ziehen - so bekommt man
       die Eintragung als eigenes Icon, ohne die App zu oeffnen. Der Launcher
       zeigt hoechstens vier davon, deshalb stehen sie nach Wichtigkeit.

       Nur oeffentliche Seiten: die Liste steht in jedem Manifest und waere fuer
       alle sichtbar. Moderation und Admin gehoeren hier nicht hinein.

       Jeder Shortcut hat ein eigenes Icon. Ohne das nimmt Android das App-Icon,
       und alle angepinnten Verknuepfungen sehen gleich aus. */
    shortcuts: [
      {
        name: "Reparatur eintragen",
        short_name: "Eintragen",
        description: "Foto und Angaben zu einer Reparatur direkt eintragen.",
        url: "/mitmachen",
        icons: [{ src: "/icons/shortcut-eintragen-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Live-Stand",
        short_name: "Live-Stand",
        description: "Aktueller Zaehlerstand des Rekordversuchs.",
        url: "/stats",
        icons: [{ src: "/icons/shortcut-stand-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Repair Cafe finden",
        short_name: "Repair Cafe",
        description: "Termine und Orte der Reparatur-Initiativen in NRW.",
        url: "/repair-cafes",
        icons: [{ src: "/icons/shortcut-cafe-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
