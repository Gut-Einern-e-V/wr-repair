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
