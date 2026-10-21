"use client";

import { FormEvent, useState } from "react";
import { repairCategories } from "@/lib/repair-catalog";
import { useJsonResource } from "@/lib/use-json-resource";

type Sheet = { id: string; cafe_name: string; address: string | null; event_date: string; kreis: string | null; repair_count: number; created_at: string };

function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

/**
 * Strichlisten von Repair-Cafes nachtragen (Issue #158).
 *
 * Manche Cafes zaehlen auf Papier. Hier wird die Liste abgeschrieben: Anzahl
 * je Kategorie, Ort und Tag. Jede Reparatur zaehlt danach sofort mit, ohne
 * Foto und ohne Platz in der Galerie. Mit Mail-Adresse nimmt jede Reparatur
 * als eigenes Los am Gewinnspiel teil - wie bei jeder Einreichung.
 */
export default function TallyPanel({ onStatus, onError }: { onStatus: (message: string) => void; onError: (message: string) => void }) {
  const { data, error, isLoading, reload } = useJsonResource<{ sheets: Sheet[] }>("/api/admin/tally-sheets", "Strichlisten konnten nicht geladen werden.");
  const [busy, setBusy] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [found, setFound] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [lottery, setLottery] = useState(false);
  const sheets = data?.sheets ?? [];
  const total = Object.values(counts).reduce((sum, value) => sum + (Number.parseInt(value, 10) || 0), 0);

  async function geocode() {
    setBusy("geocode");
    setFound("");
    try {
      const response = await fetch(`/api/admin/geocode?q=${encodeURIComponent(address)}`);
      const payload = await response.json().catch(() => ({})) as { error?: string; lat?: number; lon?: number; label?: string; kreis?: string | null };
      if (!response.ok || payload.lat === undefined || payload.lon === undefined) {
        onError(payload.error ?? "Die Adresse wurde nicht gefunden.");
        return;
      }
      setLat(String(payload.lat));
      setLon(String(payload.lon));
      setFound(`${payload.label} – ${payload.kreis ?? "außerhalb von NRW"}`);
    } finally {
      setBusy("");
    }
  }

  async function createSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (!window.confirm(`${total} Reparaturen von ${fields.get("cafeName")} eintragen? Sie zählen sofort mit.`)) return;

    setBusy("new");
    try {
      const response = await fetch("/api/admin/tally-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeName: fields.get("cafeName"),
          address,
          eventDate: fields.get("eventDate"),
          lat,
          lon,
          counts,
          lottery,
          lotteryName: fields.get("lotteryName"),
          lotteryEmail: fields.get("lotteryEmail"),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; total?: number; kreis?: string | null };
      if (!response.ok) {
        onError(payload.error ?? "Die Strichliste konnte nicht gespeichert werden.");
        return;
      }

      form.reset();
      setAddress("");
      setLat("");
      setLon("");
      setFound("");
      setCounts({});
      setLottery(false);
      onStatus(`${payload.total} Reparaturen wurden eingetragen${payload.kreis ? ` (${payload.kreis})` : ""}.`);
      reload();
    } finally {
      setBusy("");
    }
  }

  async function deleteSheet(sheet: Sheet) {
    if (!window.confirm(`Strichliste von ${sheet.cafe_name} mit ${sheet.repair_count} Reparaturen entfernen? Die Reparaturen und Lose verschwinden mit ihr.`)) return;
    setBusy(sheet.id);
    try {
      const response = await fetch(`/api/admin/tally-sheets?id=${encodeURIComponent(sheet.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        onError(payload.error ?? "Die Strichliste konnte nicht entfernt werden.");
        return;
      }
      onStatus(`Strichliste von ${sheet.cafe_name} wurde entfernt.`);
      reload();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="admin-stack">
      <section className="admin-card" aria-labelledby="tally-new-heading">
        <div className="admin-card-head"><h3 id="tally-new-heading">Strichliste nachtragen</h3></div>
        <p>Für Repair-Cafés, die auf Papier gezählt haben. Jede Reparatur zählt sofort für den Tag der Veranstaltung und im Kreis des Ortes, erscheint aber nicht in der Galerie.</p>

        <form className="tally-form" onSubmit={createSheet}>
          <label>Repair-Café<input name="cafeName" maxLength={160} required /></label>
          <label>Datum der Veranstaltung<input name="eventDate" type="date" max={today()} required /></label>

          <div className="tally-address">
            <label>Adresse<input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} placeholder="Straße, PLZ Ort" /></label>
            <button className="button button-secondary" type="button" disabled={busy !== "" || address.trim().length < 3} onClick={() => void geocode()}>{busy === "geocode" ? "Sucht ..." : "Adresse suchen"}</button>
          </div>
          <label>Breitengrad<input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" placeholder="51.256" required /></label>
          <label>Längengrad<input value={lon} onChange={(event) => setLon(event.target.value)} inputMode="decimal" placeholder="7.150" required /></label>
          <p className="tally-hint">{found ? `Gefunden: ${found}` : "Adresse suchen lassen (OpenStreetMap) oder Koordinaten selbst eintragen. Gespeichert wird auf rund 100 m gerundet."}</p>

          <fieldset className="tally-counts">
            <legend>Reparaturen je Kategorie <span>{total} insgesamt</span></legend>
            {repairCategories.map((category) => (
              <label key={category.value}>{category.label}
                <input
                  type="number"
                  min={0}
                  max={500}
                  inputMode="numeric"
                  value={counts[category.value] ?? ""}
                  onChange={(event) => setCounts((current) => ({ ...current, [category.value]: event.target.value }))}
                />
              </label>
            ))}
          </fieldset>

          <label className="choice"><input type="checkbox" checked={lottery} onChange={(event) => setLottery(event.target.checked)} /> Nimmt am Gewinnspiel teil – jede Reparatur ist ein Los, gewinnen kann die Adresse einmal.</label>
          {lottery && (
            <>
              <label>E-Mail-Adresse<input name="lotteryEmail" type="email" maxLength={254} required /></label>
              <label>Name für das Gewinnspiel<input name="lotteryName" maxLength={200} placeholder="Name des Cafés" /></label>
            </>
          )}

          <button className="button button-primary" type="submit" disabled={busy !== "" || total === 0}>{busy === "new" ? "Speichert ..." : `${total} Reparaturen eintragen`}</button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="tally-list-heading">
        <div className="admin-card-head"><h3 id="tally-list-heading">Eingetragene Strichlisten</h3><span className="section-index">{sheets.reduce((sum, sheet) => sum + sheet.repair_count, 0)} Reparaturen</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {isLoading ? <p className="queue-empty">Strichlisten werden geladen.</p> : (
          <div className="sortable-list">
            {sheets.length === 0 && <p className="queue-empty">Noch keine Strichlisten.</p>}
            {sheets.map((sheet) => (
              <div className="sortable-row" key={sheet.id}>
                <span className="sortable-title">
                  <strong>{sheet.cafe_name} · {sheet.repair_count} Reparaturen</strong>
                  <span>{new Date(`${sheet.event_date}T12:00:00Z`).toLocaleDateString("de-DE")} · {sheet.kreis ?? "ohne Kreis"}{sheet.address ? ` · ${sheet.address}` : ""}</span>
                </span>
                <button className="text-button" type="button" disabled={busy !== ""} onClick={() => void deleteSheet(sheet)}>Entfernen</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
