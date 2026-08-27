/**
 * Einwilligung fuer nicht notwendige Dienste.
 *
 * Der Banner schaltet echte Dienste, keine Platzhalter. Stand der Pruefung am
 * 27.08.2026 laedt die Seite genau einen nicht notwendigen Drittanbieter:
 * `va.vercel-scripts.com` (Vercel Web Analytics). Werbe- oder Trackingdienste
 * gibt es nicht, ebenso keine Google Fonts - die Schriften liegen ueber
 * `next/font` auf der eigenen Domain.
 *
 * Kommt eine Kategorie dazu, muss CONSENT_VERSION steigen: Dann gilt eine alte
 * Entscheidung nicht mehr und es wird erneut gefragt.
 */

export const consentCategories = ["necessary", "statistics"] as const;

export type ConsentCategory = (typeof consentCategories)[number];

export type ConsentChoices = Record<ConsentCategory, boolean>;

export type StoredConsent = {
  version: number;
  /** ISO-Zeitpunkt der Entscheidung, damit sie nachweisbar bleibt. */
  decidedAt: string;
  choices: ConsentChoices;
};

export const CONSENT_STORAGE_KEY = "reparaturrekord.consent";

export const CONSENT_VERSION = 1;

/** Ohne Entscheidung laeuft nur das Notwendige - keine stille Einwilligung. */
export function necessaryOnly(): ConsentChoices {
  return { necessary: true, statistics: false };
}

export function allAccepted(): ConsentChoices {
  return { necessary: true, statistics: true };
}

export function isAllowed(stored: StoredConsent | null, category: ConsentCategory) {
  if (category === "necessary") return true;
  return stored?.choices[category] === true;
}

export function serializeConsent(choices: ConsentChoices, decidedAt: string) {
  return JSON.stringify({
    version: CONSENT_VERSION,
    decidedAt,
    // `necessary` ist nie abwaehlbar und wird deshalb nicht uebernommen.
    choices: { ...choices, necessary: true },
  } satisfies StoredConsent);
}

/**
 * Liest eine gespeicherte Entscheidung. Alles, was nicht genau passt - kaputtes
 * JSON, fehlende Felder, andere Version - gilt als "noch nicht entschieden",
 * damit im Zweifel gefragt wird und nichts ungefragt laeuft.
 */
export function parseStoredConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<StoredConsent>;
  if (candidate.version !== CONSENT_VERSION) return null;
  if (typeof candidate.decidedAt !== "string" || candidate.decidedAt === "") return null;
  if (typeof candidate.choices !== "object" || candidate.choices === null) return null;

  const choices = candidate.choices as Partial<ConsentChoices>;
  for (const category of consentCategories) {
    if (typeof choices[category] !== "boolean") return null;
  }

  return {
    version: candidate.version,
    decidedAt: candidate.decidedAt,
    choices: { ...(choices as ConsentChoices), necessary: true },
  };
}
