"use client";

import { FormEvent, useState } from "react";

export type RegionSettings = {
  enabled: boolean;
  label: string;
  ipCountry: string;
  ipRegion: string;
  latMin: number | null;
  latMax: number | null;
  lonMin: number | null;
  lonMax: number | null;
};

export type AdminSettings = {
  startAt: string | null;
  endAt: string | null;
  windowStatus: "before" | "open" | "after" | "invalid";
  recordGoal: number;
  /** Bisher hoechster Tagesstand; null heisst: nicht hinterlegt. */
  dayRecord: number | null;
  region: RegionSettings;
  logoUrl: string | null;
  persisted: boolean;
  stored: { window: boolean; recordGoal: boolean; dayRecord: boolean; region: boolean; logo: boolean };
};

const windowStatusLabels = { before: "Noch nicht gestartet", open: "Laeuft", after: "Beendet", invalid: "Nicht konfiguriert" } as const;

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Zeitrahmen, Zielzahl, Gebiet und Logo. Jede Karte speichert einzeln, damit ein
 * Tippfehler im Gebiet nicht den Zeitrahmen blockiert.
 */
export default function CampaignPanel({
  settings,
  onSaved,
  onStatus,
  onError,
}: {
  settings: AdminSettings;
  onSaved: (next: Partial<AdminSettings>) => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [startAt, setStartAt] = useState(toLocalInput(settings.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(settings.endAt));
  const [goal, setGoal] = useState(String(settings.recordGoal));
  const [dayRecord, setDayRecord] = useState(settings.dayRecord?.toString() ?? "");
  const [region, setRegion] = useState(settings.region);
  const [box, setBox] = useState({
    latMin: settings.region.latMin?.toString() ?? "",
    latMax: settings.region.latMax?.toString() ?? "",
    lonMin: settings.region.lonMin?.toString() ?? "",
    lonMax: settings.region.lonMax?.toString() ?? "",
  });
  const [isSaving, setIsSaving] = useState("");

  async function save(key: string, body: Record<string, unknown>, success: string) {
    setIsSaving(key);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { error?: string };

      if (!response.ok) {
        onError(data.error ?? "Die Einstellung konnte nicht gespeichert werden.");
        return false;
      }

      onStatus(success);
      return true;
    } finally {
      setIsSaving("");
    }
  }

  async function saveWindow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end) {
      onError("Bitte waehle einen Beginn vor dem Ende.");
      return;
    }

    const ok = await save("window", { startAt: start.toISOString(), endAt: end.toISOString() }, "Der Teilnahmezeitraum wurde gespeichert.");
    if (ok) onSaved({ startAt: start.toISOString(), endAt: end.toISOString(), stored: { ...settings.stored, window: true } });
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(goal, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      onError("Das Ziel muss eine ganze Zahl ab 1 sein.");
      return;
    }

    const ok = await save("goal", { recordGoal: parsed }, `Das neue Ziel sind ${parsed.toLocaleString("de-DE")} Reparaturen.`);
    if (ok) onSaved({ recordGoal: parsed, stored: { ...settings.stored, recordGoal: true } });
  }

  async function saveDayRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = dayRecord.trim();

    // Ein leeres Feld ist eine gueltige Angabe: Es loescht den hinterlegten Wert.
    if (!trimmed) {
      const cleared = await save("dayRecord", { dayRecord: null }, "Der Tagesrekord wurde entfernt. Es zaehlt der beste eigene Tag.");
      if (cleared) onSaved({ dayRecord: null, stored: { ...settings.stored, dayRecord: false } });
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      onError("Der Tagesrekord muss eine ganze Zahl ab 1 sein.");
      return;
    }

    const ok = await save("dayRecord", { dayRecord: parsed }, `Der Tagesrekord steht bei ${parsed.toLocaleString("de-DE")} Reparaturen.`);
    if (ok) onSaved({ dayRecord: parsed, stored: { ...settings.stored, dayRecord: true } });
  }

  async function saveRegion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBox = {
      latMin: toNumberOrNull(box.latMin),
      latMax: toNumberOrNull(box.latMax),
      lonMin: toNumberOrNull(box.lonMin),
      lonMax: toNumberOrNull(box.lonMax),
    };

    if (Object.values(parsedBox).some((value) => value !== null && Number.isNaN(value))) {
      onError("Die Koordinaten muessen Zahlen sein, zum Beispiel 51.25.");
      return;
    }

    const next = { ...region, ...parsedBox } as RegionSettings;
    const ok = await save("region", { region: next }, "Das Gebiet wurde gespeichert.");
    if (ok) onSaved({ region: next, stored: { ...settings.stored, region: true } });
  }

  async function uploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSaving("logo");

    try {
      const response = await fetch("/api/admin/logo", { method: "POST", body: new FormData(form) });
      const data = await response.json() as { error?: string; logoUrl?: string | null };

      if (!response.ok) {
        onError(data.error ?? "Das Logo konnte nicht gespeichert werden.");
        return;
      }

      form.reset();
      onStatus("Das Logo wurde aktualisiert.");
      onSaved({ logoUrl: data.logoUrl ?? null, stored: { ...settings.stored, logo: true } });
    } finally {
      setIsSaving("");
    }
  }

  async function removeLogo() {
    setIsSaving("logo");
    try {
      const response = await fetch("/api/admin/logo", { method: "DELETE" });
      const data = await response.json() as { error?: string };

      if (!response.ok) {
        onError(data.error ?? "Das Logo konnte nicht entfernt werden.");
        return;
      }

      onStatus("Das Logo wurde entfernt. Es gilt wieder die Wortmarke.");
      onSaved({ logoUrl: null, stored: { ...settings.stored, logo: false } });
    } finally {
      setIsSaving("");
    }
  }

  return (
    <div className="admin-stack">
      <section className="admin-card" aria-labelledby="window-heading">
        <div className="admin-card-head"><h3 id="window-heading">Zeitrahmen</h3><span className={`status-chip is-${settings.windowStatus === "open" ? "approved" : "pending"}`}>{windowStatusLabels[settings.windowStatus]}</span></div>
        <p>Ausserhalb dieses Zeitraums nimmt die Seite keine Einreichungen an und das Buehnen-Dashboard bleibt geschlossen. Admins behalten den Zugriff auf die Moderation.</p>
        <form className="campaign-form" onSubmit={saveWindow}>
          <label>Beginn<input name="startAt" type="datetime-local" required value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
          <label>Ende<input name="endAt" type="datetime-local" required value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "window"}>{isSaving === "window" ? "Speichert ..." : "Zeitrahmen speichern"}</button>
        </form>
        {!settings.stored.window && <p className="quota-note">Aktuell gelten die Werte aus <code>SUBMISSION_START_AT</code> und <code>SUBMISSION_END_AT</code>.</p>}
      </section>

      <section className="admin-card" aria-labelledby="goal-heading">
        <div className="admin-card-head"><h3 id="goal-heading">Ziel</h3><span className="section-index">{settings.recordGoal.toLocaleString("de-DE")} Reparaturen</span></div>
        <p>Die Zielzahl steuert Fortschritt, Soll-Ist-Vergleich und Rangliste im Buehnen-Dashboard.</p>
        <form className="campaign-form" onSubmit={saveGoal}>
          <label>Neues Ziel<input name="recordGoal" type="number" min={1} step={1} required value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "goal"}>{isSaving === "goal" ? "Speichert ..." : "Ziel speichern"}</button>
        </form>
        {!settings.stored.recordGoal && <p className="quota-note">Aktuell gilt der Wert aus <code>NEXT_PUBLIC_RECORD_GOAL</code>.</p>}
      </section>

      <section className="admin-card" aria-labelledby="day-record-heading">
        <div className="admin-card-head"><h3 id="day-record-heading">Tagesrekord</h3><span className="section-index">{settings.dayRecord ? `${settings.dayRecord.toLocaleString("de-DE")} an einem Tag` : "Nicht hinterlegt"}</span></div>
        <p>Die bisher hoechste Zahl an Reparaturen an einem einzigen Tag - der Wert aus der Tabellenkalkulation. Das Buehnen-Dashboard laesst den heutigen Tag dagegen laufen. Gezaehlt wird nach Einreichungstag, nicht nach Freigabe. Ueberbietet ein Tag dieser Aktion den Wert, gilt automatisch der neue.</p>
        <form className="campaign-form" onSubmit={saveDayRecord}>
          <label>Bisheriger Tagesrekord<input name="dayRecord" type="number" min={1} step={1} value={dayRecord} placeholder="leer lassen" onChange={(event) => setDayRecord(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "dayRecord"}>{isSaving === "dayRecord" ? "Speichert ..." : "Tagesrekord speichern"}</button>
        </form>
        {!settings.stored.dayRecord && <p className="quota-note">Ohne Wert zeigt die Buehne allein den besten Tag dieser Aktion.</p>}
      </section>

      <section className="admin-card" aria-labelledby="region-heading">
        <div className="admin-card-head"><h3 id="region-heading">Gebiet</h3><span className="section-index">{region.enabled ? region.label : "Keine Pruefung"}</span></div>
        <p>Die Einreichung wird ueber den Vercel-Geo-Header geprueft; das Koordinatenfenster dient als Rueckfall aus den EXIF-Daten des Bildes.</p>
        <form className="campaign-form is-wide" onSubmit={saveRegion}>
          <label className="checkbox-label"><input type="checkbox" checked={region.enabled} onChange={(event) => setRegion({ ...region, enabled: event.target.checked })} /> Gebietspruefung aktiv</label>
          <label>Gebietsname<input value={region.label} maxLength={120} required onChange={(event) => setRegion({ ...region, label: event.target.value })} /></label>
          <label>Land, zwei Buchstaben<input value={region.ipCountry} maxLength={2} required onChange={(event) => setRegion({ ...region, ipCountry: event.target.value.toUpperCase() })} /></label>
          <label>Region, optional<input value={region.ipRegion} maxLength={10} placeholder="z. B. NW" onChange={(event) => setRegion({ ...region, ipRegion: event.target.value.toUpperCase() })} /></label>
          <label>Breite von<input value={box.latMin} inputMode="decimal" onChange={(event) => setBox({ ...box, latMin: event.target.value })} /></label>
          <label>Breite bis<input value={box.latMax} inputMode="decimal" onChange={(event) => setBox({ ...box, latMax: event.target.value })} /></label>
          <label>Laenge von<input value={box.lonMin} inputMode="decimal" onChange={(event) => setBox({ ...box, lonMin: event.target.value })} /></label>
          <label>Laenge bis<input value={box.lonMax} inputMode="decimal" onChange={(event) => setBox({ ...box, lonMax: event.target.value })} /></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "region"}>{isSaving === "region" ? "Speichert ..." : "Gebiet speichern"}</button>
        </form>
        <p className="quota-note">Alle vier Koordinaten leer lassen schaltet den EXIF-Rueckfall ab. {!settings.stored.region && "Aktuell gelten die REGION_*-Umgebungsvariablen."}</p>
      </section>

      <section className="admin-card" aria-labelledby="logo-heading">
        <div className="admin-card-head"><h3 id="logo-heading">Logo</h3></div>
        <p>Ersetzt die Wortmarke im Kopf der Seite. Ohne Logo bleibt das gesetzte &bdquo;R&ldquo; sichtbar.</p>
        {settings.logoUrl && (
          <div className="logo-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- Logo aus Supabase Storage ohne bekannte Groesse. */}
            <img src={settings.logoUrl} alt="Aktuelles Logo" />
            <button className="text-button" type="button" disabled={isSaving === "logo"} onClick={() => void removeLogo()}>Logo entfernen</button>
          </div>
        )}
        <form className="partner-form" onSubmit={uploadLogo}>
          <label>Neues Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required /><small>PNG, WebP, JPG oder SVG, maximal 1 MB.</small></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "logo"}>{isSaving === "logo" ? "Laedt ..." : "Logo hochladen"}</button>
        </form>
      </section>
    </div>
  );
}
