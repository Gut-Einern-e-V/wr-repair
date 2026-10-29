"use client";

import { useEffect, useState } from "react";
import { DUPLICATE_SUSPECT_TAG, CAPTCHA_REJECTED_TAG, RECOVERED_TAG, submissionWarnings } from "@/lib/submission-tags";
import { repairStatusLabels, type ModerationRepair, type RepairStatus } from "./repair-types";

type SimilarRepair = { id: string; brand_model: string | null; created_at: string; status: RepairStatus; kreis: string | null };

/** Bei diesen Tags lohnt der Blick auf aehnliche Einreichungen. */
const comparedTags = [DUPLICATE_SUSPECT_TAG, CAPTCHA_REJECTED_TAG, RECOVERED_TAG];

/**
 * Hinweis auf eine moegliche Doppeleinreichung (Issue #167), mit den
 * Einreichungen, die nach derselben Reparatur aussehen.
 */
export default function SubmissionWarning({ repair }: { repair: ModerationRepair }) {
  const warnings = submissionWarnings(repair.tags);
  const compare = repair.tags.some((tag) => comparedTags.includes(tag));
  const [similar, setSimilar] = useState<{ repairId: string; rows: SimilarRepair[] } | null>(null);

  useEffect(() => {
    if (!compare) return;
    let cancelled = false;
    fetch(`/api/moderation/repairs/${repair.id}/similar`)
      .then((response) => response.ok ? response.json() as Promise<{ similar: SimilarRepair[] }> : null)
      .then((payload) => { if (!cancelled && payload) setSimilar({ repairId: repair.id, rows: payload.similar }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [compare, repair.id]);

  if (!warnings.length) return null;
  const rows = similar?.repairId === repair.id ? similar.rows : null;

  return (
    <section className="submission-warning" role="note">
      {warnings.map((warning) => (
        <div key={warning.tag}>
          <h4>{warning.title}</h4>
          <p>{warning.text}</p>
        </div>
      ))}
      {compare && rows && (
        rows.length === 0 ? (
          <p className="submission-warning-similar">Keine ähnliche Einreichung (gleiche Kategorie, gleiches Gerät, ±3 Tage) gefunden.</p>
        ) : (
          <div className="submission-warning-similar">
            <h5>Ähnliche Einreichungen</h5>
            <ul>
              {rows.map((row) => (
                <li key={row.id}>
                  {row.brand_model ?? "Ohne Gerät"} · {new Date(row.created_at).toLocaleString("de-DE")}
                  {row.kreis ? ` · ${row.kreis}` : ""} · <span className={`status-chip is-${row.status}`}>{repairStatusLabels[row.status]}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </section>
  );
}
