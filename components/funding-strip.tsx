import NextImage from "next/image";
import { circularWeek, operator } from "@/lib/organisation";

/* Foerderleiste im Footer. Der Reparaturrekord steht unter dem Dach der
   Circular Week 2026 - nicht mehr unter dem der FAB Region. Deshalb stehen
   hier Umweltministerium NRW, CSCP und Circular Week statt FAB-Wortmarke und
   EFRE-Abbinder (components/funding-abbinder.tsx bleibt fuer /supporters und
   die Aufsteller, dort geht es um die Entstehung der Website).

   Gesetzt nach der Vorlage des CSCP: zwei Gruppen mit kleiner Ueberschrift,
   links "Gefördert von" mit dem Ministerium, rechts "Eine Initiative von" mit
   CSCP und Circular Week.

   Das Ministeriumslogo ist die offizielle Vektorfassung aus
   public/funding/nrw.svg mit schwarzer statt weisser Schrift. Die gelieferte
   JPG-Fassung hatte ein falsches Gruen (#31FD20 statt #00A650). */
const groups = [
  {
    label: "Gefördert von",
    logos: [
      { className: "is-ministry", href: "https://www.umwelt.nrw.de/", src: "/funding/mulnv-nrw.svg", width: 2205, height: 454, alt: "Ministerium für Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen" },
    ],
  },
  {
    label: "Eine Initiative von",
    logos: [
      { className: "is-cscp", href: operator.website, src: "/funding/cscp.svg", width: 307, height: 170, alt: operator.legalName },
      { className: "is-circular-week", href: circularWeek.url, src: "/funding/circular-week-2026.webp", width: 1000, height: 735, alt: circularWeek.name },
    ],
  },
];

export function FundingStrip() {
  return <section className="funding-strip" aria-label="Förderhinweis">
    <div className="funding-logos">
      {groups.map((group) => <div key={group.label} className="funding-group">
        <p>{group.label}</p>
        <div className="funding-group-logos">
          {group.logos.map((logo) => <a key={logo.src} className={`funding-logo ${logo.className}`} href={logo.href} target="_blank" rel="noreferrer">
            <NextImage src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} sizes="360px" />
          </a>)}
        </div>
      </div>)}
    </div>
  </section>;
}
