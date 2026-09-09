"use client";

import { useState } from "react";
import {
  shareVisualFileName,
  shareVisualFormatOrder,
  shareVisualFormats,
  shareVisualPath,
  type ShareVisualFormat,
} from "@/lib/share-visual";

type ShareVisualProps = {
  repairId: string;
  /** Begleittext fuer das System-Teilenfenster, wo es ihn annimmt. */
  text: string;
  title: string;
};

/**
 * Das fertige Teilbild zur freigegebenen Reparatur (Issue #100).
 *
 * Drei Dinge in einem Kasten: die Vorschau, die Wahl zwischen Quadrat und
 * Hochformat und zwei Wege zum Bild.
 *
 * **Teilen** oeffnet auf dem Smartphone das System-Teilenfenster *mit der
 * Bilddatei* - von dort geht es direkt nach Instagram, WhatsApp oder TikTok.
 * Das ist der Weg, den Issue #100 beschreibt. Weiter reicht es nicht: Ein
 * Beitrag, der ohne Zutun in einem fremden Konto erscheint, braucht
 * Schnittstellenzugaenge und eine Anmeldung bei jedem Dienst - das kann eine
 * Website nicht anbieten und sollte sie auch nicht.
 *
 * **Herunterladen** ist ein echter Link und kein Knopf: Er funktioniert auch
 * ohne JavaScript, und wo das Teilenfenster keine Dateien annimmt - jeder
 * Schreibtischbrowser, iOS in aelteren Fassungen - ist er der Weg.
 */
export function ShareVisual({ repairId, text, title }: ShareVisualProps) {
  const [format, setFormat] = useState<ShareVisualFormat>("square");
  /** Je Format eigen: Nach dem Wechsel soll die Vorschau erneut laden duerfen. */
  const [loadedFormat, setLoadedFormat] = useState<ShareVisualFormat | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState("");

  const spec = shareVisualFormats[format];
  const path = shareVisualPath(repairId, format);
  const fileName = shareVisualFileName(format);

  async function share() {
    setStatus("");
    setIsSharing(true);

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Das Teilbild konnte nicht geladen werden.");

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || "image/png" });
      const payload = { files: [file], title, text };

      /* `canShare` mit genau derselben Nachricht, die auch geteilt wird: Ob ein
         Browser Dateien annimmt, haengt am Inhalt und nicht nur am Vorhandensein
         der Funktion. */
      if (typeof navigator.canShare === "function" && navigator.canShare(payload)) {
        await navigator.share(payload);
        return;
      }

      setStatus("Dein Browser kann Bilder nicht direkt weitergeben. Lade das Bild herunter und poste es aus deiner Galerie.");
    } catch (error) {
      // Abbrechen ist keine Stoerung: Dann hat sich jemand anders entschieden.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Das Teilen hat nicht geklappt. Lade das Bild herunter und poste es aus deiner Galerie.");
    } finally {
      setIsSharing(false);
    }
  }

  return <section className="share-visual" aria-labelledby="share-visual-title">
    <h2 id="share-visual-title">Dein Bild zum Teilen</h2>
    <p className="share-visual-lead">
      Fertig gestaltet, mit deinem Foto darin. Format wählen, dann teilen oder herunterladen &ndash; und in deine Story
      oder deinen Beitrag stellen.
    </p>

    <div className="share-visual-formats" role="group" aria-label="Format des Teilbildes">
      {shareVisualFormatOrder.map((value) => (
        <button
          key={value}
          type="button"
          className={`share-visual-format${value === format ? " is-active" : ""}`}
          aria-pressed={value === format}
          onClick={() => { setFormat(value); setStatus(""); }}
        >
          {shareVisualFormats[value].label}
          <small>{shareVisualFormats[value].hint}</small>
        </button>
      ))}
    </div>

    <div className={`share-visual-preview is-${format}`}>
      {loadedFormat !== format && <p className="share-visual-loading" role="status">Bild wird erstellt …</p>}
      {/* Die Route liefert ein fertiges PNG in Zielgroesse; die Optimierung von
          next/image hat daran nichts zu tun. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={format}
        src={path}
        width={spec.width}
        height={spec.height}
        alt={`Teilbild deiner Reparatur im Format ${spec.label.toLowerCase()}`}
        onLoad={() => setLoadedFormat(format)}
      />
    </div>

    <div className="share-visual-actions">
      <button className="button button-primary" type="button" disabled={isSharing} onClick={() => void share()}>
        {isSharing ? "Wird vorbereitet …" : "Bild teilen"} <span aria-hidden="true">&#8599;</span>
      </button>
      <a className="button button-secondary" href={path} download={fileName}>
        Bild herunterladen <span aria-hidden="true">&#8595;</span>
      </a>
    </div>
    {status && <p className="form-notice" role="status">{status}</p>}
  </section>;
}
