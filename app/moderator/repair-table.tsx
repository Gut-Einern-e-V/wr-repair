"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryPictogram } from "@/components/category-pictogram";
import { repairCategories, repairCategoryLabel } from "@/lib/repair-catalog";
import { useJsonResource } from "@/lib/use-json-resource";
import { decideRepair, deleteRepair, deleteRepairImage, saveRepairMetadata } from "./moderation-api";
import RepairDetail from "./repair-detail";
import {
  buildQuery,
  isUnderReview,
  missingImageNote,
  repairStatusLabels,
  type MetadataDraft,
  type ModerationFilters,
  type ModerationRepair,
  type RepairStatus,
  originWarning,
} from "./repair-types";

type LoadResponse = { repairs: ModerationRepair[]; counts: Record<string, number> | null; truncated: boolean };

const emptyFilters: ModerationFilters = { status: "pending", category: "", consent: "", search: "", sort: "oldest" };

const decisionNotices: Record<RepairStatus, string> = {
  approved: "Einreichung wurde freigegeben.",
  rejected: "Einreichung wurde abgelehnt.",
  pending: "Einreichung liegt wieder in der Warteschlange.",
};

/**
 * Listenpruefung: filterbare Uebersicht mit Vollansicht. Freigeben geht direkt
 * aus der Zeile, ohne die Einreichung erst aufzuklappen (Issue #38); Ablehnen
 * bleibt der Vollansicht vorbehalten, weil dabei das Bild geloescht wird.
 */
