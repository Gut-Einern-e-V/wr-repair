"use client";

import { useState } from "react";
import { CategoryMotif } from "@/components/category-motif";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import MetadataFields from "./metadata-fields";
import OriginMap from "./origin-map";
import RepairExif from "./repair-exif";
import {
  draftFromRepair,
  isUnderReview,
  missingImageNote,
  originSignalRows,
  originSourceLabel,
  originWarning,
  performedByLabel,
  repairStatusLabels,
  type MetadataDraft,
  type ModerationRepair,
  type RepairStatus,
} from "./repair-types";

/**
 * Vollansicht einer Einreichung mit allen Pruefangaben, den Metadaten und den
 * Moderationsentscheidungen.
 */
export default function RepairDetail({
  repair,
  isAdmin,
  onDecide,
  onSaveMetadata,
  onDeleteImage,
  onDelete,
}: {
  repair: ModerationRepair;
  /** Admins und Superadmins duerfen eine Entscheidung wieder aufmachen (Issue #58). */
  isAdmin: boolean;
  onDecide: (repairId: string, status: RepairStatus, comment: string, deleteImage?: boolean) => Promise<void>;
  onSaveMetadata: (repairId: string, draft: MetadataDraft) => Promise<void>;
  /** Nur das Foto entfernen, die Reparatur behalten (Issue #49). */
  onDeleteImage: (repairId: string) => Promise<void>;
  onDelete: (repairId: string) => Promise<void>;
}) {
  const [comment, setComment] = useState(repair.moderator_comment ?? "");
  const [draft, setDraft] = useState<MetadataDraft>(() => draftFromRepair(repair));
  const warning = originWarning(repair);
  const signalRows = repair.origin ? originSignalRows(repair.origin) : [];

  return (
    <article className="repair-review">
      <div className="repair-image-column">
        {repair.imageUrl
          // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
          ? <img src={repair.imageUrl} alt="Eingereichtes Reparaturbild" />
          : <div className="missing-image">
              <CategoryMotif category={repair.category} size={96} />
              <span>{missingImageNote(repair)}</span>
            </div>}
        {/* Fotos werden bewusst nicht verpixelt - wir wollen die stolzen
            Reparateur*innen zeigen. Wer darauf nicht (mehr) zu sehen sein
            moechte, bekommt deshalb keine Weichzeichnung, sondern die
            Loeschung des Bildes. Die Reparatur zaehlt weiter (Issue #49). */}
        {repair.imageUrl && (
          <>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                if (window.confirm("Nur das Foto löschen? Die Reparatur bleibt erhalten und zählt weiter. Das Bild ist danach endgültig weg.")) {
                  void onDeleteImage(repair.id);
                }
              }}
            >
              Foto löschen
            </button>
            <small className="image-action-hint">Für Löschwünsche zu erkennbaren Personen – und um eine Reparatur ohne ihr Foto freizugeben.</small>
          </>
        )}
      </div>
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

        {/* Herkunft als eigener Block statt als weitere Zeile in der Liste:
            Ob eine Einreichung wirklich aus dem Land kommt, entscheidet sich
            aus dem Zusammenspiel von Ortsangabe, ihrer Quelle und der
            Verbindung - das laesst sich einzeln aufgezaehlt schlecht lesen. */}
        <section className={`origin-review${warning ? " has-warning" : ""}`} aria-labelledby={`origin-${repair.id}`}>
          <h4 id={`origin-${repair.id}`}>Herkunft {warning && <span className="status-chip is-pending">{warning}</span>}</h4>
          {repair.origin ? (
            <>
              <OriginMap origin={repair.origin} />
              <dl>
                <div><dt>Kreis</dt><dd>{repair.origin.kreis ?? "Außerhalb des Landes"}</dd></div>
                <div><dt>Angegebene Quelle</dt><dd>{originSourceLabel(repair.origin.source)}</dd></div>
                <div><dt>Verbindung</dt><dd>{repair.origin.ipRegion ?? "Unbekannt"}</dd></div>
                <div>
                  <dt>Zelle</dt>
                  <dd>
                    <a href={`https://www.openstreetmap.org/?mlat=${repair.origin.lat}&mlon=${repair.origin.lon}&zoom=11`} target="_blank" rel="noopener noreferrer">
                      {repair.origin.lat.toFixed(3)}, {repair.origin.lon.toFixed(3)}
                    </a>
                  </dd>
                </div>
              </dl>
              {/* Die einzelnen Angaben, wenn sie auseinandergehen (Issue #87).
                  Vorher stand hier nur die eine gespeicherte Zelle - bei einer
                  manuellen Kreis-Auswahl also der angeklickte Kreis, und der
                  sieht auf der Karte aus wie ein Beleg. Die Nummern entsprechen
                  den Punkten auf der Karte darueber. */}
              {signalRows.length > 0 && (
                <div className="origin-signals">
                  <h5>Die Angaben gehen auseinander</h5>
                  <ol>
                    {signalRows.map((row) => (
                      <li key={row.number} className={row.used ? "is-used" : undefined}>
                        <span className="origin-signal-number" aria-hidden="true">{row.number}</span>
                        <span className="origin-signal-source">{row.label}{row.used && <em> – gespeichert</em>}</span>
                        <span className="origin-signal-kreis">{row.kreis ?? "Außerhalb des Landes"}</span>
                        <a
                          className="origin-signal-point"
                          href={`https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lon}&zoom=11`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {row.lat.toFixed(3)}, {row.lon.toFixed(3)}
                        </a>
                      </li>
                    ))}
                  </ol>
                  <p className="moderator-comment">
                    Gespeichert wird die Angabe mit der höchsten Beweiskraft, die im Land liegt. Die übrigen stehen hier,
                    weil sie etwas anderes sagen. Jeder Punkt ist um bis zu 1 km zufällig verschoben, ein Kreis wird über
                    seine Fläche gestreut – die Abstände sind also nicht auf den Meter zu lesen, wohl aber die Frage,
                    ob es derselbe Kreis ist.
                  </p>
                </div>
              )}
              {repair.origin.mismatch && (
                <p className="moderator-comment">
                  Die Verbindung kam aus einer anderen Gegend als die Ortsangabe. Das ist kein Ablehnungsgrund –
                  wer unterwegs oder im Urlaub einträgt, landet regelmäßig hier. Die angegebene Quelle sagt, wie
                  belastbar die Ortsangabe ist.
                </p>
              )}
            </>
          ) : (
            <p className="moderator-comment">Zu dieser Einreichung liegt keine Ortsangabe vor. Sie zählt für den Rekord, taucht aber nicht auf der Karte auf.</p>
          )}
        </section>
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
              {/* Die Reparatur stimmt, das Foto soll nicht oeffentlich werden:
                  eine eigene Entscheidung statt Loeschen und danach Freigeben
                  (Issue #49). Der Server loescht das Bild vor der Freigabe -
                  zwei Aufrufe haetten es dazwischen sichtbar gemacht. */}
              {repair.imageUrl && repair.consent_publication && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    if (window.confirm("Ohne Foto freigeben? Die Reparatur zählt für den Rekord, das Bild wird endgültig gelöscht.")) {
                      void onDecide(repair.id, "approved", comment, true);
                    }
                  }}
                >
                  Ohne Foto freigeben
                </button>
              )}
              <button className="button button-secondary" type="button" onClick={() => void onDecide(repair.id, "rejected", comment)}>Ablehnen</button>
            </div>
            {!repair.consent_publication && <p className="moderator-comment">Ohne Veröffentlichungszustimmung ist nur eine Ablehnung möglich.</p>}
          </>
        )}
        {/* Eine Ablehnung ist keine Sackgasse: Wer sich beschwert, kann von der
            Administration wieder eingesetzt werden. Das Bild ist dann geloescht,
            die Reparatur zaehlt aber (Issue #58). */}
        {isAdmin && repair.status !== "pending" && (
          <div className="reopen-actions">
            <p className="moderator-comment">
              {repair.status === "rejected"
                ? "Diese Einreichung wurde abgelehnt. Du kannst sie zurück in die Prüfung holen oder direkt freigeben – das gelöschte Bild kommt dabei nicht zurück."
                : "Diese Einreichung ist freigegeben. Du kannst sie zurück in die Prüfung holen; sie zählt dann vorerst nicht mehr."}
            </p>
            <label className="comment-label">Moderationskommentar<textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} /></label>
            <div className="review-actions">
              <button className="button button-secondary" type="button" onClick={() => void onDecide(repair.id, "pending", comment)}>Zurück in die Prüfung</button>
              {repair.status === "rejected" && (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!repair.consent_publication}
                  title={repair.consent_publication ? "Ohne Umweg über die Warteschlange freigeben" : "Ohne Veröffentlichungszustimmung nicht möglich"}
                  onClick={() => void onDecide(repair.id, "approved", comment)}
                >
                  Doch freigeben
                </button>
              )}
            </div>
          </div>
        )}
        {repair.moderator_comment && <p className="moderator-comment">Kommentar: {repair.moderator_comment}</p>}
        <div className="review-actions">
          <button className="button button-secondary" type="button" onClick={() => { if (window.confirm("Einreichung endgültig löschen?")) void onDelete(repair.id); }}>Löschen</button>
        </div>
      </div>
    </article>
  );
}
