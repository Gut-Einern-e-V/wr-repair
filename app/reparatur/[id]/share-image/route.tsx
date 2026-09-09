import { ImageResponse } from "next/og";
import { categoryPictogramSvg } from "@/components/category-pictogram";
import { getPublicRepairStatus } from "@/lib/repair-status";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { getSiteUrl } from "@/lib/share";
import { parseShareVisualFormat, shareVisualFormats, type ShareVisualFormat } from "@/lib/share-visual";

export const runtime = "nodejs";

/**
 * Das Teilbild einer freigegebenen Reparatur (Issue #100).
 *
 * Wer eine Reparatur eingereicht hat und freigegeben bekommt, soll sie zeigen
 * koennen - und zwar mit dem eigenen Foto darin, nicht mit einer allgemeinen
 * Kampagnengrafik. Diese Route zeichnet genau das, in den beiden Formaten, die
 * die sozialen Netzwerke brauchen (siehe lib/share-visual.ts).
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
const paper = "#f7f5f0";
const yellow = "#ffc432";
const mint = "#95d4bb";
const red = "#ec424c";

/**
 * Masse je Format. Das Bildfeld hat feste Pixelwerte statt `flex: 1`: Satori
 * braucht fuer ein `<img>` mit `objectFit: cover` bekannte Kanten, sonst
 * verzerrt es das Foto. Der Rest verteilt sich ueber `space-between`.
 */
const layouts: Record<ShareVisualFormat, {
  padding: number;
  markSize: number;
  brandSize: number;
  photoHeight: number;
  /**
   * Eine Zeile je Aufkleber, wie in den `.sticker-head`-Ueberschriften der
   * Website: Ein Aufkleber umschliesst seinen Text und laeuft nie ueber zwei
   * Zeilen - sonst wird aus dem Aufkleber ein Farbblock. Der Umbruch steht
   * deshalb hier und wird nicht dem Textfluss ueberlassen.
   */
  headline: string[];
  headlineSize: number;
  categorySize: number;
  footerSize: number;
}> = {
  square: {
    padding: 56,
    markSize: 64,
    brandSize: 28,
    photoHeight: 580,
    headline: ["Repariert statt weggeworfen"],
    headlineSize: 58,
    categorySize: 44,
    footerSize: 27,
  },
  story: {
    padding: 64,
    markSize: 84,
    brandSize: 36,
    photoHeight: 1180,
    headline: ["Repariert statt", "weggeworfen"],
    headlineSize: 76,
    categorySize: 56,
    footerSize: 34,
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
  const categoryLabel = repairCategoryLabel(repair.category);
  const photo = repair.imageUrl ? await loadPhoto(repair.imageUrl) : null;
  const photoWidth = size.width - layout.padding * 2;
  const domain = readableSiteUrl(request);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: layout.padding,
          background: bg,
          color: ink,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: layout.brandSize, fontWeight: 700, letterSpacing: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: layout.markSize, height: layout.markSize, background: red, color: paper, fontSize: layout.markSize * 0.68 }}>R</div>
          REPARATURREKORD NRW
        </div>

        {/* Das Foto, randabfallend im Rahmen. Ohne Foto steht das Zeichen der
            Kategorie auf Mint: eine Flaeche in Markenfarbe ist ein besseres
            Bild als ein leerer Kasten. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: photoWidth, height: layout.photoHeight, border: `5px solid ${ink}`, background: photo ? ink : mint, overflow: "hidden" }}>
          {photo
            // eslint-disable-next-line @next/next/no-img-element -- Satori kennt nur <img>; next/image gibt es in einer ImageResponse nicht.
            ? <img src={photo} width={photoWidth} height={layout.photoHeight} style={{ objectFit: "cover" }} alt="" />
            // eslint-disable-next-line @next/next/no-img-element -- dito.
            : <img src={pictogramDataUri(repair.category)} width={Math.round(layout.photoHeight * 0.42)} height={Math.round(layout.photoHeight * 0.42)} alt="" />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {layout.headline.map((line) => (
            <div key={line} style={{ display: "flex" }}>
              <div style={{ padding: "8px 22px", background: mint, fontSize: layout.headlineSize, fontWeight: 800 }}>{line}</div>
            </div>
          ))}
          <div style={{ display: "flex" }}>
            <div style={{ padding: "8px 22px", background: yellow, fontSize: layout.categorySize, fontWeight: 800 }}>{categoryLabel}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: layout.footerSize, fontWeight: 600 }}>
            <div style={{ display: "flex" }}>Ich war beim Reparaturrekord in NRW dabei.</div>
            {domain && <div style={{ display: "flex", color: red, fontWeight: 800 }}>Mach mit: {domain}</div>}
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
