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
  moderator_comment: string | null;
  created_at: string;
  entry_time: string | null;
  imageUrl: string | null;
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
