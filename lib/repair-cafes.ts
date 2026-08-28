/* Wir fuehren keine eigene Termindatenbank. Beide Verzeichnisse pflegen ihre
   Termine selbst, deshalb verlinken wir tief hinein statt Daten zu kopieren -
   so steht auf der Seite nie ein veralteter Termin.
   Die Parameter sind am 27.08.2026 auf reparatur-initiativen.de geprueft:
   `provinceId=10` ist Nordrhein-Westfalen, `keyword` durchsucht Initiativen,
   Postleitzahlen und Orte. */
/** Terminsuche des Netzwerks. Exportiert, weil auch die Absage fuer
   Einreichungen von ausserhalb dorthin verweist (lib/outside-region-help.ts). */
export const NETWORK_EVENTS = "https://www.reparatur-initiativen.de/termine";

/** Weltkarte der Repair-Café-Bewegung, fuer alles ausserhalb Deutschlands. */
export const WORLD_MAP = "https://www.repaircafe.org/de/besuchen/";

export const repairCafeDirectories = [
  {
    id: "netzwerk",
    name: "Netzwerk Reparatur-Initiativen",
    detail: "Termine, Orte und Reparaturschwerpunkte der Reparatur-Initiativen in Nordrhein-Westfalen. Nach Ort oder Postleitzahl durchsuchbar.",
    linkLabel: "Alle NRW-Termine ansehen",
    href: `${NETWORK_EVENTS}?provinceId=10`,
  },
  {
    id: "repaircafe-org",
    name: "Repair Café Weltkarte",
    detail: "Die internationale Karte der Repair-Café-Bewegung. Praktisch, wenn du außerhalb von NRW unterwegs bist.",
    linkLabel: "Repair Café auf der Karte suchen",
    href: WORLD_MAP,
  },
] as const;

/** Direktlink in die Terminsuche des Netzwerks. */
export function cityEventsUrl(city: string) {
  return `${NETWORK_EVENTS}?keyword=${encodeURIComponent(city)}`;
}

/* Die groessten Staedte in NRW, dazu Solingen und Remscheid: Zusammen mit
   Wuppertal bilden sie das Bergische Staedtedreieck, aus dem das Projekt kommt. */
export const repairCafeCities = [
  "Köln",
  "Düsseldorf",
  "Dortmund",
  "Essen",
  "Duisburg",
  "Bochum",
  "Wuppertal",
  "Bielefeld",
  "Bonn",
  "Münster",
  "Mönchengladbach",
  "Gelsenkirchen",
  "Aachen",
  "Krefeld",
  "Solingen",
  "Remscheid",
] as const;
