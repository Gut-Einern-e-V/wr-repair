"use client";

import { useEffect, useState } from "react";

/**
 * Aufruf zum Mitmachen mit QR-Code.
 *
 * Der Code wird im Browser aus der *eigenen* Adresse der Seite erzeugt:
 * `window.location.origin` plus `/mitmachen`. Damit stimmt er auf jeder Domain,
 * ohne dass irgendwo eine Adresse hinterlegt werden muss - auf der
 * Vercel-Vorschau, auf der spaeteren Wunschdomain und im lokalen Betrieb.
 *
 * `qrcode` wird erst beim Anzeigen geladen. Die Bibliothek gehoert nicht in das
 * Startpaket einer Seite, die stundenlang laeuft und sie genau einmal braucht.
 */

/**
 * Blaue Module auf durchsichtigem Grund - kein Feld hinter dem Code.
 *
 * Der Ton ist das Projektblau (`--blue`, #465eab), zur Haelfte in Richtung des
 * Papiertons aufgehellt. Das reine #465eab kommt auf dem dunklen Grund nur auf
 * etwa 3:1 Kontrast; eine Kamera binarisiert das auf einer Projektion nicht mehr
 * zuverlaessig, und ein Code, der nicht scannt, ist auf der Buehne wertlos. So
 * aufgehellt liegt der Kontrast bei rund 7:1 und der Ton bleibt erkennbar blau.
 *
 * Ausserdem sieht die Norm dunkle Module auf hellem Grund vor. Invertiert lesen
 * die Kameras von iPhone und Android zuverlaessig, einzelne Scanner-Apps nicht.
 * Sollte es auf der Veranstaltung haken: `QR_MODULES` auf "#465eab" und
 * `QR_FIELD` auf "#f7f5f0" setzen, dann ist es ein normgerechter Code.
 */
const QR_MODULES = "#8c9ac7";
const QR_FIELD = "#00000000";

export function SubmitQr() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${window.location.origin}/mitmachen`;

    void (async () => {
      try {
        const { default: QRCode } = await import("qrcode");
        const encoded = await QRCode.toDataURL(url, {
          width: 640,
          // Zwei Module Rand: Ohne Ruhezone findet die Kamera den Code nicht.
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: QR_MODULES, light: QR_FIELD },
        });
        if (cancelled) return;
        setDataUrl(encoded);
        setTarget(url);
      } catch {
        // Ohne Code bleibt die Adresse als Text stehen - die kann man abtippen.
        if (!cancelled) setTarget(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null;

  const readable = target.replace(/^https?:\/\//, "");

  return (
    <aside className="submit-qr">
      {dataUrl && (
        // Ein zur Laufzeit erzeugtes Data-URL-Bild kann der Next-Optimizer nicht verarbeiten.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`QR-Code zu ${readable}`} src={dataUrl} />
      )}
      <div>
        <strong>Selbst repariert?</strong>
        <span>Code scannen und in zwei Minuten eintragen.</span>
        <code>{readable}</code>
      </div>
    </aside>
  );
}
