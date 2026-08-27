export type RepairStatus = "pending" | "approved" | "rejected";

export type ModerationRepair = {
  id: string;
  category: string;
  brand_model: string | null;
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
};

export type ModerationFilters = {
  status: RepairStatus;
  category: string;
  consent: "" | "yes" | "no";
  search: string;
  sort: "oldest" | "newest";
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

export function buildQuery(filters: ModerationFilters) {
  const params = new URLSearchParams({ status: filters.status, sort: filters.sort });
  if (filters.category) params.set("category", filters.category);
  if (filters.consent) params.set("consent", filters.consent);
  if (filters.search) params.set("q", filters.search);
  return params.toString();
}
