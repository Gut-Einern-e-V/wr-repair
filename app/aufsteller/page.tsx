import { headers } from "next/headers";
import { Noto_Sans_Arabic } from "next/font/google";
import { getSiteUrl } from "@/lib/share";
import { buildQrGlyph } from "@/lib/qr-glyph";
import { PosterStudio } from "./poster-studio";

/* Nunito deckt kein Arabisch ab - ohne eigene Schrift faellt die arabische
   Fassung auf eine beliebige Systemschrift zurueck und passt nicht zum Rest.
   `preload: false`, weil die Schrift nur auf dieser einen Seite gebraucht wird. */
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  preload: false,
  variable: "--font-arabic",
});

export const metadata = {
  title: "Aufsteller mit QR-Code",
  description: "Druckvorlage mit QR-Code, der direkt zur Schnell-Eintragung führt.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PosterPage() {
  /* Ohne Rueckfallebene stand auf dem gedruckten Aufsteller `localhost:3000`,
     sobald `NEXT_PUBLIC_SITE_URL` fehlte (Issue #92). Der Host aus der Anfrage
     ist immer die Domain, unter der jemand den Generator gerade aufruft. */
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const submissionUrl = `${getSiteUrl(host ? `${protocol}://${host}` : "") || "http://localhost:3000"}/mitmachen`;

  return <PosterStudio
    submissionUrl={submissionUrl}
    qrGlyph={buildQrGlyph(submissionUrl)}
    arabicFontClassName={notoSansArabic.variable}
  />;
}
