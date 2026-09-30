import { circularWeek, operator } from "@/lib/organisation";

/**
 * Foerderung und Traegerschaft des Reparaturrekords, gesetzt nach der Vorlage
 * des CSCP: links "Gefördert von" mit dem Umweltministerium NRW, rechts "Eine
 * Initiative von" mit CSCP und Circular Week.
 *
 * Eine Quelle fuer Footer (components/funding-strip.tsx), /supporters und die
 * Aufsteller (app/aufsteller/poster-studio.tsx). Vorher standen dort FAB
 * Region und EFRE-Abbinder - der Rekord steht aber unter dem Dach der
 * Circular Week 2026, nicht mehr unter dem der FAB Region.
 *
 * Das Ministeriumslogo ist die offizielle Vektorfassung aus
 * public/funding/nrw.svg mit schwarzer statt weisser Schrift. Die gelieferte
 * JPG-Fassung hatte ein falsches Gruen (#31FD20 statt #00A650).
 */

export type FundingLogo = {
  /** Klasse fuer die Hoehe - die Seitenverhaeltnisse liegen weit auseinander. */
  className: string;
  href: string;
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type FundingGroup = {
  key: "funded-by" | "initiative-by";
  label: string;
  logos: FundingLogo[];
};

export const ministry = {
  name: "Ministerium für Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen",
  url: "https://www.umwelt.nrw.de/",
} as const;

export const fundingGroups: FundingGroup[] = [
  {
    key: "funded-by",
    label: "Gefördert von",
    logos: [
      { className: "is-ministry", href: ministry.url, src: "/funding/mulnv-nrw.svg", width: 2205, height: 454, alt: ministry.name },
    ],
  },
  {
    key: "initiative-by",
    label: "Eine Initiative von",
    logos: [
      { className: "is-cscp", href: operator.website, src: "/funding/cscp.svg", width: 307, height: 170, alt: operator.legalName },
      { className: "is-circular-week", href: circularWeek.url, src: "/funding/circular-week-2026.webp", width: 1000, height: 735, alt: circularWeek.name },
    ],
  },
];
