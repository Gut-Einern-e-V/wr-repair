"use client";

import { useState } from "react";
import { repairCategories, repairCategoryLabel } from "@/lib/repair-catalog";
import RepairExif from "./repair-exif";
import { performedByLabel, repairStatusLabels, type ModerationRepair } from "./repair-types";

export type MetadataDraft = { category: string; imageAltText: string; tags: string };

/**
 * Vollansicht einer Einreichung mit allen Pruefangaben, den Metadaten und den
 * Moderationsentscheidungen.
 */
export default function RepairDetail({
  repair,
  onDecide,
  onSaveMetadata,
  onDelete,
}: {
  repair: ModerationRepair;
  onDecide: (repairId: string, status: "approved" | "rejected", comment: string) => Promise<void>;
  onSaveMetadata: (repairId: string, draft: MetadataDraft) => Promise<void>;
  onDelete: (repairId: string) => Promise<void>;
}) {
  const [comment, setComment] = useState(repair.moderator_comment ?? "");
  const [draft, setDraft] = useState<MetadataDraft>({
    category: repair.category,
    imageAltText: repair.image_alt_text ?? "",
    tags: repair.tags.join(", "),
  });

  return (
    <article className="repair-review">
      {repair.imageUrl
        // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
        ? <img src={repair.imageUrl} alt="Eingereichtes Reparaturbild" />
        : <div className="missing-image">Kein Bild eingereicht</div>}
      <div>
        <p className="section-index">{repairCategoryLabel(repair.category)} <span className={`status-chip is-${repair.status}`}>{repairStatusLabels[repair.status]}</span></p>
        <h3>{repair.brand_model || "Marke/Modell unbekannt"}</h3>
        {repair.story && <p>{repair.story}</p>}
        <dl>
          <div><dt>Eingang</dt><dd>{new Date(repair.entry_time ?? repair.created_at).toLocaleString("de-DE")}</dd></div>
          <div><dt>Durchgeführt</dt><dd>{performedByLabel(repair.performed_by)}</dd></div>
          <div><dt>Erfolg</dt><dd>{repair.repair_succeeded ? "Ja" : "Nein"}</dd></div>
          <div><dt>Veroeffentlichung</dt><dd>{repair.consent_publication ? "Zugestimmt" : "Keine Zustimmung"}</dd></div>
          {repair.location_region && <div><dt>Region</dt><dd>{repair.location_region}</dd></div>}
          {repair.imageUrl && <RepairExif imageUrl={repair.imageUrl} />}
        </dl>
        <details className="metadata-editor">
          <summary>Metadaten bearbeiten</summary>
          <div className="metadata-fields">
            <label>Kategorie
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                {repairCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>Bildbeschreibung<input value={draft.imageAltText} maxLength={250} onChange={(event) => setDraft({ ...draft, imageAltText: event.target.value })} /></label>
            <label>Tags, mit Komma getrennt<input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} /></label>
          </div>
          <button className="button button-secondary" type="button" onClick={() => void onSaveMetadata(repair.id, draft)}>Metadaten speichern</button>
        </details>
        {repair.status === "pending" && (
          <>
            <label className="comment-label">Moderationskommentar<textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} /></label>
            <div className="review-actions">
              <button className="button button-primary" type="button" onClick={() => void onDecide(repair.id, "approved", comment)} disabled={!repair.consent_publication}>Freigeben</button>
              <button className="button button-secondary" type="button" onClick={() => void onDecide(repair.id, "rejected", comment)}>Ablehnen</button>
            </div>
            {!repair.consent_publication && <p className="moderator-comment">Ohne Veroeffentlichungszustimmung ist nur eine Ablehnung moeglich.</p>}
          </>
        )}
        {repair.moderator_comment && <p className="moderator-comment">Kommentar: {repair.moderator_comment}</p>}
        <div className="review-actions">
          <button className="button button-secondary" type="button" onClick={() => { if (window.confirm("Einreichung endgültig löschen?")) void onDelete(repair.id); }}>Löschen</button>
        </div>
      </div>
    </article>
  );
}
