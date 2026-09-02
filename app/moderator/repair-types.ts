import type { ModerationOrigin } from "@/lib/moderation";
import type { OriginSource } from "@/lib/origin-check";

export type RepairStatus = "pending" | "approved" | "rejected";

export type ModerationRepair = {
  id: string;
  category: string;
  brand_model: string | null;
  duration_minutes: number | null;
  item_value_euros: number | null;
  performed_by: string | null;
  story: string | null;
  image_alt_text: string | null;
  tags: string[];
  repair_succeeded: boolean;
  consent_publication: boolean;
  status: RepairStatus;
  location_region: string | null;
  /** Aufbereitete Herkunft samt Kartenposition, oder null ohne Ortsangabe. */
  origin: ModerationOrigin | null;
  moderator_comment: string | null;
  created_at: string;
  entry_time: string | null;
  imageUrl: string | null;
  /**
   * Wann das Bild nach einer Ablehnung geloescht wurde, sonst null (Issue #58).
   * Unterscheidet "hat nie eins mitgebracht" von "hatte eins, ist weg".
   */
  imageDeletedAt: string | null;
  /** Ende des Anspruchs einer Moderationssitzung, sonst null (Issue #38). */
  claimedUntil: string | null;
  /** Der Anspruch gehoert der eigenen Sitzung. */
  claimedByMe: boolean;
};

export type ModerationFilters = {
  status: RepairStatus;
  category: string;
  consent: "" | "yes" | "no";
  search: string;
  sort: "oldest" | "newest";
};

export type MetadataDraft = {
  category: string;
  imageAltText: string;
  tags: string;
  brandModel: string;
  durationMinutes: string;
  itemValueEuros: string;
  performedBy: string;
  story: string;
  repairSucceeded: boolean;
};

export const repairStatusLabels: Record<RepairStatus, string> = {
  pending: "Offen",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

export const performedByLabels: Record<string, string> = {
  alone: "Allein",
  with_support: "Gemeinsam mit Unterstützung",
  by_someone: "Hat jemand für mich repariert",
};

export function performedByLabel(value: string | null) {
  return (value && performedByLabels[value]) || "–";
}

/**
 * Wie die Ortsangabe zustande kam - absteigend nach Beweiskraft.
 *
 * Bewusst als Angabe formuliert und nicht als Tatsache: Der Wert kommt aus
 * dem Browser der einreichenden Person und laesst sich nicht nachpruefen.
 * Verifiziert ist nur, dass der Punkt auf einem Rasterzellpunkt liegt.
 */
export const originSourceLabels: Record<OriginSource, string> = {
  photo: "Foto mit Ortsangabe",
  gps: "Standortfreigabe im Browser",
  manual: "Kreis selbst ausgewählt",
  ip: "Nur aus der Internetverbindung",
};

export function originSourceLabel(source: OriginSource | null) {
  return source ? originSourceLabels[source] : "Unbekannt";
}

/**
 * Kurzer Hinweis fuer Liste und Schnellpruefung, oder null wenn alles stimmig
 * ist. Ein Hinweis ist kein Ablehnungsgrund - er sagt nur, dass hier ein Blick
 * auf die Herkunft lohnt.
 */
export function originWarning(repair: ModerationRepair): string | null {
  if (!repair.origin) return "Ohne Ortsangabe";
  if (repair.origin.outside) return "Herkunft außerhalb";
  if (repair.origin.mismatch) return "Verbindung woanders";
  return null;
}

/**
 * Was an der Stelle des Bildes steht, wenn keines da ist.
 *
 * Ohne Bild ist eine Einreichung nicht unvollstaendig - das Foto war schon
 * immer freiwillig, und seit Issue #58 verliert jede abgelehnte Einreichung
 * ihres. Beide Faelle sehen gleich aus und meinen etwas anderes.
 *
 * Seit Issue #49 kommt ein dritter dazu: Das Bild kann jederzeit einzeln
 * geloescht werden, etwa weil jemand darauf nicht mehr zu sehen sein moechte.
 * Woran es lag, steht nicht in der Datenbank - der Grund einer Loeschanfrage
 * ist selbst eine Angabe ueber die Person, die sich gemeldet hat. Der Status
 * reicht fuer die Unterscheidung, die die Moderation wirklich braucht: Bei
 * einer Ablehnung war es die Ablehnung, sonst war es ein eigener Handgriff.
 */
export function missingImageNote(repair: ModerationRepair) {
  if (!repair.imageDeletedAt) return "Kein Bild eingereicht";
  return repair.status === "rejected" ? "Bild mit der Ablehnung gelöscht" : "Bild nachträglich gelöscht";
}

export function draftFromRepair(repair: ModerationRepair): MetadataDraft {
  return {
    category: repair.category,
    imageAltText: repair.image_alt_text ?? "",
    tags: repair.tags.join(", "),
    brandModel: repair.brand_model ?? "",
    durationMinutes: repair.duration_minutes?.toString() ?? "",
    itemValueEuros: repair.item_value_euros?.toString() ?? "",
    performedBy: repair.performed_by ?? "",
    story: repair.story ?? "",
    repairSucceeded: repair.repair_succeeded,
  };
}

/**
 * Sitzt gerade jemand anderes an dieser Einreichung? Der Anspruch laeuft nach
 * einer Frist ab, deshalb zaehlt nicht sein Vorhandensein, sondern sein Ende
 * (Issue #38).
 */
export function isUnderReview(repair: ModerationRepair, now = Date.now()) {
  if (repair.status !== "pending" || repair.claimedByMe || !repair.claimedUntil) {
    return false;
  }
  return Date.parse(repair.claimedUntil) > now;
}

export function buildQuery(filters: ModerationFilters) {
  const params = new URLSearchParams({ status: filters.status, sort: filters.sort });
  if (filters.category) params.set("category", filters.category);
  if (filters.consent) params.set("consent", filters.consent);
  if (filters.search) params.set("q", filters.search);
  return params.toString();
}
