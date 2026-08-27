"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveConsent, useConsentSnapshot } from "@/lib/consent-store";
import { allAccepted, necessaryOnly, type ConsentChoices } from "@/lib/consent";

/* Von "Cookie-Einstellungen" im Footer ausgeloest. */
export const CONSENT_OPEN_EVENT = "reparaturrekord:consent-open";

const categoryCopy = [
  {
    key: "necessary" as const,
    title: "Notwendig",
    detail: "Hält die Seite am Laufen: die Anmeldung im Moderationsbereich, der Spam-Schutz des Formulars und die Speicherung dieser Entscheidung. Ohne das funktioniert die Seite nicht, deshalb ist es nicht abwählbar.",
  },
  {
    key: "statistics" as const,
    title: "Statistik",
    detail: "Vercel Web Analytics zählt anonym, welche Seiten aufgerufen werden – ohne Cookies und ohne Profile. Lehnst du ab, wird das Skript gar nicht geladen.",
  },
];

export function ConsentBanner() {
  const snapshot = useConsentSnapshot();
  const [isForcedOpen, setIsForcedOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>(necessaryOnly);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const decided = snapshot.status === "ready" ? snapshot.consent : null;

  useEffect(() => {
    /* Die Vorbelegung passiert hier im Handler, nicht in einem Effekt: Beim
       Aufklappen soll die bereits getroffene Entscheidung sichtbar sein. */
    function open() {
      setChoices(decided?.choices ?? necessaryOnly());
      setShowDetails(true);
      setIsForcedOpen(true);
    }

    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, [decided]);

  const isOpen = snapshot.status === "ready" && (snapshot.consent === null || isForcedOpen);

  /* Der Hinweis erscheint erst nach dem Hydrieren. Damit er nicht nur optisch
     auftaucht, wandert der Fokus einmal auf die Ueberschrift. */
  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  function decide(next: ConsentChoices) {
    saveConsent(next);
    setIsForcedOpen(false);
    setShowDetails(false);
  }

  return <section className="consent-banner" role="dialog" aria-modal="false" aria-labelledby="consent-title" aria-describedby="consent-text">
    <div className="consent-banner-inner">
      <div className="consent-banner-copy">
        <h2 id="consent-title" ref={headingRef} tabIndex={-1}>Was darf mitlaufen?</h2>
        <p id="consent-text">
          Diese Seite nutzt keine Werbung und kein Tracking über andere Websites hinweg. Wir würden nur gerne anonym
          zählen, welche Seiten aufgerufen werden. Du entscheidest &ndash; und kannst das jederzeit im Footer ändern.
        </p>
      </div>

      {showDetails && <ul className="consent-categories">
        {categoryCopy.map((category) => {
          const isNecessary = category.key === "necessary";
          return <li key={category.key}>
            <label>
              <input
                type="checkbox"
                checked={isNecessary ? true : choices[category.key]}
                disabled={isNecessary}
                onChange={(event) => setChoices((current) => ({ ...current, [category.key]: event.target.checked }))}
              />
              <span>
                <strong>{category.title}{isNecessary && " (immer aktiv)"}</strong>
                {category.detail}
              </span>
            </label>
          </li>;
        })}
      </ul>}

      <div className="consent-actions">
        {/* Annehmen und Ablehnen sehen absichtlich gleich aus: Ablehnen darf
            nicht schwerer fallen als Annehmen. */}
        <button className="button consent-button" type="button" onClick={() => decide(allAccepted())}>Alle akzeptieren</button>
        <button className="button consent-button" type="button" onClick={() => decide(necessaryOnly())}>Nur Notwendige</button>
        {showDetails
          ? <button className="button consent-button" type="button" onClick={() => decide(choices)}>Auswahl speichern</button>
          : <button className="text-button" type="button" onClick={() => setShowDetails(true)}>Einstellungen</button>}
        <Link className="text-button" href="/privacy">Datenschutz</Link>
      </div>
    </div>
  </section>;
}
