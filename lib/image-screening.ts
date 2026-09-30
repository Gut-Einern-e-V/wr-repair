/**
 * Vorpruefung eingereichter Fotos auf Nacktheit und Gore mit Sightengine.
 *
 * Die Pruefung ersetzt die Moderation nicht, sie sortiert nur vor:
 *
 * - `blocked`: eindeutig sexuell oder blutig-verstoerend. Die Einreichung wird
 *   mit diesem Foto nicht angenommen, das Bild erreicht weder Storage noch
 *   Moderation. Niemand im Team soll so etwas ansehen muessen.
 * - `flagged`: auffaellig, aber nicht eindeutig. Die Einreichung wird wie
 *   jede andere angenommen, die Moderation sieht einen Hinweis und das Foto
 *   zunaechst verdeckt.
 * - `clear`: nichts gefunden.
 * - `unchecked`: nicht geprueft - kein Schluessel, Zeitueberschreitung,
 *   aufgebrauchtes Kontingent. Dann gilt dasselbe wie beim Spam-Schutz:
 *   annehmen und die Moderation entscheiden lassen. Eine echte Reparatur
 *   darf nicht daran scheitern, dass ein fremder Dienst schweigt.
 *
 * Was nicht passiert: Kein Foto wird ohne Moderation freigegeben, egal wie
 * unauffaellig es ist. Ob auf einem Foto erkennbare Personen einverstanden
 * sind, kann kein Modell beurteilen.
 */

const SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json";

/**
 * Obergrenze fuer die Antwort. Die Pruefung steht vor dem Speichern, jede
 * Sekunde hier wartet der Mensch vor dem Formular mit. Die Bilder sind auf
 * 200 KB begrenzt; im Normalfall antwortet Sightengine in unter einer Sekunde.
 */
const SCREENING_TIMEOUT_MS = 3_500;

/** Je Bild zwei Operationen im Sightengine-Kontingent, eine je Modell. */
const MODELS = "nudity-2.1,gore-2.0";

/**
 * Schwellen, ab denen gesperrt oder markiert wird.
 *
 * Bewusst vorsichtig beim Sperren: Eine gesperrte echte Reparatur kostet
 * einen Menschen sein Foto, eine durchgelassene auffaellige kostet die
 * Moderation einen Klick. Deshalb sperrt nur, was das Modell fast sicher
 * erkennt. Gore bekommt die hoechste Schwelle, weil Reparaturfotos
 * durchaus einen blutigen Finger zeigen koennen.
 */
export const SCREENING_THRESHOLDS = {
  explicitBlock: 0.85,
  explicitFlag: 0.5,
  suggestiveFlag: 0.8,
  goreBlock: 0.9,
  goreFlag: 0.5,
} as const;

/** Verdichtete Werte, so wie sie gespeichert werden - kein Bezug zu einer Person. */
export type ScreeningScores = {
  /** Hoechster Wert aus sexueller Handlung, sexueller Darstellung und Erotik. */
  explicit: number;
  /** "Sehr anzueglich" - Unterwaesche, Pose, aber keine Nacktheit. */
  suggestive: number;
  gore: number;
};

export type ScreeningReason = "explicit" | "suggestive" | "gore";

export type ScreeningResult =
  | { verdict: "blocked" | "flagged" | "clear"; scores: ScreeningScores; reasons: ScreeningReason[] }
  | { verdict: "unchecked"; cause: "unconfigured" | "unavailable"; detail?: string };

