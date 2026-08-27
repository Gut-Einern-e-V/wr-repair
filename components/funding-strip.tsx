import NextImage from "next/image";

/* Offizieller Foerderabbinder der FAB Region (app/assets/logos/fab_region_abbinder_v6.png).
   Die Logos liegen als dunkle Variante vor und brauchen deshalb eine helle Flaeche:
   die frueher genutzten SVGs in public/funding/ sind Negativversionen mit weisser
   Schrift und waren auf dem weissen Kasten unlesbar. */
const fundingLogos = [
  { src: "/funding/fab-region-dark.png", width: 1355, height: 381, className: "is-fab", href: "https://www.fab-bergisch.org/", alt: "FAB Region Bergisches Städtedreieck" },
  { src: "/funding/eu-dark.png", width: 1405, height: 293, className: "is-eu", href: null, alt: "Kofinanziert von der Europäischen Union" },
  { src: "/funding/nrw-dark.png", width: 1359, height: 294, className: "is-nrw", href: null, alt: "Ministerium für Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen" },
  { src: "/funding/efre-dark.png", width: 724, height: 98, className: "is-efre", href: "https://www.efre.nrw/", alt: "www.efre.nrw" },
];

export function FundingStrip() {
  return <section className="funding-strip" aria-label="Förderhinweis">
    <p>
      Das Projekt &bdquo;FAB.Region Bergisches Städtedreieck &ndash; Transformation hin zu einer co-kreativen
      Kreislaufwirtschaftsregion&ldquo; wird aus Mitteln des Europäischen Fonds für regionale Entwicklung (EFRE)
      und des Landes Nordrhein-Westfalen gefördert.
    </p>
    <div className="funding-logos">
      {fundingLogos.map((logo) => {
        const image = <NextImage className={logo.className} src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} sizes="(max-width: 720px) 170px, 230px" />;
        return logo.href
          ? <a key={logo.src} href={logo.href} target="_blank" rel="noreferrer">{image}</a>
          : <span key={logo.src}>{image}</span>;
      })}
    </div>
  </section>;
}
