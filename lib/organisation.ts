/**
 * Wer den Reparaturrekord betreibt und wie man ihn erreicht (Issue #78).
 *
 * Vorher stand die Kontaktadresse an neun Stellen einzeln im Quelltext. Der
 * Wechsel von Gut Einern zum CSCP hat gezeigt, warum das eine schlechte Idee
 * ist: Eine haendisch verteilte Adresse wird beim naechsten Wechsel irgendwo
 * vergessen, und dann steht auf einer Rechtsseite ein toter Briefkasten.
 *
 * Quelle der Pflichtangaben ist das Impressum unter https://www.cscp.org/imprint/.
 * Sie sind hier abgeschrieben und nicht abgeleitet - wer sie aendert, sollte
 * dort nachsehen und nicht raten.
 */

/**
 * Kontaktadresse fuer alles, was mit dem Reparaturrekord selbst zu tun hat:
 * Rueckfragen zu Einreichungen, Loeschwuensche, Barrieren, das Festival, das
 * Gewinnspiel und die Rechtsseiten.
 */
export const CONTACT_EMAIL = "reparatur@cscp.org";

/**
 * Adresse fuer die Schnittstellen und den offenen Quelltext.
 *
 * Bewusst nicht dieselbe: Wer eine LED-Matrix an die API haengt oder eine
 * IP-Freigabe braucht, will die Leute erreichen, die die Anwendung
 * programmiert haben und betreuen - nicht die Projektkoordination.
 */
export const DEVELOPER_EMAIL = "mail@gut-einern.org";

/**
 * `mailto:`-Ziel mit optionalem Betreff.
 *
 * Der Betreff wird kodiert: Ein Kaufmanns-Und im Betreff wuerde sonst als
 * Trenner der naechsten Angabe gelesen und den Rest verschlucken.
 */
export function mailto(email: string, subject?: string) {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}

/** Betreiber im Rechtssinn - die Angaben aus der Anbieterkennzeichnung. */
export const operator = {
  legalName: "Collaborating Centre on Sustainable Consumption and Production gGmbH",
  shortName: "CSCP",
  street: "Hagenauer Str. 30",
  postalCode: "42107",
  city: "Wuppertal",
  representedBy: "Michael Kuhndt",
  registerCourt: "Amtsgericht Wuppertal",
  registerNumber: "HRB 20060",
  vatId: "DE250910282",
  phone: "+49 202 459 58 10",
  website: "https://www.cscp.org/",
} as const;

/** Anschrift in einer Zeile, fuer Fliesstext und die Teilnahmebedingungen. */
export const operatorAddressLine = `${operator.street}, ${operator.postalCode} ${operator.city}`;

/** Die Aktionswoche, in deren Rahmen der Rekordversuch stattfindet. */
export const circularWeek = {
  name: "Circular Week 2026",
  url: "https://www.circularweek.com/",
  /** Die Projektseite des CSCP - dort steht der Rekordversuch im Programm. */
  hostUrl: "https://www.cscp.org/our-work/circular-week-2026/",
} as const;

/**
 * Veranstalter des Gewinnspiels, wenn im Backend nichts hinterlegt ist
 * (Issue #78).
 *
 * Bis dahin stand auf der Seite, der Veranstalter stehe noch nicht fest - das
 * war richtig, solange er es nicht tat. Jetzt steht er fest, und in
 * Teilnahmebedingungen gehoert der volle Firmenname: Wer sich auf sie berufen
 * will, muss wissen, gegen wen.
 */
export const defaultLotteryOrganizer = {
  name: `${operator.legalName} (${operator.shortName})`,
  address: operatorAddressLine,
  email: CONTACT_EMAIL,
} as const;

export type ProjectCredit = {
  /** Kurzes Rollenwort, steht als Auszeichnung ueber dem Namen. */
  role: string;
  name: string;
  /** Kurzform fuer Verweise - der volle Name sprengt dort die Spalte. */
  shortName: string;
  /** Ein Satz, der die Rolle erklaert. */
  description: string;
  url: string;
  /** Logo aus public/partners/; null, wo keines vorliegt. */
  logoUrl: string | null;
};

/**
 * Wer welchen Teil verantwortet (Issue #78).
 *
 * Drei Rollen, die im Alltag gern zusammenfallen und es hier nicht tun: Das
 * CSCP richtet den Rekordversuch als Teil der Circular Week aus, die FAB
 * Region hat die Website beigesteuert und wird dafuer gefoerdert, Gut Einern
 * hat sie gebaut. Die Reihenfolge ist die der Verantwortung, nicht die der
 * Arbeitsmenge.
 */
export const projectCredits: ProjectCredit[] = [
  {
    role: "Initiative",
    name: "CSCP",
    shortName: "CSCP",
    description: `Der Reparaturrekord ist eine Initiative der ${circularWeek.name}, organisiert vom CSCP.`,
    url: operator.website,
    logoUrl: "/partners/cscp.png",
  },
  {
    role: "Website",
    name: "FAB Region Bergisches Städtedreieck",
    shortName: "FAB Region",
    description: "Die Website ist im Partnerprojekt FAB Region Bergisches Städtedreieck entstanden, gefördert aus EFRE-Mitteln und vom Land Nordrhein-Westfalen.",
    url: "https://www.fab-bergisch.org/",
    logoUrl: "/funding/fab-region-dark.png",
  },
  {
    role: "Programmierung",
    name: "Gut Einern e.V.",
    shortName: "Gut Einern",
    description: "Programmiert wurde sie von Gut Einern e.V. in Wuppertal – der Quelltext ist offen.",
    url: "https://www.gut-einern.org/",
    logoUrl: "/partners/gut-einern.png",
  },
];