function score(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

/**
 * Antwort von Sightengine in ein Urteil uebersetzen.
 *
 * Getrennt vom Aufruf, damit sich die Schwellen ohne Netz testen lassen.
 * Gibt null zurueck, wenn die Antwort nicht die erwartete Form hat - dann
 * gilt das Bild als ungeprueft und nicht als unauffaellig. Eine veraenderte
 * API darf nicht still alles durchwinken.
 */
export function classifyScreening(body: unknown): Extract<ScreeningResult, { scores: ScreeningScores }> | null {
  if (!body || typeof body !== "object") return null;
  const { status, nudity, gore } = body as Record<string, unknown>;
  if (status !== "success" || !nudity || typeof nudity !== "object" || !gore || typeof gore !== "object") {
    return null;
  }

  const n = nudity as Record<string, unknown>;
  const g = gore as Record<string, unknown>;
  if (typeof n.none !== "number" || typeof g.prob !== "number") return null;

  const scores: ScreeningScores = {
    explicit: Math.max(score(n.sexual_activity), score(n.sexual_display), score(n.erotica)),
    suggestive: score(n.very_suggestive),
    gore: score(g.prob),
  };

  const t = SCREENING_THRESHOLDS;
  const blockReasons: ScreeningReason[] = [];
  if (scores.explicit >= t.explicitBlock) blockReasons.push("explicit");
  if (scores.gore >= t.goreBlock) blockReasons.push("gore");
  if (blockReasons.length) {
    return { verdict: "blocked", scores, reasons: blockReasons };
  }

  const flagReasons: ScreeningReason[] = [];
  if (scores.explicit >= t.explicitFlag) flagReasons.push("explicit");
  if (scores.suggestive >= t.suggestiveFlag) flagReasons.push("suggestive");
  if (scores.gore >= t.goreFlag) flagReasons.push("gore");

  return flagReasons.length
    ? { verdict: "flagged", scores, reasons: flagReasons }
    : { verdict: "clear", scores, reasons: [] };
}

export function isScreeningConfigured() {
  return Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
}

/**
 * Das bereinigte Foto an Sightengine schicken.
 *
 * Nur die Fassung ohne Metadaten geht hinaus, und nur fuer Einreichungen,
 * die Spam-Schutz und Herkunftspruefung schon bestanden haben - sonst
 * bekaeme ein fremder Dienst Fotos von Einreichungen, die ohnehin
 * abgewiesen werden. Wirft nie.
 */
export async function screenImage(image: Blob, fetchImpl: typeof fetch = fetch): Promise<ScreeningResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    return { verdict: "unchecked", cause: "unconfigured" };
  }

  const body = new FormData();
  body.set("media", image, "upload");
  body.set("models", MODELS);
  body.set("api_user", apiUser);
  body.set("api_secret", apiSecret);

  try {
    const response = await fetchImpl(SIGHTENGINE_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(SCREENING_TIMEOUT_MS),
    });
    const json = await response.json().catch(() => null) as
      { status?: string; error?: { type?: string; code?: number; message?: string } } | null;

    /* Sightengine meldet Fehler als `status: "failure"` - falscher Schluessel,
       aufgebrauchtes Tageskontingent, unlesbares Bild. Keiner davon ist ein
       Urteil ueber das Foto. */
    if (!response.ok || json?.status !== "success") {
      const error = json?.error;
      const detail = [`HTTP ${response.status}`, error?.type, error?.code, error?.message].filter(Boolean).join(" ");
      return { verdict: "unchecked", cause: "unavailable", detail };
    }

    return classifyScreening(json) ?? { verdict: "unchecked", cause: "unavailable", detail: "Antwort ohne erwartete Felder" };
  } catch (error) {
    return { verdict: "unchecked", cause: "unavailable", detail: error instanceof Error ? error.message : "fetch failed" };
  }
}

/**
 * Was in `repairs.image_screening` steht. Gesperrte Bilder kommen nie dort
 * an, und ungepruefte bekommen keinen Eintrag: Ein leeres Feld heisst
 * "nicht geprueft", das ist dieselbe Aussage.
 */
export type StoredScreening = {
  verdict: "flagged" | "clear";
  scores: ScreeningScores;
  reasons: ScreeningReason[];
};

const storedReasons = new Set<ScreeningReason>(["explicit", "suggestive", "gore"]);

/** Gespeicherten Eintrag defensiv einlesen - jsonb garantiert keine Form. */
export function toStoredScreening(raw: unknown): StoredScreening | null {
  if (!raw || typeof raw !== "object") return null;
  const { verdict, scores, reasons } = raw as Record<string, unknown>;
  if (verdict !== "flagged" && verdict !== "clear") return null;
  if (!scores || typeof scores !== "object") return null;

  const s = scores as Record<string, unknown>;
  return {
    verdict,
    scores: { explicit: score(s.explicit), suggestive: score(s.suggestive), gore: score(s.gore) },
    reasons: Array.isArray(reasons)
      ? reasons.filter((reason): reason is ScreeningReason => storedReasons.has(reason as ScreeningReason))
      : [],
  };
}
