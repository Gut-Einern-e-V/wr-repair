import Link from "next/link";
import NextImage from "next/image";
import { getPartners } from "@/lib/partners";

/* Die Unterstuetzenden in jedem Footer, klein unter der Foerderleiste.

   Die Logos sind einzeln nicht verlinkt: Vierzehn und mehr Links in jedem
   Footer waeren ebenso viele Tab-Stopps. Die Leiste fuehrt als Ganzes zur
   Dankeseite, dort geht es zu den einzelnen Websites.

   Die Kacheln sind weiss, weil nicht jedes hochgeladene Logo transparent ist.

   Hochgeladen werden bis zu 1 MB je Logo. Der Bildoptimierer liefert sie hier
   in Kachelbreite aus; SVGs bringen ihm nichts und gehen unveraendert durch. */
export async function PartnerStrip() {
  const partners = await getPartners();
  if (!partners.length) return null;

  return <section className="partner-strip" aria-labelledby="partner-strip-title">
    <div className="partner-strip-head">
      <h2 id="partner-strip-title">Mit Unterstützung von</h2>
      <Link href="/supporters">Alle Unterstützenden <span aria-hidden="true">&#8594;</span></Link>
    </div>
    <ul>
      {partners.map((partner) => <li key={partner.id} title={partner.name}>
        <span><NextImage
          src={partner.logoUrl}
          alt={partner.name}
          fill
          sizes="120px"
          loading="lazy"
          unoptimized={partner.logoUrl.toLowerCase().endsWith(".svg")}
        /></span>
      </li>)}
    </ul>
  </section>;
}
