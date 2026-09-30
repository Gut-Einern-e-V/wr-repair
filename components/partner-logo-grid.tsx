import NextImage from "next/image";
import { getPartners } from "@/lib/partners";

/* Holt die Liste auf dem Server aus demselben Cache wie die Footer-Leiste
   (components/partner-strip.tsx) - vorher per fetch im Browser nachgeladen,
   mit den Voreinstellungen als kurz sichtbarem Zwischenstand.

   Die Logos liefen hier bis Ende September als rohes `<img>` in voller
   Upload-Groesse: fuenfzehn Dateien, zusammen rund 1,7 MB, eine davon allein
   600 KB - fuer Kacheln von 180 Pixeln Breite. Jetzt gehen sie wie im Footer
   durch den Bildoptimierer, der sie in Kachelbreite als WebP/AVIF ausliefert
   und am CDN zwischenspeichert. SVGs bringen ihm nichts und gehen unveraendert
   durch. */
export async function PartnerLogoGrid() {
  const partners = await getPartners();

  return <div className="supporter-grid">{partners.map((partner) => <a className="supporter-card" href={partner.websiteUrl} target="_blank" rel="noreferrer" key={partner.id} aria-label={`${partner.name} öffnen`} title={partner.name}>
    <span className="supporter-card-logo"><NextImage
      src={partner.logoUrl}
      alt=""
      fill
      sizes="180px"
      unoptimized={partner.logoUrl.toLowerCase().endsWith(".svg")}
    /></span>
    <span className="supporter-name">{partner.name}</span>
  </a>)}</div>;
}
