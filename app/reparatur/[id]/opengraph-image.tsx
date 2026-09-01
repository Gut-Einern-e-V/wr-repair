import { ImageResponse } from "next/og";
import { categoryPictogramSvg } from "@/components/category-pictogram";
import { getPublicRepairStatus } from "@/lib/repair-status";
import { repairCategoryLabel } from "@/lib/repair-catalog";

export const alt = "Reparaturrekord NRW";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = { params: Promise<{ id: string }> };

/**
 * Teilbild im Projekt-CI. Details einer Einreichung erscheinen erst nach der
 * Freigabe; vorher wird nur das allgemeine Kampagnenmotiv ausgeliefert.
 *
 * Freigegebene Reparaturen bekommen zusaetzlich das Zeichen ihrer Kategorie
 * neben den Namen. Das Foto der Einreichung taugt dafuer nicht: Es liegt in
 * einem privaten Speicher hinter einer ablaufenden Adresse. Das Zeichen ist
 * fuer jede Reparatur derselben Kategorie dasselbe und gibt damit nichts
 * preis.
 *
 * Bewusst das Strichzeichen und nicht das gerenderte Motiv aus
 * public/categories/: Die Karte ist eine flache Markengrafik, ein
 * fotorealistisches Motiv darin waere ein Stilbruch - und eine Datei aus
 * public/ braeuchte hier den Umweg ueber das Dateisystem der
 * Serverless-Funktion.
 */

/** Satori rendert kein JSX-SVG, nimmt aber ein Bild mit `data:`-Adresse. */
function pictogramDataUri(category: string) {
  return `data:image/svg+xml;base64,${Buffer.from(categoryPictogramSvg(category, "#101626", 240)).toString("base64")}`;
}
export default async function RepairShareImage({ params }: ImageProps) {
  const repair = await getPublicRepairStatus((await params).id);
  const isApproved = repair?.status === "approved";
  const headline = isApproved ? repairCategoryLabel(repair.category) : "Reparatur";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#efece5",
          color: "#101626",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, background: "#ec424c", color: "#f7f5f0", fontSize: 44 }}>R</div>
          REPARATURREKORD NRW
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex" }}>
            <div style={{ padding: "8px 22px", background: "#95d4bb", fontSize: 76, fontWeight: 800 }}>
              {isApproved ? "Repariert statt weggeworfen" : "Gemeinsam zum Reparatur-Weltrekord"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {isApproved && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 132, height: 132, background: "#f7f5f0", border: "5px solid #101626" }}>
                {/* Satori kennt nur <img>; next/image gibt es in einer ImageResponse nicht. */}
                <img src={pictogramDataUri(repair.category)} width={84} height={84} alt="" />
              </div>
            )}
            <div style={{ display: "flex", padding: "8px 22px", background: "#ffc432", fontSize: 56, fontWeight: 800 }}>{headline}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>Mach mit und trage deine Reparatur ein.</div>
      </div>
    ),
    {
      ...size,
      headers: {
        /* Eine freigegebene Reparatur wechselt ihre Kategorie nicht mehr, die
           Karte darf also lange liegen bleiben. Vor der Freigabe kurz, damit
           die richtige Karte nachrueckt, sobald sie freigegeben ist. */
        "Cache-Control": isApproved
          ? "public, s-maxage=86400, stale-while-revalidate=604800"
          : "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
