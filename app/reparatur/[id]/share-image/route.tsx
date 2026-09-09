import { ImageResponse } from "next/og";
import { categoryPictogramSvg } from "@/components/category-pictogram";
import { getPublicRepairStatus } from "@/lib/repair-status";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { getSiteUrl } from "@/lib/share";
import {
  parseShareVisualFormat,
  shareVisualFormats,
  shareVisualHeadlineSize,
  shareVisualLook,
  type ShareVisualFormat,
} from "@/lib/share-visual";

export const runtime = "nodejs";

/**
 * Das Teilbild einer freigegebenen Reparatur (Issue #100).
 *
 * Wer eine Reparatur eingereicht hat und freigegeben bekommt, soll sie zeigen
 * koennen - und zwar mit dem eigenen Foto darin, nicht mit einer allgemeinen
 * Kampagnengrafik. Diese Route zeichnet genau das, in den beiden Formaten, die
 * die sozialen Netzwerke brauchen (siehe lib/share-visual.ts).
 *
 * Gebaut wie eine gedruckte Karte, mit denselben Mitteln wie der
 * Aufsteller-Generator: Papierrand aussen, Karte in einer der vier
 * Grundfarben darin, feines Papierraster darueber, Aufkleber mit leichter
 * Drehung, und das Kategorie-Label als gelber Aufkleber ueber der unteren
 * linken Ecke des Fotos (Styleguide 7.1 und 7.2). Welche Grundfarbe und
 * welchen Spruch eine Karte traegt, entscheidet die Kennung der Einreichung:
 * Jede Reparatur bekommt ihr eigenes Bild, und jedes Bild bleibt sich selbst
 * gleich (siehe {@link shareVisualLook}).
 *
 * Abgegrenzt vom Vorschaubild eine Ebene hoeher
 * (app/reparatur/[id]/opengraph-image.tsx): Das erscheint, wenn *irgendwer* den
 * Link teilt, und zeigt deshalb bewusst nur das Zeichen der Kategorie. Hier
 * laedt die einreichende Person ihr eigenes Bild herunter; das Foto ist genau
 * das, was sie zeigen will.
 *
 * Vor der Freigabe gibt es das Bild nicht. Sonst waere es ein Weg, eine
 * ungepruefte Einreichung samt Foto als fertige Grafik aus dem privaten
 * Speicher zu holen.
 */

/** Farben aus dem Styleguide; hier als Literale, weil Satori keine CSS-Variablen kennt. */
const ink = "#101626";
const bg = "#efece5";
const yellow = "#ffc432";
const mint = "#95d4bb";

/**
 * Dasselbe feine Papierraster wie auf der Website und auf dem Aufsteller
 * (Designprinzip 9: keine glatte Vollfarbe auf grossen Flaechen). Die Periode
 * ist doppelt so grob wie im CSS - das Bild ist 1080 Pixel breit und wird in
 * einer Zeitleiste auf ungefaehr die Haelfte gerechnet.
 */
const paperGrain = "repeating-linear-gradient(0deg, transparent 0 6px, rgba(16, 22, 38, .04) 6px 8px)";

/**
 * Masse je Format. Die Hoehe des Bildfeldes steht bewusst *nicht* hier: Sie
 * ergibt sich aus dem, was Kopfzeile und Aufkleber uebriglassen (siehe
 * `photoHeight` unten). Ein fester Wert liess bei einzeiligen Spruechen eine
 * grosse Luecke stehen, weil `space-between` den Rest verteilt - so bekommt
 * stattdessen das Foto den Platz.
 */
const layouts: Record<ShareVisualFormat, {
  /** Breite des Papierrands um die Karte - das Passepartout. */
  frame: number;
  padding: number;
  markSize: number;
  brandSize: number;
  headlineSize: number;
  categorySize: number;
  footerSize: number;
}> = {
  square: {
    frame: 26,
    padding: 44,
    markSize: 60,
    brandSize: 26,
    headlineSize: 56,
    categorySize: 32,
    footerSize: 25,
  },
  story: {
    frame: 32,
    padding: 56,
    markSize: 80,
    brandSize: 34,
    headlineSize: 74,
    categorySize: 42,
    footerSize: 31,
  },
};

