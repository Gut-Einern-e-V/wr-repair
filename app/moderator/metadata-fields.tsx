"use client";

import { repairCategories } from "@/lib/repair-catalog";
import { performedByLabels, type MetadataDraft } from "./repair-types";

/**
 * Die bearbeitbaren Angaben einer Einreichung. Dieselben Felder in der
 * Vollansicht und in der Schnellpruefung - dort war das Nachbessern einer
 * schiefen Angabe vorher nur ueber den Umweg Tabelle moeglich (Issue #38).
 */
export default function MetadataFields({ draft, onChange }: { draft: MetadataDraft; onChange: (draft: MetadataDraft) => void }) {
  return (
    <div className="metadata-fields">
      <label>Kategorie
        <select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })}>
          {repairCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>Bildbeschreibung<input value={draft.imageAltText} maxLength={250} onChange={(event) => onChange({ ...draft, imageAltText: event.target.value })} /></label>
      <label>Tags, mit Komma getrennt<input value={draft.tags} onChange={(event) => onChange({ ...draft, tags: event.target.value })} /></label>
      <label>Marke/Modell<input value={draft.brandModel} maxLength={200} onChange={(event) => onChange({ ...draft, brandModel: event.target.value })} /></label>
      <label>Dauer in Minuten<input type="number" inputMode="numeric" min={1} max={9999} value={draft.durationMinutes} onChange={(event) => onChange({ ...draft, durationMinutes: event.target.value })} /></label>
      <label>Warenwert in Euro<input type="number" inputMode="decimal" min={0} max={999999} step="0.01" value={draft.itemValueEuros} onChange={(event) => onChange({ ...draft, itemValueEuros: event.target.value })} /></label>
      <label>Durchgeführt von
        <select value={draft.performedBy} onChange={(event) => onChange({ ...draft, performedBy: event.target.value })}>
          <option value="">–</option>
          {Object.entries(performedByLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Reparaturgeschichte<textarea value={draft.story} maxLength={2000} onChange={(event) => onChange({ ...draft, story: event.target.value })} /></label>
      {/* Das Haeckchen entscheidet ueber den Rekord, nicht ueber die Freigabe:
          Nur gelungene Reparaturen zaehlen mit (Issue #77). Ohne diesen Satz
          sieht es aus wie eine reine Angabe zur Statistik. */}
      <label>Reparatur erfolgreich<input type="checkbox" checked={draft.repairSucceeded} onChange={(event) => onChange({ ...draft, repairSucceeded: event.target.checked })} /></label>
      <p className="metadata-hint">Nur gelungene Reparaturen zählen für den Rekord. Ein Versuch ohne Häkchen bleibt freigegeben, erscheint aber nicht im Rekordstand.</p>
    </div>
  );
}
