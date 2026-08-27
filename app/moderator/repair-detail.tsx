"use client";

import { useState } from "react";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import MetadataFields from "./metadata-fields";
import RepairExif from "./repair-exif";
import {
  draftFromRepair,
  isUnderReview,
  performedByLabel,
  repairStatusLabels,
  type MetadataDraft,
  type ModerationRepair,
} from "./repair-types";

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
  const [draft, setDraft] = useState<MetadataDraft>(() => draftFromRepair(repair));

  return (
    <article className="repair-review">
      {repair.imageUrl
        // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
        ? <img src={repair.imageUrl} alt="Eingereichtes Reparaturbild" />
        : <div className="missing-image">Kein Bild eingereicht</div>}
      <div>
        <p className="section-index">{repairCategoryLabel(repair.category)} <span className={`status-chip is-${repair.status}`}>{repairStatusLabels[repair.status]}</span></p>
        <h3>{repair.brand_model || "Marke/Modell unbekannt"}</h3>
        {isUnderReview(repair) && <p className="moderator-comment">Diese Einreichung liegt gerade in einer anderen Schnellprüfung.</p>}
        {repair.story && <p>{repair.story}</p>}
        <dl>
          <div><dt>Eingang</dt><dd>{new Date(repair.entry_time ?? repair.created_at).toLocaleString("de-DE")}</dd></div>
          <div><dt>Durchgeführt</dt><dd>{performedByLabel(repair.performed_by)}</dd></div>
          <div><dt>Erfolg</dt><dd>{repair.repair_succeeded ? "Ja" : "Nein"}</dd></div>
          <div><dt>Veröffentlichung</dt><dd>{repair.consent_publication ? "Zugestimmt" : "Keine Zustimmung"}</dd></div>
          {repair.location_region && <div><dt>Region</dt><dd>{repair.location_region}</dd></div>}
          {repair.imageUrl && <RepairExif imageUrl={repair.imageUrl} />}
        </dl>
        <details className="metadata-editor">
          <summary>Metadaten bearbeiten</summary>
          <MetadataFields draft={draft} onChange={setDraft} />
          <button className="button button-secondary" type="button" onClick={() => void onSaveMetadata(repair.id, draft)}>Metadaten speichern</button>
        </details>
        {repair.status === "pending" && (
          <>
            <label className="comment-label">Moderationskommentar<textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} /></label>
            <div className="review-actions">
              <button className="button button-primary" type="button" onClick={() => void onDecide(repair.id, "approved", comment)} disabled={!repair.consent_publication}>Freigeben</button>
              <button className="button button-secondary" type="button" onClick={() => void onDecide(repair.id, "rejected", comment)}>Ablehnen</button>
            </div>
            {!repair.consent_publication && <p className="moderator-comment">Ohne Veröffentlichungszustimmung ist nur eine Ablehnung möglich.</p>}
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
