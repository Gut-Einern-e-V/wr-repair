/**
 * Highlight-Geschichten (Migration 202610300001).
 *
 * Hier stehen nur die Regeln ohne Datenbank: Stufen, Pruefung der Eingaben und
 * die Suche ueber die freigegebenen Geschichten. Die Routen unter
 * app/api/moderation/highlights/ und die Buehnenansicht bauen darauf auf.
 */

export const highlightStatuses = ["candidate", "ready", "published"] as const;
export type HighlightStatus = (typeof highlightStatuses)[number];

export const highlightStatusLabels: Record<HighlightStatus, string> = {
  candidate: "Vorgemerkt",
  ready: "Geprüft · Bühne",
  published: "Veröffentlicht",
};

export const HIGHLIGHT_LIMITS = { title: 120, teaser: 400, body: 6000, note: 1000 } as const;

/** Die Felder, die die Moderation an einem Highlight aendern darf. */
export type HighlightUpdate = {
  status?: HighlightStatus;
  title?: string;
  teaser?: string;
  body?: string;
  note?: string;
  sortOrder?: number;
};

/** Ein Highlight, wie es in `story_highlights` steht. */
export type HighlightRow = {
  repair_id: string;
  status: HighlightStatus;
  title: string;
  teaser: string;
  body: string;
  note: string;
  sort_order: number;
  public_image_path: string | null;
  public_image_width: number | null;
  public_image_height: number | null;
  published_at: string | null;
  updated_at: string;
};

export const highlightColumns =
  "repair_id, status, title, teaser, body, note, sort_order, public_image_path, public_image_width, public_image_height, published_at, updated_at";

/**
 * Den Rumpf eines PATCH pruefen. Unbekannte Felder werden ignoriert, falsche
 * Typen oder zu lange Texte abgewiesen - mit einer Meldung, die so in der
 * Oberflaeche stehen kann.
 */
export function parseHighlightUpdate(input: unknown): { ok: true; update: HighlightUpdate } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Ungültige Anfrage." };
  const raw = input as Record<string, unknown>;
  const update: HighlightUpdate = {};

  if (raw.status !== undefined) {
    if (typeof raw.status !== "string" || !(highlightStatuses as readonly string[]).includes(raw.status)) {
      return { ok: false, error: "Ungültige Stufe." };
    }
    update.status = raw.status as HighlightStatus;
  }

  for (const field of ["title", "teaser", "body", "note"] as const) {
    const value = raw[field];
    if (value === undefined) continue;
    if (typeof value !== "string") return { ok: false, error: "Ungültiger Text." };
    const trimmed = value.trim();
    if (trimmed.length > HIGHLIGHT_LIMITS[field]) {
      return { ok: false, error: `Der Text ist zu lang (höchstens ${HIGHLIGHT_LIMITS[field]} Zeichen).` };
    }
    update[field] = trimmed;
  }

  if (raw.sortOrder !== undefined) {
    if (typeof raw.sortOrder !== "number" || !Number.isInteger(raw.sortOrder) || raw.sortOrder < 0 || raw.sortOrder > 100000) {
      return { ok: false, error: "Ungültige Reihenfolge." };
    }
    update.sortOrder = raw.sortOrder;
  }

  return { ok: true, update };
}

/**
 * Was fehlt, bevor ein Highlight auf die Buehne oder auf die Seite darf.
 *
 * Auf die Buehne kommt nur, was jemand gelesen hat - Titel und Teaser muessen
 * stehen. Fuer /stories braucht es zusaetzlich die ganze Geschichte. Leer
 * heisst: nichts fehlt.
 */
export function missingForStatus(status: HighlightStatus, fields: { title: string; teaser: string; body: string }) {
  if (status === "candidate") return [];
  const missing: string[] = [];
  if (!fields.title.trim()) missing.push("Titel");
  if (!fields.teaser.trim()) missing.push("Teaser");
  if (status === "published" && !fields.body.trim()) missing.push("Geschichte");
  return missing;
}

/** Eine freigegebene Reparatur mit Text, wie die Highlight-Suche sie durchsucht. */
export type SearchableRepair = {
  id: string;
  category: string;
  brand_model: string | null;
  story: string;
  kreis: string | null;
  image_path: string | null;
  entry_time: string | null;
};

export type HighlightSearch = {
  q: string;
  category: string;
  kreis: string;
  withImage: boolean;
  minLength: number;
  sort: "longest" | "newest";
};

/**
 * Die freigegebenen Geschichten filtern und sortieren.
 *
 * In JavaScript statt in PostgREST: Nach der Textlaenge laesst sich dort nicht
 * sortieren, und es sind wenige hundert Zeilen mit Text - die Abfrage holt sie
 * ohnehin alle.
 */
export function searchRepairs<Row extends SearchableRepair>(rows: Row[], search: HighlightSearch): Row[] {
  const terms = search.q.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);

  const matches = rows.filter((row) => {
    if (search.category && row.category !== search.category) return false;
    if (search.kreis && row.kreis !== search.kreis) return false;
    if (search.withImage && !row.image_path) return false;
    if (row.story.trim().length < search.minLength) return false;
    if (!terms.length) return true;
    const haystack = `${row.brand_model ?? ""} ${row.story} ${row.kreis ?? ""}`.toLocaleLowerCase("de");
    return terms.every((term) => haystack.includes(term));
  });

  return matches.sort((left, right) => search.sort === "newest"
    ? (right.entry_time ?? "").localeCompare(left.entry_time ?? "")
    : right.story.trim().length - left.story.trim().length);
}

/** Dateiendung fuer die oeffentliche Kopie - der Bucket nimmt nur diese drei. */
export function publicImageExtension(contentType: string | null | undefined) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/jpeg") return "jpg";
  return null;
}