export default function RepairTable({ isAdmin }: { isAdmin: boolean }) {
  const [filters, setFilters] = useState<ModerationFilters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
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

  async function decide(repairId: string, status: RepairStatus, comment: string, deleteImage = false) {
    setBusyId(repairId);
    setNotice("");
    setActionError("");

    try {
      const result = await decideRepair(repairId, status, comment, deleteImage);

      if (!result.ok && !result.conflict) {
        setActionError(result.error);
        return;
      }

      setNotice(result.ok
        ? (deleteImage ? "Einreichung wurde ohne Foto freigegeben. Das Bild ist gelöscht." : decisionNotices[status])
        : result.error);
      if (result.ok && result.data.imageDeleted === false) {
        setActionError("Die Einreichung wurde abgelehnt, aber das Bild muss noch manuell gelöscht werden.");
      }

      // Die entschiedene Zeile verschwindet sofort - auch bei 409, denn dann
      // hat sie jemand anderes entschieden und sie gehoert nicht mehr hierher.
      patch((current) => {
        // Der bisherige Stand ist der Filter der Liste; genau dort geht die
        // Einreichung weg. Frueher stand hier fest "pending", was seit der
        // Rueckholung nicht mehr stimmt (Issue #58).
        const previous = filters.status;
        return {
          ...current,
          repairs: current.repairs.filter((repair) => repair.id !== repairId),
          counts: current.counts && result.ok
            ? { ...current.counts, [previous]: Math.max((current.counts[previous] ?? 0) - 1, 0), [status]: (current.counts[status] ?? 0) + 1 }
            : current.counts,
        };
      });
      setSelectedId((current) => (current === repairId ? null : current));
    } finally {
      setBusyId(null);
    }
  }

  async function saveMetadata(repairId: string, draft: MetadataDraft) {
    setNotice("");
    setActionError("");
    const result = await saveRepairMetadata(repairId, draft);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setNotice("Metadaten wurden aktualisiert.");
    reload();
  }

  /**
   * Nur das Foto entfernen (Issue #49). Die Liste wird danach neu geladen -
   * die Einreichung bleibt in ihr, sie hat ab jetzt nur kein Bild mehr.
   */
  async function removeImage(repairId: string) {
    setNotice("");
    setActionError("");
    const result = await deleteRepairImage(repairId);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setNotice("Das Foto wurde gelöscht. Die Reparatur bleibt erhalten und zählt weiter.");
    reload();
  }

  async function removeRepair(repairId: string) {
    setNotice("");
    setActionError("");
    const result = await deleteRepair(repairId);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setNotice("Einreichung wurde endgültig gelöscht.");
    patch((current) => ({ ...current, repairs: current.repairs.filter((repair) => repair.id !== repairId) }));
    setSelectedId(null);
  }

  const selected = repairs.find((repair) => repair.id === selectedId) ?? null;

  return (
    <>
      <div className="moderation-filters">
        <label className="filter-label">Status
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as RepairStatus })}>
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
            <option value="oldest">Älteste zuerst</option>
            <option value="newest">Neueste zuerst</option>
          </select>
        </label>
        <label className="filter-label filter-search">Suche in Marke und Geschichte
          <input type="search" value={search} placeholder="z. B. Toaster" maxLength={120} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button className="text-button" type="button" onClick={() => { setSearch(""); setFilters(emptyFilters); }}>Filter zurücksetzen</button>
      </div>

      {isAdmin && counts && <p className="queue-counts">Offen: {counts.pending} · Freigegeben: {counts.approved} · Abgelehnt: {counts.rejected}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {isLoading ? <p className="queue-empty">Einreichungen werden geladen.</p> : repairs.length === 0 ? (
        <p className="queue-empty">Keine Einreichungen für diese Filter.</p>
      ) : (
        <>
          <div className="moderation-table-wrap">
            <table className="moderation-table">
              <thead>
                <tr><th scope="col">Bild</th><th scope="col">Einreichung</th><th scope="col">Eingang</th><th scope="col">Region</th><th scope="col">Zustimmung</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Aktionen</span></th></tr>
              </thead>
              <tbody>
                {repairs.map((repair) => (
                  <tr key={repair.id} className={repair.id === selectedId ? "is-selected" : ""}>
                    <td>{repair.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
                      ? <img className="table-thumb" src={repair.imageUrl} alt="" />
                      : <span className="table-thumb is-empty" title={missingImageNote(repair)}><CategoryPictogram category={repair.category} /></span>}</td>
                    <td><strong>{repair.brand_model || "Marke/Modell unbekannt"}</strong><span className="table-sub">{repairCategoryLabel(repair.category)}</span></td>
                    <td>{new Date(repair.entry_time ?? repair.created_at).toLocaleString("de-DE")}</td>
                    <td>
                      {repair.origin?.kreis ?? repair.location_region ?? "–"}
                      {originWarning(repair) && <span className="table-sub is-warning">{originWarning(repair)}</span>}
                    </td>
                    <td>{repair.consent_publication ? "Ja" : "Nein"}</td>
                    <td>
                      <span className={`status-chip is-${repair.status}`}>{repairStatusLabels[repair.status]}</span>
                      {isUnderReview(repair) && <span className="status-chip is-claimed">In Prüfung</span>}
                    </td>
                    <td className="table-actions">
                      {repair.status === "pending" && (
                        <button
                          className="quick-accept"
                          type="button"
                          disabled={!repair.consent_publication || busyId === repair.id}
                          title={repair.consent_publication ? "Ohne Kommentar sofort freigeben" : "Ohne Veröffentlichungszustimmung nicht möglich"}
                          onClick={() => void decide(repair.id, "approved", "")}
                        >
                          Freigeben
                        </button>
                      )}
                      {isAdmin && repair.status === "rejected" && (
                        <button
                          className="quick-accept"
                          type="button"
                          disabled={busyId === repair.id}
                          title="Zurück in die Warteschlange holen"
                          onClick={() => void decide(repair.id, "pending", "")}
                        >
                          Zurückholen
                        </button>
                      )}
                      <button className="text-button" type="button" onClick={() => setSelectedId(repair.id === selectedId ? null : repair.id)}>{repair.id === selectedId ? "Schließen" : "Prüfen"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.truncated && <p className="form-notice">Es werden höchstens 100 Einreichungen gleichzeitig angezeigt. Grenze die Filter weiter ein.</p>}
          {selected && (
            <RepairDetail
              repair={selected}
              isAdmin={isAdmin}
              onDecide={(repairId, status, comment, deleteImage) => decide(repairId, status, comment, deleteImage)}
              onSaveMetadata={saveMetadata}
              onDeleteImage={removeImage}
              onDelete={removeRepair}
            />
          )}
        </>
      )}
    </>
  );
}
