import { ImageResponse } from "next/og";
import { getPublicRepairStatus } from "@/lib/repair-status";
import { repairCategoryLabel } from "@/lib/repair-catalog";

export const alt = "Reparaturrekord NRW";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = { params: Promise<{ id: string }> };

/**
 * Teilbild im Projekt-CI. Details einer Einreichung erscheinen erst nach der
 * Freigabe; vorher wird nur das allgemeine Kampagnenmotiv ausgeliefert.
 */
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
          <div style={{ display: "flex" }}>
            <div style={{ padding: "8px 22px", background: "#ffc432", fontSize: 56, fontWeight: 800 }}>{headline}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>Mach mit und trage deine Reparatur ein.</div>
      </div>
    ),
    size,
  );
}
