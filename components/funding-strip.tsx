import NextImage from "next/image";
import { FundingAbbinder } from "@/components/funding-abbinder";

/* Foerderleiste im Footer. Der Abbinder steckt in
   components/funding-abbinder.tsx - dort steht auch, warum er als ein Bild
   eingebunden ist und nicht mehr als vier Einzellogos (Issue #97).

   Das Logo der Zuwendungsempfangenden darf daneben stehen, aber nur kleiner
   als das EU-Emblem im Abbinder. Beide Breiten stehen deshalb im Stylesheet
   als Rasteranteile statt als Pixelhoehen - so haelt das Verhaeltnis in jeder
   Fenstergroesse. */
export function FundingStrip() {
  return <section className="funding-strip" aria-label="Förderhinweis">
    <p>
      Das Projekt &bdquo;FAB.Region Bergisches Städtedreieck &ndash; Transformation hin zu einer co-kreativen
      Kreislaufwirtschaftsregion&ldquo; wird aus Mitteln des Europäischen Fonds für regionale Entwicklung (EFRE)
      und des Landes Nordrhein-Westfalen gefördert.
    </p>
    <div className="funding-logos">
      <a className="funding-logo is-fab" href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">
        <NextImage src="/funding/fab-region-dark.png" alt="FAB Region Bergisches Städtedreieck" width={1355} height={381} sizes="180px" />
      </a>
      <a className="funding-logo is-abbinder" href="https://www.efre.nrw/" target="_blank" rel="noreferrer">
        <FundingAbbinder />
      </a>
    </div>
  </section>;
}