/**
 * Das Foto als `data:`-Adresse.
 *
 * Es liegt in einem privaten Bucket hinter einer signierten, ablaufenden
 * Adresse. Satori die selbst holen zu lassen waere ein zweiter Weg mit eigenen
 * Fehlerquellen - hier kommen die Bytes im selben Aufruf herein, in dem die
 * Adresse entstanden ist. Bei 200 KB Obergrenze je Einreichung ist das
 * unkritisch.
 *
 * Schlaegt es fehl, ist das kein Fehler der Anfrage: Das Bild entsteht dann
 * eben mit dem Zeichen der Kategorie statt mit dem Foto.
 */
async function loadPhoto(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Satori rendert kein JSX-SVG, nimmt aber ein Bild mit `data:`-Adresse. */
function pictogramDataUri(category: string) {
  return `data:image/svg+xml;base64,${Buffer.from(categoryPictogramSvg(category, ink, 320)).toString("base64")}`;
}

/**
 * Die Adresse, die unten auf dem Bild steht.
 *
 * Wie beim Aufsteller-Generator (app/aufsteller/page.tsx) mit dem Host der
 * Anfrage als Rueckfallebene: Ohne ihn stuende auf einem geteilten Bild
 * `localhost:3000`.
 */
function readableSiteUrl(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const configured = getSiteUrl(host ? `${protocol}://${host}` : "");
  return configured.replace(/^https?:\/\//, "");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const repair = await getPublicRepairStatus(id);

  if (!repair || repair.status !== "approved") {
    return new Response("Für diese Reparatur gibt es noch kein Teilbild.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const format = parseShareVisualFormat(new URL(request.url).searchParams.get("format"));
  const size = shareVisualFormats[format];
  const layout = layouts[format];
  const look = shareVisualLook(repair.id);
  const { groundSpec } = look;
  const categoryLabel = repairCategoryLabel(repair.category);
  const photo = repair.imageUrl ? await loadPhoto(repair.imageUrl) : null;
  const cardWidth = size.width - layout.frame * 2;
  const photoWidth = cardWidth - layout.padding * 2 - 8;
  const headlineSize = shareVisualHeadlineSize(look.claim, layout.headlineSize, photoWidth - 44);
  const domain = readableSiteUrl(request);

  /* Wie hoch das Foto sein darf: alles, was Kopfzeile, Aufkleber und
     Fusszeilen uebriglassen. Die drei Kastenhoehen sind gerechnet und nicht
     gemessen - Satori misst erst beim Zeichnen. Sie sind deshalb eine Spur
     groszuegig geschaetzt, und `space-between` faengt die letzten Pixel
     Abweichung auf, statt das Bild ueberlaufen zu lassen. */
  const gap = Math.round(layout.padding * 0.6);
  const stickerBox = Math.round(headlineSize * 1.25) + 14;
  const footerBox = 10 + Math.round(layout.footerSize * 1.35) * 2;
  const claimBox = look.claim.length * stickerBox + (look.claim.length - 1) * 10 + footerBox;
  const innerHeight = size.height - layout.frame * 2 - 8 - layout.padding * 2;
  const photoHeight = Math.max(240, innerHeight - layout.markSize - claimBox - gap * 2);

  return new ImageResponse(
    (
      /* Aussen der Papierrand: Er macht aus dem Bild eine gestaltete Karte und
         nicht einen randabfallenden Screenshot - in einer Zeitleiste ist genau
         das der Unterschied. */
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: layout.frame,
          background: bg,
          backgroundImage: paperGrain,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: layout.padding,
            border: `4px solid ${ink}`,
            background: groundSpec.ground,
            backgroundImage: paperGrain,
            color: groundSpec.text,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: layout.brandSize, fontWeight: 700, letterSpacing: 2 }}>
            {/* Gelb, gesetztes R, leicht gedreht - genau die Wortmarke aus
                dem Kopf der Website. Rot war sie zuletzt in einer alten
                Fassung des Stylesheets; im Projekt ist Rot fuer Fehler und
                Ablehnungen reserviert (design.md, Abschnitt 4). */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: layout.markSize, height: layout.markSize, background: groundSpec.mark, color: groundSpec.markText, fontSize: layout.markSize * 0.6, fontWeight: 900, transform: "rotate(-2deg)" }}>R</div>
            REPARATURREKORD NRW
          </div>

          {/* Das Foto, randabfallend im Rahmen, mit dem Kategorie-Aufkleber
              ueber der unteren linken Ecke (Styleguide 7.2). Ohne Foto steht
              das Zeichen der Kategorie auf Mint: eine Flaeche in Markenfarbe
              ist ein besseres Bild als ein leerer Kasten. */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: photoWidth, height: photoHeight, border: `4px solid ${ink}`, background: photo ? ink : mint, overflow: "hidden" }}>
            {photo
              // eslint-disable-next-line @next/next/no-img-element -- Satori kennt nur <img>; next/image gibt es in einer ImageResponse nicht.
              ? <img src={photo} width={photoWidth} height={photoHeight} style={{ objectFit: "cover" }} alt="" />
              // eslint-disable-next-line @next/next/no-img-element -- dito.
              : <img src={pictogramDataUri(repair.category)} width={Math.round(photoHeight * 0.4)} height={Math.round(photoHeight * 0.4)} alt="" />}
            <div
              style={{
                position: "absolute",
                left: 24,
                bottom: 24,
                display: "flex",
                padding: "5px 18px 8px",
                border: `4px solid ${ink}`,
                background: yellow,
                color: ink,
                fontSize: layout.categorySize,
                fontWeight: 800,
                transform: "rotate(-1.2deg)",
              }}
            >
              {categoryLabel}
            </div>
          </div>

          {/* Die Aufkleber-Ueberschrift: eine Zeile je Aufkleber, leicht
              gedreht, jede zweite eingerueckt - dasselbe Bauteil wie die
              `.sticker-head`-Ueberschriften der Website. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            {look.claim.map((line, index) => (
              <div key={line} style={{ display: "flex", marginLeft: index % 2 === 1 ? Math.round(headlineSize * 0.4) : 0 }}>
                <div
                  style={{
                    display: "flex",
                    padding: "4px 22px 10px",
                    background: groundSpec.sticker,
                    color: groundSpec.stickerText,
                    fontSize: headlineSize,
                    fontWeight: 800,
                    transform: `rotate(${look.rotations[index]}deg)`,
                  }}
                >
                  {line}
                </div>
              </div>
            ))}
            {/* `nowrap`, weil `footerBox` weiter oben mit genau zwei Zeilen
                rechnet: Ein Umbruch waere dort nicht eingeplant und wuerde das
                Foto ueber die Karte hinausschieben.

                Und "Reparaturrekord" steht am Zeilenende, weil Satori hinter
                dem laengsten Wort einer Zeile zusaetzlichen Vorschub setzt -
                mitten im Satz sah das aus wie ein doppeltes Leerzeichen, am
                Zeilenende faellt es niemandem auf. */}
            <div style={{ display: "flex", flexDirection: "column", marginTop: 10, fontSize: layout.footerSize, fontWeight: 600, whiteSpace: "nowrap" }}>
              <div style={{ display: "flex" }}>Ich war dabei beim Reparaturrekord.</div>
              {domain && <div style={{ display: "flex", fontWeight: 800, color: groundSpec.muted }}>Mach mit: {domain}</div>}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      headers: {
        /* Kuerzer als beim Vorschaubild, und der Grund ist das Foto: Es kann
           jederzeit auf Wunsch geloescht werden (Issue #49). Ein Teilbild, das
           danach noch einen Tag lang aus dem Zwischenspeicher kommt, wuerde
           genau diese Zusage aushebeln. Ohne Foto aendert sich nichts mehr an
           dem Bild, dann darf es lange liegen bleiben. */
        "Cache-Control": photo
          ? "public, s-maxage=300, stale-while-revalidate=600"
          : "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
