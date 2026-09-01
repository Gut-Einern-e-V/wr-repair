import Link from "next/link";
import QRCode from "qrcode";
import { getSiteUrl } from "@/lib/share";

export const metadata = {
  title: "Aufsteller mit QR-Code",
  description: "Druckvorlage mit QR-Code, der direkt zur Schnell-Eintragung führt.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PosterPage() {
  const submissionUrl = `${getSiteUrl() || "http://localhost:3000"}/mitmachen`;
  const qrDataUrl = await QRCode.toDataURL(submissionUrl, {
    width: 1200,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#101626", light: "#95d4bb" },
  });
  const readableUrl = submissionUrl.replace(/^https?:\/\//, "");

  return <main className="poster-page">
    <p className="poster-hint no-print">
      Druckvorlage für einen Aufsteller (A4, Hochformat). Über die Druckfunktion des Browsers ausgeben – der QR-Code führt direkt zur
      Schnell-Eintragung. <Link className="text-button" href="/mitmachen">Seite ansehen <span aria-hidden="true">&#8594;</span></Link>
    </p>
    <article className="poster-sheet">
      <p className="brand-kicker">Reparaturrekord NRW</p>
      <h1 className="sticker-head is-mint"><span className="sticker">Repariert?</span><span className="sticker">Jetzt eintragen!</span></h1>
      <p className="poster-lead">Scanne den Code mit der Kamera deines Smartphones und trage deine Reparatur in zwei Minuten ein.</p>
      {/* Ein Data-URL-Bild wird zur Laufzeit erzeugt und kann den Next.js-Optimizer nicht nutzen. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="poster-qr" src={qrDataUrl} alt={`QR-Code zu ${readableUrl}`} />
      <p className="poster-url">{readableUrl}</p>
      <ol className="poster-steps">
        <li><span>01</span>Foto der Reparatur aufnehmen</li>
        <li><span>02</span>Kategorie wählen und kurz beschreiben</li>
        <li><span>03</span>Nach der Prüfung zählt deine Reparatur</li>
      </ol>
      <p className="poster-footer">Ein Projekt der FAB Region Bergisches Städtedreieck</p>
    </article>
  </main>;
}
