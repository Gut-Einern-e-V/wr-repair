import { getPartners } from "@/lib/partners";

/* Holt die Liste auf dem Server aus demselben Cache wie die Footer-Leiste
   (components/partner-strip.tsx) - vorher per fetch im Browser nachgeladen,
   mit den Voreinstellungen als kurz sichtbarem Zwischenstand. */
export async function PartnerLogoGrid() {
  const partners = await getPartners();

  return <div className="supporter-grid">{partners.map((partner) => <a className="supporter-card" href={partner.websiteUrl} target="_blank" rel="noreferrer" key={partner.id} aria-label={`${partner.name} öffnen`} title={partner.name}>
    {/* Partner assets originate from local public files or the public partner-logos bucket. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={partner.logoUrl} alt="" />
    <span className="supporter-name">{partner.name}</span>
  </a>)}</div>;
}
