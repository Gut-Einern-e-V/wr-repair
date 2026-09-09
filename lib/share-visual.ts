/**
 * Das Teilbild einer freigegebenen Reparatur (Issue #100).
 *
 * Hier stehen nur die Groessen, die Texte und die Dateinamen. Gezeichnet wird
 * das Bild in app/reparatur/[id]/share-image/route.tsx, angeboten wird es von
 * components/share-visual.tsx.
 *
 * Warum ueberhaupt ein eigenes Bild neben dem Vorschaubild
 * (app/reparatur/[id]/opengraph-image.tsx)? Beide sehen aehnlich aus und haben
 * verschiedene Aufgaben. Das Vorschaubild erscheint, wenn *irgendwer* den Link
 * teilt - es zeigt deshalb nur das Zeichen der Kategorie und nie das Foto. Das
 * Teilbild laedt die einreichende Person selbst herunter und postet es selbst;
 * dort ist ihr Foto genau das, was sie zeigen will.
 */

export type ShareVisualFormat = "square" | "story";

export type ShareVisualSpec = {
  label: string;
  /** Erlaeuterung unter dem Knopf: wo dieses Format hingehoert. */
  hint: string;
  width: number;
  height: number;
};

/**
 * Zwei Formate, weil die Kanaele zwei brauchen: Der Feed von Instagram und
 * Facebook zeigt quadratisch, Story und TikTok hochkant. Ein Format fuer beides
 * gibt es nicht - im Feed wuerde ein Hochformat beschnitten, in der Story
 * bekaeme ein Quadrat Balken.
 *
 * 1080 Pixel Breite ist bei allen genannten Diensten die Kante, ab der nicht
 * mehr hochskaliert wird.
 */
export const shareVisualFormats: Record<ShareVisualFormat, ShareVisualSpec> = {
  square: {
    label: "Quadratisch",
    hint: "Für Beiträge in Instagram und Facebook",
    width: 1080,
    height: 1080,
  },
  story: {
    label: "Hochformat",
    hint: "Für Storys und TikTok",
    width: 1080,
    height: 1920,
  },
};

export const shareVisualFormatOrder: ShareVisualFormat[] = ["square", "story"];

export function isShareVisualFormat(value: unknown): value is ShareVisualFormat {
  return value === "square" || value === "story";
}

/** Format aus der Adresse, mit dem Quadrat als Vorgabe. */
export function parseShareVisualFormat(value: string | null): ShareVisualFormat {
  return isShareVisualFormat(value) ? value : "square";
}

/* --- Aussehen einer einzelnen Karte ------------------------------------- */

/**
 * Grundflaechen, genau wie beim Aufsteller-Generator (siehe `posterBackgrounds`
 * in lib/poster.ts).
 *
 * Bewusst dieselben vier und nicht eigene: Aufsteller und Teilbild sollen aus
 * einer Familie kommen, und die Farbzuordnung ist dort schon entschieden. Die
 * Regel aus dem Styleguide steckt in der Tabelle - Gelb auf dunklem Grund,
 * Mint auf hellem, nie Aufkleber und Grund aus derselben Farbfamilie. Die
 * grossen Flaechen tragen die entsaettigten Varianten (Designprinzip 10).
 */
export type ShareVisualGround = "paper" | "mint" | "yellow" | "ink";

export type GroundSpec = {
  /** Flaeche der Karte. */
  ground: string;
  /** Textfarbe darauf. */
  text: string;
  /** Zweite Textebene: die Zeile mit der Adresse. */
  muted: string;
  /** Flaeche der Aufkleber-Ueberschrift. */
  sticker: string;
  stickerText: string;
};

export const shareVisualGrounds: Record<ShareVisualGround, GroundSpec> = {
  paper: { ground: "#f7f5f0", text: "#101626", muted: "rgba(16, 22, 38, .72)", sticker: "#95d4bb", stickerText: "#101626" },
  mint: { ground: "#b4e0cc", text: "#101626", muted: "rgba(16, 22, 38, .72)", sticker: "#f7f5f0", stickerText: "#101626" },
  yellow: { ground: "#f4bd4c", text: "#101626", muted: "rgba(16, 22, 38, .72)", sticker: "#f7f5f0", stickerText: "#101626" },
  ink: { ground: "#101626", text: "#efece5", muted: "rgba(239, 236, 229, .72)", sticker: "#ffc432", stickerText: "#101626" },
};

export const shareVisualGroundOrder: ShareVisualGround[] = ["paper", "mint", "yellow", "ink"];

