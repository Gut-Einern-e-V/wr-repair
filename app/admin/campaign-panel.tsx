"use client";

import { FormEvent, useState } from "react";
import { isValidIpRule, MAX_ALLOWLIST_ENTRIES } from "@/lib/ip-allowlist";

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

/**
 * Drosselung der oeffentlichen Leseroute (Issue #80).
 *
 * `perMinute` steht auch dann in der Oberflaeche, wenn die Drosselung aus ist:
 * Wer sie im Notfall einschaltet, soll die Zahl schon vorbereitet haben und
 * nicht mitten in einer Veranstaltung eine erfinden muessen.
 */
export type RateLimitSettings = {
  enabled: boolean;
  perMinute: number;
  /**
   * Adressen und CIDR-Praefixe, die von jeder Grenze ausgenommen sind - der
   * Rechner am Beamer, das Infodisplay im Foyer.
   */
  allowlist: string[];
};

/**
 * Wer das Gewinnspiel veranstaltet (Issue #45). Die Felder kommen nie leer aus
 * dem Backend: Ein geleertes Feld faellt auf die Vorgabe aus
 * lib/organisation.ts zurueck (Issue #78).
 */
export type LotteryOrganizerSettings = {
  name: string;
  address: string;
  email: string;
};

export type AdminSettings = {
  startAt: string | null;
  endAt: string | null;
  windowStatus: "before" | "open" | "after" | "invalid";
  recordGoal: number;
  /** Bisher hoechster Tagesstand *an einem Ort*; null heisst: nicht hinterlegt. */
  dayRecord: number | null;
  rateLimit: RateLimitSettings;
  /**
   * Die Adresse, mit der das Backend gerade aufgerufen wird. Nur fuer den
   * Knopf, der sie in die Freigabeliste eintraegt - gespeichert wird sie nicht.
   */
  clientIp: string;
  region: RegionSettings;
  logoUrl: string | null;
  lotteryOrganizer: LotteryOrganizerSettings;
  persisted: boolean;
  stored: { window: boolean; recordGoal: boolean; dayRecord: boolean; rateLimit: boolean; region: boolean; logo: boolean; lotteryOrganizer: boolean };
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
 * Zeitrahmen, Zielzahl, Tagesrekord, Schnittstellen, Gebiet und Logo. Jede Karte
 * speichert einzeln, damit ein Tippfehler im Gebiet nicht den Zeitrahmen
 * blockiert.
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
  const [rateLimit, setRateLimit] = useState(settings.rateLimit);
  const [perMinute, setPerMinute] = useState(String(settings.rateLimit.perMinute));
  const [newAddress, setNewAddress] = useState("");
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
      const cleared = await save("dayRecord", { dayRecord: null }, "Der Tagesrekord wurde entfernt. Es zaehlt der beste eigene Ortstag.");
      if (cleared) onSaved({ dayRecord: null, stored: { ...settings.stored, dayRecord: false } });
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      onError("Der Tagesrekord muss eine ganze Zahl ab 1 sein.");
      return;
    }

    const ok = await save("dayRecord", { dayRecord: parsed }, `Der Tagesrekord steht bei ${parsed.toLocaleString("de-DE")} Reparaturen an einem Ort.`);
    if (ok) onSaved({ dayRecord: parsed, stored: { ...settings.stored, dayRecord: true } });
  }

  /**
   * Traegt eine Adresse in die Freigabeliste ein - nur im Formular, gespeichert
   * wird erst mit dem Knopf darunter.
   *
   * Die Schreibweise wird hier schon geprueft, damit ein Tippfehler sofort
   * auffaellt und nicht erst nach dem Speichern: Eine Adresse, die nicht
   * greift, ist schlimmer als keine - man verlaesst sich dann auf eine
   * Freigabe, die es nicht gibt.
   */
  function addAddress(value: string) {
    const rule = value.trim();
    if (!rule) return;

    if (!isValidIpRule(rule)) {
      onError(`"${rule}" ist keine IP-Adresse und kein Praefix. Beispiele: 203.0.113.4, 203.0.113.0/24, 2001:db8::/32.`);
      return;
    }
    if (rateLimit.allowlist.includes(rule)) {
      onError(`${rule} steht schon auf der Liste.`);
      return;
    }
    if (rateLimit.allowlist.length >= MAX_ALLOWLIST_ENTRIES) {
      onError(`Die Freigabeliste fasst hoechstens ${MAX_ALLOWLIST_ENTRIES} Eintraege.`);
      return;
    }

    setRateLimit({ ...rateLimit, allowlist: [...rateLimit.allowlist, rule] });
    setNewAddress("");
    onStatus(`${rule} ist eingetragen. Zum Uebernehmen noch speichern.`);
  }

  function removeAddress(rule: string) {
    setRateLimit({ ...rateLimit, allowlist: rateLimit.allowlist.filter((entry) => entry !== rule) });
    onStatus(`${rule} ist entfernt. Zum Uebernehmen noch speichern.`);
  }

  async function saveRateLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(perMinute, 10);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100_000) {
      onError("Die Anfragen pro Minute muessen eine ganze Zahl zwischen 1 und 100.000 sein.");
      return;
    }

    const next = { ...rateLimit, perMinute: parsed };
    const freed = next.allowlist.length === 1 ? "eine Adresse ist freigegeben" : `${next.allowlist.length} Adressen sind freigegeben`;
    const ok = await save(
      "rateLimit",
      { rateLimit: next },
      next.enabled
        ? `Die Drosselung laeuft mit ${parsed.toLocaleString("de-DE")} Anfragen pro Minute und IP-Adresse, ${freed}.`
        : `Die Drosselung ist aus, es gelten die Vorgaben der Routen. ${next.allowlist.length > 0 ? `Davon ausgenommen: ${freed}.` : ""}`.trim(),
    );
    if (ok) setRateLimit(next);
    if (ok) onSaved({ rateLimit: next, stored: { ...settings.stored, rateLimit: true } });
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
        <div className="admin-card-head"><h3 id="day-record-heading">Tagesrekord je Ort</h3><span className="section-index">{settings.dayRecord ? `${settings.dayRecord.toLocaleString("de-DE")} an einem Tag und Ort` : "Nicht hinterlegt"}</span></div>
        <p>Die bisher hoechste Zahl an Reparaturen an einem einzigen Tag <b>und Ort</b> - der Wert aus der Tabellenkalkulation (Exeter 2019: 268). Das Buehnen-Dashboard laesst den Kreis oder die kreisfreie Stadt mit dem hoechsten Tagesstand dagegen laufen, nicht ganz NRW: Landesweit gezaehlt faellt die Marke an jedem gut besuchten Samstag, ohne dass irgendwo etwas Vergleichbares passiert waere. Gezaehlt wird nach Einreichungstag, nicht nach Freigabe. Ueberbietet ein Ort an einem Tag dieser Aktion den Wert, gilt automatisch der neue.</p>
        <form className="campaign-form" onSubmit={saveDayRecord}>
          <label>Bisheriger Tagesrekord je Ort<input name="dayRecord" type="number" min={1} step={1} value={dayRecord} placeholder="leer lassen" onChange={(event) => setDayRecord(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "dayRecord"}>{isSaving === "dayRecord" ? "Speichert ..." : "Tagesrekord speichern"}</button>
        </form>
        {!settings.stored.dayRecord && <p className="quota-note">Ohne Wert zeigt die Buehne allein den besten Ortstag dieser Aktion.</p>}
      </section>

      <section className="admin-card" aria-labelledby="rate-limit-heading">
        <div className="admin-card-head"><h3 id="rate-limit-heading">Oeffentliche Schnittstellen</h3><span className={`status-chip is-${rateLimit.enabled ? "pending" : "approved"}`}>{rateLimit.enabled ? `Gedrosselt: ${rateLimit.perMinute.toLocaleString("de-DE")}/min` : "Normalbetrieb"}</span></div>
        <p>Die Leseroute unter <code>/api/*</code> ist ohne Schluessel abrufbar und dokumentiert (siehe <a href="/api-doku" target="_blank" rel="noreferrer">Schnittstellen-Doku</a>). Im Normalbetrieb gelten die grosszuegigen Vorgaben der einzelnen Routen &ndash; 240 Anfragen pro Minute und IP-Adresse fuer die Buehnendaten, 120 fuer die Statistik. Wird ein Kontingent bei Vercel oder Supabase knapp, senkt dieser Schalter die Grenze fuer alle oeffentlichen Leseroute auf denselben Wert, sofort und ohne Deployment.</p>
        <form className="campaign-form" onSubmit={saveRateLimit}>
          <label className="checkbox-label"><input type="checkbox" checked={rateLimit.enabled} onChange={(event) => setRateLimit({ ...rateLimit, enabled: event.target.checked })} /> Drosselung aktiv</label>
          <label>Anfragen pro Minute und IP<input name="perMinute" type="number" min={1} max={100000} step={1} required value={perMinute} onChange={(event) => setPerMinute(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={isSaving === "rateLimit"}>{isSaving === "rateLimit" ? "Speichert ..." : "Drosselung speichern"}</button>
        </form>
        <p className="quota-note">Die Grenze wirkt je Serverinstanz und ist damit eine Bremse, keine harte Obergrenze &ndash; das Einreichungslimit zaehlt dagegen in der Datenbank. Zu niedrig eingestellt trifft es zuerst Veranstaltungen: Dort stecken alle Geraete hinter einer IP-Adresse. Unter 30 pro Minute faellt der Kreis-Vorschlag im Formular aus.</p>

        {/* Freigabeliste. Steht in derselben Karte, weil sie nur zusammen mit
            der Grenze einen Sinn hat, und speichert mit demselben Knopf. */}
        <h4 className="admin-subhead" id="allowlist-heading">Immer freigegebene Adressen</h4>
        <p>Feste Anzeigen sollen nie anschlagen: der Rechner am Beamer, das Infodisplay im Foyer. Wer hier steht, fragt ohne Grenze ab &ndash; auch im Schonmodus. <b>Gilt nur fuer die Leseroute:</b> Die Einreichung bleibt gedrosselt, ihr Limit ist die Bremse gegen ein Skript ohne Captcha.</p>
        {rateLimit.allowlist.length > 0
          ? <ul className="allowlist" aria-labelledby="allowlist-heading">
              {rateLimit.allowlist.map((rule) => (
                <li key={rule}>
                  <code>{rule}</code>
                  {rule === settings.clientIp && <span className="allowlist-mark">dieser Rechner</span>}
                  <button className="text-button" type="button" onClick={() => removeAddress(rule)}>Entfernen</button>
                </li>
              ))}
            </ul>
          : <p className="quota-note">Noch keine Adresse freigegeben &ndash; es gelten die Grenzen oben fuer alle.</p>}
        <div className="campaign-form is-wide">
          <label>Adresse oder Praefix<input
            name="allowlistEntry"
            value={newAddress}
            placeholder="203.0.113.4 oder 203.0.113.0/24"
            onChange={(event) => setNewAddress(event.target.value)}
            onKeyDown={(event) => {
              // Enter darf hier nicht das Formular oben abschicken - der
              // Eintrag soll erst in die Liste, dann gespeichert werden.
              if (event.key !== "Enter") return;
              event.preventDefault();
              addAddress(newAddress);
            }}
          /></label>
          <button className="button button-secondary" type="button" onClick={() => addAddress(newAddress)}>Zur Liste hinzufuegen</button>
          {!rateLimit.allowlist.includes(settings.clientIp) && isValidIpRule(settings.clientIp) && (
            <button className="button button-secondary" type="button" onClick={() => addAddress(settings.clientIp)}>
              Diesen Rechner eintragen ({settings.clientIp})
            </button>
          )}
        </div>
        <p className="quota-note">
          {isValidIpRule(settings.clientIp)
            ? <>Dieses Backend wird gerade von <code>{settings.clientIp}</code> aufgerufen. </>
            : <>Fuer diesen Aufruf ist keine Adresse erkennbar &ndash; das ist lokal normal, in der Bereitstellung liefert Vercel sie. </>}
          Ein Praefix wie <code>203.0.113.0/24</code> oder <code>2001:db8::/32</code> ueberlebt den Adresswechsel des Anschlusses: Viele Provider vergeben taeglich eine neue Adresse aus demselben Netz. Aenderungen werden erst mit <b>Drosselung speichern</b> uebernommen.
        </p>
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
