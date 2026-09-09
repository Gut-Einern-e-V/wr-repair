import { ImageResponse } from "next/og";
import { circularWeek } from "@/lib/organisation";

/**
 * Vorschaubild fuer geteilte Links (Issue #67).
 *
 * Vorher hatte die Seite keins: In Messengern und sozialen Netzwerken stand
 * der Link damit als graue Zeile ohne Bild. Die Karte wird beim Build einmal
 * gerendert und danach statisch ausgeliefert.
 *
 * Bewusst gezeichnet statt fotografiert: Ein Foto aus public/photos waere
 * schneller eingebunden, traegt aber weder Titel noch Aufruf - und genau die
 * beiden Zeilen sind das, was in der Vorschau gelesen wird. Die Farben und die
 * Aufkleber-Optik kommen aus dem Styleguide (siehe app/globals.css).
 */

export const alt = "Reparaturrekord NRW – Gemeinsam zum Reparatur-Weltrekord";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#101626";
const BG = "#efece5";
const MINT = "#95d4bb";
const YELLOW = "#ffc432";

/* ImageResponse kennt keine Standardschrift mit Umlauten in Wunschqualitaet,
   aber Satzbau und Zeichen hier sind einfach genug fuer die eingebaute. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BG, padding: "56px 64px", border: `12px solid ${INK}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Gelb und leicht gedreht wie im Kopf der Website; rot war die
              Marke in einer alten Fassung des Stylesheets. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 84, height: 84, background: YELLOW, color: INK, fontSize: 50, fontWeight: 900, transform: "rotate(-2deg)" }}>R</div>
          <div style={{ display: "flex", flexDirection: "column", color: INK, fontSize: 26, letterSpacing: 2, textTransform: "uppercase", lineHeight: 1.15 }}>
            <span>Reparaturrekord</span>
            <span>NRW</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
          {/* Ink auf Mint, wie `.sticker-head .sticker` im Stylesheet. Hier
              stand roter Text - aus derselben alten Fassung wie die rote
              Wortmarke darueber. Rot ist im Projekt fuer Fehler und
              Ablehnungen reserviert und traegt laut Styleguide keinen
              Fliesstext (design.md, Abschnitt 4). */}
          {["Gemeinsam zum", "Reparatur-", "Weltrekord"].map((line) => (
            <div key={line} style={{ display: "flex", background: MINT, color: INK, padding: "6px 18px", fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{line}</div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: INK, fontSize: 28 }}>
          <span style={{ maxWidth: 760 }}>Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein.</span>
          <span style={{ fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>{circularWeek.name}</span>
        </div>
      </div>
    ),
    size,
  );
}
