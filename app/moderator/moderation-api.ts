import type { MetadataDraft, ModerationRepair, RepairStatus } from "./repair-types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; conflict: boolean };

async function send<T>(url: string, init: RequestInit, fallback: string): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    return { ok: false, error: fallback, conflict: false };
  }

  const payload = await response.json().catch(() => ({})) as T & { error?: string };

  if (!response.ok) {
    // 409 heisst: Die Einreichung ist weg, nicht kaputt. Die Oberflaeche holt
    // dann die naechste, statt einen Fehler stehen zu lassen (Issue #38).
    return { ok: false, error: payload.error ?? fallback, conflict: response.status === 409 };
  }

  return { ok: true, data: payload };
}

function json(body: unknown): RequestInit {
  return { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/**
 * Entscheidung ueber eine Einreichung.
 *
 * `pending` ist die Rueckholung einer bereits entschiedenen Einreichung und
 * nur Admins und Superadmins erlaubt - der Server prueft das nochmals
 * (Issue #58).
 *
 * `deleteImage` ist die Freigabe ohne Foto (Issue #49): Die Reparatur stimmt,
 * das Bild soll aber nicht oeffentlich werden. Der Server loescht es vor der
 * Freigabe, damit es nicht fuer die Dauer eines zweiten Aufrufs sichtbar ist -
 * deshalb ein Aufruf und nicht Loeschung plus Freigabe.
 */
export function decideRepair(repairId: string, status: RepairStatus, comment: string, deleteImage = false) {
  return send<{ imageDeleted?: boolean }>(
    `/api/moderation/repairs/${repairId}`,
    json({ status, moderatorComment: comment, ...(deleteImage ? { deleteImage: true } : {}) }),
    "Moderationsentscheidung konnte nicht gespeichert werden.",
  );
}

export function saveRepairMetadata(repairId: string, draft: MetadataDraft) {
  const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return send<{ ok: true }>(
    `/api/moderation/repairs/${repairId}`,
    json({ metadata: { ...draft, tags } }),
    "Die Metadaten konnten nicht gespeichert werden.",
  );
}

/**
 * Nur das Bild loeschen, die Einreichung bleibt (Issue #49). Fuer Fotos, auf
 * denen jemand nicht mehr zu sehen sein moechte, und fuer Einreichungen, die
 * ohne ihr Foto freigegeben werden sollen.
 */
export function deleteRepairImage(repairId: string) {
  return send<{ ok: true }>(
    `/api/moderation/repairs/${repairId}/image`,
    { method: "DELETE" },
    "Das Bild konnte nicht gelöscht werden.",
  );
}

export function deleteRepair(repairId: string) {
  return send<{ ok: true }>(`/api/moderation/repairs/${repairId}`, { method: "DELETE" }, "Einreichung konnte nicht gelöscht werden.");
}

/** Holt genau eine Einreichung und haelt sie fuer diese Sitzung fest. */
export function claimNextRepair(skip: string[]) {
  return send<{ repair: ModerationRepair | null; remaining: number | null }>(
    "/api/moderation/repairs/next",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skip }) },
    "Die nächste Einreichung konnte nicht geladen werden.",
  );
}

/**
 * Gibt eine beanspruchte Einreichung zurueck. Ohne Antwort und ohne Warten:
 * Der Aufruf passiert auch beim Schliessen des Tabs, wo nur noch `sendBeacon`
 * zuverlaessig durchkommt.
 */
export function releaseRepairClaim(repairId: string) {
  const url = `/api/moderation/repairs/${repairId}/release`;

  if (typeof navigator !== "undefined" && navigator.sendBeacon?.(url)) {
    return;
  }

  void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
}
