/**
 * Bausteine des Aufsteller-Generators (Issue #92).
 *
 * Hier stehen nur Daten: Blattformate, Sprachfassungen und Hintergrundvarianten.
 * Das Layout selbst liegt in `app/aufsteller/poster-studio.tsx` und in den
 * `.poster-*`-Regeln in `app/globals.css`.
 */

export type PosterFormat = "a4" | "a5" | "a6";
export type PosterLanguage = "de" | "en" | "ar" | "all";
export type PosterBackground = "paper" | "mint" | "yellow" | "ink";

/** Kurze Kante des Bogens, auf dem gedruckt wird. Alles hier ist DIN A4. */
export const SHEET_SHORT_MM = 210;
export const SHEET_LONG_MM = 297;

export type FormatSpec = {
  label: string;
  /** Erlaeuterung unter dem Radiobutton. */
  hint: string;
  /** Wie viele Aufsteller auf einen A4-Bogen passen. */
  perSheet: number;
  columns: number;
  rows: number;
  /** Ausrichtung des A4-Bogens, wandert unveraendert in die `@page`-Regel. */
  orientation: "portrait" | "landscape";
  cardWidthMm: number;
  cardHeightMm: number;
};

/* A5 steht quer auf dem Bogen: Zwei A5-Hochformate nebeneinander ergeben
   297 x 210 mm, also A4 quer. Vier A6-Hochformate ergeben 210 x 297 mm, also
   A4 hoch. So bleibt der Aufsteller in jedem Format hochkant - nur der Bogen
   dreht sich. `lib/poster.test.ts` rechnet das nach. */
export const posterFormats: Record<PosterFormat, FormatSpec> = {
  a4: {
    label: "DIN A4",
    hint: "Ein Aufsteller pro Bogen",
    perSheet: 1,
    columns: 1,
    rows: 1,
    orientation: "portrait",
    cardWidthMm: 210,
    cardHeightMm: 297,
  },
  a5: {
    label: "DIN A5",
    hint: "Zwei pro Bogen, A4 quer",
    perSheet: 2,
    columns: 2,
    rows: 1,
    orientation: "landscape",
    cardWidthMm: 148.5,
    cardHeightMm: 210,
  },
  a6: {
    label: "DIN A6",
    hint: "Vier pro Bogen, A4 hoch",
    perSheet: 4,
    columns: 2,
    rows: 2,
    orientation: "portrait",
    cardWidthMm: 105,
    cardHeightMm: 148.5,
  },
};

export const posterFormatOrder: PosterFormat[] = ["a4", "a5", "a6"];

/** Masse des bedruckten Bogens - immer A4, nur unterschiedlich gedreht. */
export function sheetSizeMm(format: PosterFormat) {
  const spec = posterFormats[format];
  return spec.orientation === "landscape"
    ? { widthMm: SHEET_LONG_MM, heightMm: SHEET_SHORT_MM }
    : { widthMm: SHEET_SHORT_MM, heightMm: SHEET_LONG_MM };
}

export type PosterCopy = {
  /** Sprachkennzeichen fuer `lang`, damit Vorlesesoftware richtig umschaltet. */
  locale: string;
  direction: "ltr" | "rtl";
  /** Name der Sprache in der Sprache selbst, fuer die Auswahl im Generator. */
  nativeName: string;
  kicker: string;
  /** Eine Zeile pro Aufkleber. Bewusst kurz, damit nichts umbricht. */
  headline: string[];
  lead: string;
  /** Kurzfassung fuer A6 und fuer die dreisprachige Variante. */
  leadShort: string;
  steps: string[];
  footer: string;
};

/* Die englische und die arabische Fassung sind Uebersetzungen der deutschen.
   Der Projektname bleibt in allen drei Fassungen deutsch: Er steht so auf der
   Domain, im Foerderabbinder und auf allen anderen Materialien. */
export const posterCopy: Record<Exclude<PosterLanguage, "all">, PosterCopy> = {
  de: {
    locale: "de",
    direction: "ltr",
    nativeName: "Deutsch",
    kicker: "Reparaturrekord NRW",
    headline: ["Repariert?", "Jetzt", "eintragen!"],
    lead: "Scanne den Code mit der Kamera deines Smartphones und trage deine Reparatur in zwei Minuten ein.",
    leadShort: "Code scannen und Reparatur eintragen.",
    steps: [
      "Foto der Reparatur aufnehmen",
      "Kategorie wählen und kurz beschreiben",
      "Nach der Prüfung zählt deine Reparatur",
    ],
    footer: "Ein Projekt der FAB Region Bergisches Städtedreieck",
  },
  en: {
    locale: "en",
    direction: "ltr",
    nativeName: "English",
    kicker: "Reparaturrekord NRW",
    headline: ["Repaired?", "Add it", "right now!"],
    lead: "Scan the code with your phone camera and add your repair in two minutes.",
    leadShort: "Scan the code and add your repair.",
    steps: [
      "Take a photo of the repair",
      "Choose a category and describe it briefly",
      "Once it is checked, your repair counts",
    ],
    footer: "A project by FAB Region Bergisches Städtedreieck",
  },
  ar: {
    locale: "ar",
    direction: "rtl",
    nativeName: "العربية",
    kicker: "Reparaturrekord NRW",
    headline: ["أصلحته؟", "سجّله", "الآن!"],
    lead: "امسح الرمز بكاميرا هاتفك وسجّل إصلاحك في دقيقتين.",
    leadShort: "امسح الرمز وسجّل إصلاحك.",
    steps: [
      "صوّر الغرض بعد إصلاحه",
      "اختر الفئة واكتب وصفاً قصيراً",
      "بعد المراجعة يُحتسب إصلاحك",
    ],
    footer: "مشروع من FAB Region Bergisches Städtedreieck",
  },
};

export const posterLanguageOrder: PosterLanguage[] = ["de", "en", "ar", "all"];

/** Beschriftung der Sprachauswahl; "all" ist keine Sprache, sondern ein Layout. */
export function posterLanguageLabel(language: PosterLanguage) {
  return language === "all" ? "Dreisprachig" : posterCopy[language].nativeName;
}

/** Sprachen, deren Kurztext auf der dreisprachigen Variante steht. */
export const trilingualOrder: Exclude<PosterLanguage, "all">[] = ["de", "en", "ar"];

export type BackgroundSpec = {
  label: string;
  hint: string;
  /** Runde Ecken nur bei den farbigen Varianten (Issue #92). */
  rounded: boolean;
};

export const posterBackgrounds: Record<PosterBackground, BackgroundSpec> = {
  paper: { label: "Papier", hint: "Sparsam im Druck", rounded: false },
  mint: { label: "Mint", hint: "Runde Ecken", rounded: true },
  yellow: { label: "Gelb", hint: "Runde Ecken", rounded: true },
  ink: { label: "Dunkel", hint: "Runde Ecken, viel Toner", rounded: true },
};

export const posterBackgroundOrder: PosterBackground[] = ["paper", "mint", "yellow", "ink"];

/**
 * Ob die drei Schritte auf dieses Blatt gehoeren.
 *
 * A6 ist 105 mm breit; bei der dort noetigen Schriftgroesse blieben fuer die
 * Schrittliste rund 5 pt uebrig - das liest niemand. Auf der dreisprachigen
 * Fassung entfaellt sie aus einem anderen Grund: Die Liste gaebe es nur auf
 * Deutsch, und dann stuenden ueber dem Code drei Sprachen und darunter eine.
 */
export function stepsFit(format: PosterFormat, language: PosterLanguage) {
  return format !== "a6" && language !== "all";
}
