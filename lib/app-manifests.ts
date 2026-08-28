import type { MetadataRoute } from "next";

/* Die Seite ist dreimal installierbar (Issue #43).
 *
 * Das Wurzelmanifest in app/manifest.ts ist die Hauptseite. Daneben gibt es zwei
 * eigene Apps: die Schnelleintragung und die Moderation. Warum getrennt statt
 * als Shortcut:
 *
 * - Die Shortcut-Liste eines Manifests wird an jeden ausgeliefert. Moderation
 *   gehoert dort nicht hinein, sonst wuesste jede besuchende Person davon.
 * - Ein eigenes Manifest bedeutet ein eigenes Icon und einen eigenen Namen im
 *   Launcher, statt dreimal derselben Verknuepfung.
 * - Auf iOS ist Push nur in einer installierten App moeglich. Ohne eigenes
 *   Manifest fuer /moderator gaebe es dort keine Benachrichtigungen.
 *
 * Chrome unterscheidet die drei Installationen an der `id`. Die Scopes
 * ueberlappen sich nicht, weil jede App bei ihrer Route bleibt.
 */

// Gleiche Werte wie im Wurzelmanifest und in der Viewport-Angabe von layout.tsx.
const BACKGROUND = "#efece5"; // --bg
const INK = "#101626"; // --ink

/* Beide Purposes je App: `any` fuellt die Flaeche randlos, `maskable` haelt das
   Motiv in der Safe Zone, damit die adaptive Maske der Android-Launcher nichts
   abschneidet. Genau das fehlte vorher und war der Ausgangspunkt von Issue #43. */
function icons(slug: string): MetadataRoute.Manifest["icons"] {
  return [
    { src: `/icons/${slug}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `/icons/${slug}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: `/icons/${slug}-maskable-192.png`,
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: `/icons/${slug}-maskable-512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}

/* Scope bewusst auf die eigene Route begrenzt: Die App bleibt bei ihrer
   Aufgabe. Preis dafuer ist, dass Links nach draussen den App-Rahmen verlassen -
   auf /mitmachen etwa die Fusszeile und die Bestaetigungsseite unter
   /reparatur/<id>, auf /moderator der Weg ueber /login nach einer abgelaufenen
   Sitzung. Auf Android oeffnet das eine Leiste mit Adresszeile im selben
   Fenster, auf dem Desktop einen Browsertab. */
export const eintragenManifest: MetadataRoute.Manifest = {
  id: "/mitmachen",
  name: "Reparatur eintragen",
  short_name: "Eintragen",
  description: "Foto und Angaben zu einer Reparatur direkt eintragen.",
  lang: "de",
  dir: "ltr",
  start_url: "/mitmachen",
  scope: "/mitmachen",
  display: "standalone",
  background_color: BACKGROUND,
  theme_color: BACKGROUND,
  icons: icons("eintragen-icon"),
};

export const moderatorManifest: MetadataRoute.Manifest = {
  id: "/moderator",
  name: "Reparaturrekord Moderation",
  short_name: "Moderation",
  description: "Eingereichte Reparaturen prüfen.",
  lang: "de",
  dir: "ltr",
  start_url: "/moderator",
  scope: "/moderator",
  display: "standalone",
  background_color: INK,
  // Die Konsole ist dunkel; eine helle Statusleiste darueber saehe falsch aus.
  theme_color: INK,
  icons: icons("moderator-icon"),
};

// Content-Type ist vorgeschrieben; ohne ihn ignorieren Browser das Manifest.
export function manifestResponse(manifest: MetadataRoute.Manifest) {
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
