import type { HighlightStatus, HighlightUpdate } from "@/lib/story-highlights";

export type HighlightRepair = {
  category: string;
  categoryLabel: string;
  brandModel: string | null;
  story: string;
  kreis: string | null;
  performedBy: string | null;
  repairSucceeded: boolean;
  entryTime: string | null;
  hasImage: boolean;
  imageUrl: string | null;
};

export type Highlight = {
  repairId: string;
  status: HighlightStatus;
  title: string;
  teaser: string;
  body: string;
  note: string;
  sortOrder: number;
  publishedAt: string | null;
  updatedAt: string;
  repair: HighlightRepair;
};

export type SearchResult = {
  id: string;
  categoryLabel: string;
  brandModel: string | null;
  story: string;
  kreis: string | null;
  performedBy: string | null;
  repairSucceeded: boolean;
  entryTime: string | null;
  imageUrl: string | null;
  highlightStatus: HighlightStatus | null;
};

export type SearchResponse = { total: number; withText: number; kreise: string[]; results: SearchResult[] };

type Result = { ok: true } | { ok: false; error: string };

async function send(url: string, init: RequestInit, fallback: string): Promise<Result> {
  try {
    const response = await fetch(url, init);
    if (response.ok) return { ok: true };
    const payload = await response.json().catch(() => ({})) as { error?: string };
    return { ok: false, error: payload.error ?? fallback };
  } catch {
    return { ok: false, error: fallback };
  }
}

export function addHighlight(repairId: string) {
  return send("/api/moderation/highlights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repairId }),
  }, "Konnte nicht in den Eimer gelegt werden.");
}

export function updateHighlight(repairId: string, update: HighlightUpdate) {
  return send(`/api/moderation/highlights/${repairId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  }, "Das Highlight konnte nicht gespeichert werden.");
}

export function removeHighlight(repairId: string) {
  return send(`/api/moderation/highlights/${repairId}`, { method: "DELETE" }, "Das Highlight konnte nicht entfernt werden.");
}
