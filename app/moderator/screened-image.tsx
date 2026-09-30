"use client";

import { useState } from "react";
import { screeningWarning, type ModerationRepair } from "./repair-types";

/**
 * Das eingereichte Foto - verdeckt, wenn die Bildpruefung es als auffaellig
 * markiert hat (lib/image-screening.ts).
 *
 * Verdeckt statt versteckt: Das Modell irrt sich, und ueber das Foto
 * entscheidet am Ende ein Mensch. Aber diese Person soll bewusst hinsehen,
 * statt beim Durchscrollen der Liste davon getroffen zu werden. In der
 * Tabelle bleibt das Vorschaubild deshalb immer verdeckt; aufdecken laesst es
 * sich nur in der Vollansicht.
 */
export default function ScreenedImage({
  repair,
  className,
  alt,
  revealable = true,
  draggable,
}: {
  repair: ModerationRepair & { imageUrl: string };
  className?: string;
  alt: string;
  revealable?: boolean;
  draggable?: boolean;
}) {
  const warning = screeningWarning(repair);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  // An die Einreichung gebunden, damit das naechste Foto wieder verdeckt startet.
  const hidden = Boolean(warning) && revealedId !== repair.id;

  // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
  const image = <img className={[className, hidden ? "is-screened" : ""].filter(Boolean).join(" ") || undefined} src={repair.imageUrl} alt={alt} draggable={draggable} />;
  if (!hidden || !revealable) return image;

  return (
    <div className="screened-image">
      {image}
      <button className="button secondary" type="button" onClick={() => setRevealedId(repair.id)}>
        {warning} – Foto anzeigen
      </button>
    </div>
  );
}
