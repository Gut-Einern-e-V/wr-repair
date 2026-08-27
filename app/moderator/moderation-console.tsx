"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BackendHeader from "@/components/backend-header";
import { repairCategories, repairCategoryLabel } from "@/lib/repair-catalog";
import { useJsonResource } from "@/lib/use-json-resource";
import QuickReview from "./quick-review";
import RepairDetail, { type MetadataDraft } from "./repair-detail";
import { buildQuery, repairStatusLabels, type ModerationFilters, type ModerationRepair, type RepairStatus } from "./repair-types";

type Role = "moderator" | "admin" | "superadmin";
type LoadResponse = { repairs: ModerationRepair[]; counts: Record<string, number> | null; truncated: boolean };

const emptyFilters: ModerationFilters = { status: "pending", category: "", consent: "", search: "", sort: "oldest" };

/**
 * Das Moderationsbackend kennt nur Einreichungen: eine filterbare Tabelle und
 * die Schnellpruefung. Alles Administrative liegt unter /admin (Issue #10).
 */
export default function ModerationConsole({ email, roles, logoUrl }: { email: string; roles: Role[]; logoUrl: string | null }) {
  const isAdmin = roles.some((role) => ["admin", "superadmin"].includes(role));
  const [view, setView] = useState<"table" | "quick">("table");
  const [filters, setFilters] = useState<ModerationFilters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState("");

  // Die Suche laeuft erst nach einer Tippause los, damit jede Taste keine
  // Abfrage ausloest.
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => (current.search === search ? current : { ...current, search })), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const url = useMemo(() => `/api/moderation/repairs?${buildQuery(filters)}`, [filters]);
  const { data, error: loadError, isLoading, reload, patch } = useJsonResource<LoadResponse>(url, "Einreichungen konnten nicht geladen werden.");
  const repairs = data?.repairs ?? [];
  const counts = data?.counts ?? null;
  const error = actionError || loadError;

  const decide = useCallback(async (repairId: string, nextStatus: "approved" | "rejected", comment: string) => {
    setIsBusy(true);
    setStatus("");
    setActionError("");

    try {
      const response = await fetch(`/api/moderation/repairs/${repairId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, moderatorComment: comment }),
      });
      const payload = await response.json() as { error?: string; imageDeleted?: boolean };

      if (!response.ok) {
        setActionError(payload.error ?? "Moderationsentscheidung konnte nicht gespeichert werden.");
        return;
      }

      setStatus(nextStatus === "approved" ? "Einreichung wurde freigegeben." : "Einreichung wurde abgelehnt.");
      if (payload.imageDeleted === false) {
        setActionError("Die Einreichung wurde abgelehnt, aber das Bild muss noch manuell geloescht werden.");
      }

      // Die entschiedene Karte verschwindet sofort, damit die Schnellpruefung
      // ohne Nachladen weiterlaeuft.
      patch((current) => ({
        ...current,
        repairs: current.repairs.filter((repair) => repair.id !== repairId),
        counts: current.counts
          ? { ...current.counts, pending: Math.max(current.counts.pending - 1, 0), [nextStatus]: (current.counts[nextStatus] ?? 0) + 1 }
          : current.counts,
      }));
      setSelectedId((current) => (current === repairId ? null : current));
    } finally {
      setIsBusy(false);
    }
  }, [patch]);

  async function saveMetadata(repairId: string, draft: MetadataDraft) {
    setStatus("");
    setActionError("");
    const response = await fetch(`/api/moderation/repairs/${repairId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: { ...draft, tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean) },
      }),
    });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      setActionError(payload.error ?? "Die Metadaten konnten nicht gespeichert werden.");
      return;
    }

    setStatus("Metadaten wurden aktualisiert.");
    reload();
  }

  async function deleteRepair(repairId: string) {
    setStatus("");
    setActionError("");
    const response = await fetch(`/api/moderation/repairs/${repairId}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      setActionError(payload.error ?? "Einreichung konnte nicht geloescht werden.");
      return;
    }

    setStatus("Einreichung wurde endgueltig geloescht.");
    patch((current) => ({ ...current, repairs: current.repairs.filter((repair) => repair.id !== repairId) }));
    setSelectedId(null);
  }

  const selected = repairs.find((repair) => repair.id === selectedId) ?? null;

  return (
    <main className="moderator-shell">
      <BackendHeader area="moderation" email={email} logoUrl={logoUrl} canAdminister={isAdmin} />
      <section className="moderator-intro">
        <p className="brand-kicker">Moderation</p>
        <h1 className="sticker-head is-mint"><span className="sticker">Einreichungen</span><span className="sticker">pruefen</span></h1>
        <p className="moderator-lead">Bild, Beschreibung und Zustimmung pruefen, dann freigeben oder ablehnen.{isAdmin && counts ? ` Offen: ${counts.pending}.` : ""}</p>
      </section>

      <section className="repair-queue" aria-labelledby="repair-queue-heading">
        <div className="section-heading">
          <div><p className="section-index">Ansicht</p><h2 id="repair-queue-heading">{view === "table" ? "Tabelle" : "Schnellpruefung"}</h2></div>
          <div className="view-switch" role="group" aria-label="Ansicht wechseln">
            <button className={`button ${view === "table" ? "button-primary" : "button-secondary"}`} type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Tabelle</button>
            <button className={`button ${view === "quick" ? "button-primary" : "button-secondary"}`} type="button" aria-pressed={view === "quick"} onClick={() => { setView("quick"); setFilters({ ...filters, status: "pending" }); }}>Schnellpruefung</button>
          </div>
        </div>

        <div className="moderation-filters">
          <label className="filter-label">Status
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as RepairStatus })} disabled={view === "quick"}>
              {(Object.keys(repairStatusLabels) as RepairStatus[]).map((value) => <option key={value} value={value}>{repairStatusLabels[value]}</option>)}
            </select>
          </label>
          <label className="filter-label">Kategorie
            <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="">Alle</option>
              {repairCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="filter-label">Zustimmung
            <select value={filters.consent} onChange={(event) => setFilters({ ...filters, consent: event.target.value as ModerationFilters["consent"] })}>
              <option value="">Alle</option>
              <option value="yes">Liegt vor</option>
              <option value="no">Fehlt</option>
            </select>
          </label>
          <label className="filter-label">Reihenfolge
            <select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as ModerationFilters["sort"] })}>
              <option value="oldest">Aelteste zuerst</option>
              <option value="newest">Neueste zuerst</option>
            </select>
          </label>
          <label className="filter-label filter-search">Suche in Marke und Geschichte
            <input type="search" value={search} placeholder="z. B. Toaster" maxLength={120} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button className="text-button" type="button" onClick={() => { setSearch(""); setFilters(emptyFilters); }}>Filter zuruecksetzen</button>
        </div>

        {status && <p className="form-notice" role="status">{status}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {isLoading ? <p className="queue-empty">Einreichungen werden geladen.</p> : view === "quick" ? (
          <QuickReview repairs={repairs} showProgress={isAdmin} isBusy={isBusy} onDecide={decide} />
        ) : repairs.length === 0 ? (
          <p className="queue-empty">Keine Einreichungen fuer diese Filter.</p>
        ) : (
          <>
            <div className="moderation-table-wrap">
              <table className="moderation-table">
                <thead>
                  <tr><th scope="col">Bild</th><th scope="col">Einreichung</th><th scope="col">Eingang</th><th scope="col">Region</th><th scope="col">Zustimmung</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Aktion</span></th></tr>
                </thead>
                <tbody>
                  {repairs.map((repair) => (
                    <tr key={repair.id} className={repair.id === selectedId ? "is-selected" : ""}>
                      <td>{repair.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
                        ? <img className="table-thumb" src={repair.imageUrl} alt="" />
                        : <span className="table-thumb is-empty" aria-label="Kein Bild" />}</td>
                      <td><strong>{repair.brand_model || "Marke/Modell unbekannt"}</strong><span className="table-sub">{repairCategoryLabel(repair.category)}</span></td>
                      <td>{new Date(repair.entry_time ?? repair.created_at).toLocaleString("de-DE")}</td>
                      <td>{repair.location_region ?? "–"}</td>
                      <td>{repair.consent_publication ? "Ja" : "Nein"}</td>
                      <td><span className={`status-chip is-${repair.status}`}>{repairStatusLabels[repair.status]}</span></td>
                      <td><button className="text-button" type="button" onClick={() => setSelectedId(repair.id === selectedId ? null : repair.id)}>{repair.id === selectedId ? "Schliessen" : "Pruefen"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data?.truncated && <p className="form-notice">Es werden hoechstens 100 Einreichungen gleichzeitig angezeigt. Grenze die Filter weiter ein.</p>}
            {selected && <RepairDetail repair={selected} onDecide={decide} onSaveMetadata={saveMetadata} onDelete={deleteRepair} />}
          </>
        )}
      </section>
    </main>
  );
}