/**
 * Die Zeile im Aufkleber, eine je Aufkleber.
 *
 * Mehrere Sprueche, damit nicht jedes geteilte Bild denselben Satz traegt -
 * eine Zeitleiste voller identischer Grafiken sieht nach Vorlage aus und nicht
 * nach Reparatur. Alle sagen dieselbe Sache, keiner behauptet etwas ueber die
 * einzelne Reparatur: Welche es war, steht im Aufkleber am Foto.
 *
 * Die laengste Zeile bestimmt die Schriftgroesse (siehe
 * {@link shareVisualHeadlineSize}); mehr als 27 Zeichen sollte sie deshalb
 * nicht haben, sonst schrumpft der Aufkleber sichtbar.
 */
export const shareVisualClaims: string[][] = [
  ["Repariert statt", "weggeworfen"],
  ["Wieder ganz."],
  ["Läuft wieder!"],
  ["Nicht kaputt.", "Nur reparaturbedürftig."],
];

export type ShareVisualLook = {
  ground: ShareVisualGround;
  groundSpec: GroundSpec;
  claim: string[];
  /** Drehung je Aufkleberzeile in Grad, immer unter zwei (Styleguide 7.1). */
  rotations: number[];
};

/**
 * Streuwert aus der Kennung der Einreichung (FNV-1a).
 *
 * Entscheidend ist, dass er sich *nicht* aendert: Die Vorschau auf der
 * Statusseite und die spaeter heruntergeladene Datei muessen dasselbe Bild
 * zeigen, und wer den Link zweimal oeffnet, soll nicht zweimal etwas anderes
 * sehen. Ein Zufallsgenerator waere hier also genau falsch - die Kennung ist
 * je Reparatur fest und je Reparatur verschieden, und mehr braucht es nicht.
 */
export function shareVisualSeed(repairId: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < repairId.length; index += 1) {
    hash ^= repairId.charCodeAt(index);
    // 16777619, ausgeschrieben als Schiebefolge: `Math.imul` waere hier
    // dasselbe, aber die Folge macht sichtbar, dass nichts ueberlaeuft.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash;
}

/** Grundflaeche, Spruch und Drehungen dieser einen Reparatur. */
export function shareVisualLook(repairId: string): ShareVisualLook {
  const seed = shareVisualSeed(repairId);
  const ground = shareVisualGroundOrder[seed % shareVisualGroundOrder.length];
  /* Andere Stelle des Streuwerts als der Grund, sonst waeren Grund und Spruch
     aneinander gekoppelt und es gaebe statt sechzehn nur vier Bilder. */
  const claim = shareVisualClaims[(seed >>> 8) % shareVisualClaims.length];

  return {
    ground,
    groundSpec: shareVisualGrounds[ground],
    claim,
    /* Abwechselnd links und rechts geneigt, wie die `.sticker-head`-Zeilen der
       Website. Betrag zwischen 0,4 und 1,8 Grad - darueber wirkt es wie ein
       Fehler und nicht wie ein Aufkleber. */
    rotations: claim.map((_, index) => {
      const magnitude = 0.4 + ((seed >>> (4 * (index + 1))) % 15) / 10;
      return index % 2 === 0 ? -magnitude : magnitude;
    }),
  };
}

/**
 * Schriftgroesse des Aufklebers, damit die laengste Zeile in die Karte passt.
 *
 * Satori kennt kein Umbrechen nach Gefuehl: Eine zu lange Zeile laeuft aus dem
 * Aufkleber heraus, statt kleiner zu werden. 0,52 em je Zeichen ist die
 * gemessene Durchschnittsbreite der verwendeten Schrift im fetten Schnitt, mit
 * etwas Luft nach oben.
 */
export function shareVisualHeadlineSize(claim: string[], baseSize: number, availableWidth: number) {
  const longest = Math.max(...claim.map((line) => line.length), 1);
  return Math.min(baseSize, Math.floor(availableWidth / (longest * 0.52)));
}

export function shareVisualPath(repairId: string, format: ShareVisualFormat) {
  return `/reparatur/${repairId}/share-image?format=${format}`;
}

/**
 * Dateiname des Downloads.
 *
 * Bewusst ohne die Kennung der Einreichung: Die Datei landet in der Galerie
 * oder im Download-Ordner und wird von dort weitergegeben - ein Name, der
 * niemandem etwas sagt, ist dort schlechter als einer, der das Projekt nennt.
 * Die Kennung ist zwar nicht geheim, aber sie muss auch nicht mitreisen.
 */
export function shareVisualFileName(format: ShareVisualFormat) {
  return `reparaturrekord-nrw-${format === "story" ? "story" : "quadrat"}.png`;
}
