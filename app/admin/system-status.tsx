"use client";

import { useJsonResource } from "@/lib/use-json-resource";
import { performedByLabel } from "@/app/moderator/repair-types";
import { repairCategoryLabel } from "@/lib/repair-catalog";

type Service = { id: string; label: string; ok: boolean; ms: number | null; detail: string | null };
type SubmissionFailure = {
  id: string;
  at: string;
  /** Letztes Auftreten desselben Grundes. Mit `at` zusammen ein Zeitraum. */
  lastAt: string;
  /** Wie oft gezaehlt. Erst ab Migration 202609170002 groesser als 1. */
  hits: number;
  stage: string;
  reason: string;
  detail: string | null;
  ipRegion: string | null;
  /** Die Einreichung kam zustande, aber unvollstaendig - etwa ohne ihr Foto. */
  incomplete: boolean;
};
/** Eine Einreichung, die unterwegs verlorenging (Issue #107). */
type AbandonedSubmission = {
  id: string;
  at: string;
  lastAt: string;
  attempts: number;
  stage: string;
  reason: string;
  ipRegion: string | null;
  kreis: string | null;
  originSource: string | null;
  category: string | null;
  brandModel: string | null;
  durationMinutes: number | null;
  itemValueEuros: number | null;
  performedBy: string | null;
  story: string | null;
  hasImage: boolean;
  wantsLottery: boolean;
};
type Quota = { usedBytes: number; quotaBytes: number };
type StatusResponse = {
  services: Service[];
  usage: {
    storage: Quota & { buckets: { id: string; objects: number; bytes: number }[] };
    database: Quota;
    repairs: { pending: number; approved: number; rejected: number };
    accounts: number;
    partners: number;
  } | null;
  usageError: string | null;
  submissionFailures: SubmissionFailure[];
  submissionFailuresError: string | null;
  abandonedSubmissions: AbandonedSubmission[];
  abandonedSubmissionsError: string | null;
  checkedAt: string;
};

/* Klartext fuer die Kurzformen aus lib/submission-log.ts. Der Systemstatus
   liest jemand, der wissen will, ob die Aktion laeuft - nicht jemand, der die
   Codebasis kennt. */
const stageLabels: Record<string, string> = {
  gate: "Limitpruefung",
  captcha: "Spam-Schutz",
  insert: "Speichern",
  image: "Bild-Upload",
  lottery: "Gewinnspiel",
  notify: "Benachrichtigung",
  blocked: "Zaehlung ausserhalb",
};

const reasonLabels: Record<string, string> = {
  captcha_unavailable: "Friendly Captcha hat nicht geantwortet; die Einreichung wurde trotzdem angenommen.",
  captcha_invalid: "Friendly Captcha hat das Loesungswort abgelehnt. Steht dahinter response_duplicate, war es ein zweiter Versuch mit demselben Wort.",
  captcha_unfinished: "Abgeschickt, bevor der Spam-Schutz fertig gerechnet hatte. Das Formular wartet seit Issue #107 darauf.",
  captcha_unconfigured: "FRIENDLY_CAPTCHA_API_KEY oder der Sitekey fehlt in der Umgebung. Bis dahin kommt niemand durch.",
  token_missing: "Einreichung ohne Loesungswort - das Widget hat nicht geladen, oder es war ein Skript.",
  insert_failed: "Der Datenbankschreibvorgang ist fehlgeschlagen.",
  upload_failed: "Das Foto konnte nicht gespeichert werden; die Einreichung blieb ohne Bild.",
  link_failed: "Das Foto liegt im Speicher, liess sich aber nicht mit der Einreichung verknuepfen.",
  push_failed: "Die Moderation konnte nicht benachrichtigt werden.",
  count_failed: "Die Zaehlung einer Einreichung von ausserhalb ist fehlgeschlagen.",
  idempotency_unavailable: "Wiederholungsversuche waren nicht erkennbar; die Migration 202608310001 fehlte. Ein zweiter Versuch konnte eine doppelte Reparatur anlegen.",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

function QuotaBar({ label, quota, hint }: { label: string; quota: Quota; hint?: string }) {
  const percent = quota.quotaBytes > 0 ? Math.min(100, (quota.usedBytes / quota.quotaBytes) * 100) : 0;
  const free = Math.max(quota.quotaBytes - quota.usedBytes, 0);

  return (
    <div className="quota">
      <div className="quota-head"><strong>{label}</strong><span>{formatBytes(quota.usedBytes)} von {formatBytes(quota.quotaBytes)}</span></div>
      <div className="quota-bar"><span className={percent > 85 ? "is-critical" : percent > 65 ? "is-warning" : ""} style={{ width: `${percent}%` }} /></div>
      <p className="quota-note">{formatBytes(free)} frei ({(100 - percent).toFixed(0)} Prozent){hint ? ` · ${hint}` : ""}</p>
    </div>
  );
}

/** Supabase-Belegung und Erreichbarkeit der Dienste, live geprueft. */
export default function SystemStatus() {
  const { data, error, isLoading, reload } = useJsonResource<StatusResponse>("/api/admin/status", "Der Systemstatus konnte nicht geladen werden.");

  if (isLoading) return <p className="queue-empty">Systemstatus wird geprueft.</p>;
  if (!data) return <p className="form-error" role="alert">{error || "Kein Systemstatus verfuegbar."}</p>;

  return (
    <div className="admin-stack">
      <div className="service-grid">
        {data.services.map((service) => (
          <div className={`service-card ${service.ok ? "is-ok" : "is-down"}`} key={service.id}>
            <p className="section-index">{service.label}</p>
            <strong>{service.ok ? "Erreichbar" : "Gestoert"}</strong>
            <p className="quota-note">{service.ms !== null ? `${service.ms} ms` : "Konfiguration"}{service.detail ? ` · ${service.detail}` : ""}</p>
          </div>
        ))}
      </div>

      {data.usage ? (
        <>
          <QuotaBar label="Datei-Speicher" quota={data.usage.storage} hint={`${data.usage.storage.buckets.reduce((sum, bucket) => sum + bucket.objects, 0)} Dateien`} />
          <QuotaBar label="Datenbank" quota={data.usage.database} />
          <div className="admin-facts">
            {data.usage.storage.buckets.map((bucket) => <div key={bucket.id}><dt>{bucket.id}</dt><dd>{formatBytes(bucket.bytes)} · {bucket.objects} Dateien</dd></div>)}
            <div><dt>Einreichungen offen</dt><dd>{data.usage.repairs.pending}</dd></div>
            <div><dt>Freigegeben</dt><dd>{data.usage.repairs.approved}</dd></div>
            <div><dt>Abgelehnt</dt><dd>{data.usage.repairs.rejected}</dd></div>
            <div><dt>Konten mit Rolle</dt><dd>{data.usage.accounts}</dd></div>
            <div><dt>Partner</dt><dd>{data.usage.partners}</dd></div>
          </div>
        </>
      ) : <p className="form-error" role="alert">{data.usageError}</p>}

      <div className="admin-stack">
        <p className="section-index">Einreichungen: letzte Vorfaelle</p>
        {data.submissionFailuresError ? (
          <p className="form-error" role="alert">{data.submissionFailuresError}</p>
        ) : data.submissionFailures.length === 0 ? (
          <p className="queue-empty">Keine fehlgeschlagenen Einreichungen protokolliert.</p>
        ) : (
          <ul className="failure-list">
            {data.submissionFailures.map((failure) => (
              <li key={failure.id} className={failure.incomplete ? "is-partial" : "is-lost"}>
                <strong>{stageLabels[failure.stage] ?? failure.stage}{failure.hits > 1 ? ` · ${failure.hits}\u00d7` : ""}</strong>
                <span>{reasonLabels[failure.reason] ?? failure.reason}</span>
                <p className="quota-note">
                  {/* Bei mehreren Vorfaellen ein Zeitraum statt eines
                      Zeitpunkts: Ohne das zweite Datum saehe eine Stoerung
                      von gestern aus wie eine von heute (Issue #107). */}
                  {new Date(failure.at).toLocaleString("de-DE")}
                  {failure.hits > 1 ? ` bis ${new Date(failure.lastAt).toLocaleString("de-DE")}` : ""}
                  {failure.ipRegion ? ` · ${failure.ipRegion}` : ""}
                  {` · ${failure.incomplete ? "Einreichung angekommen" : "Einreichung verloren"}`}
                  {failure.detail ? ` · ${failure.detail}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Und was dabei verlorenging (Issue #107). Das Protokoll darueber sagt,
          woran es lag; hier steht, was weg ist - vollstaendig genug, um es von
          Hand in die Moderation einzutragen. Ohne Foto, ohne Name und Mail:
          siehe Migration 202609170002. */}
      <div className="admin-stack">
        <p className="section-index">Abgebrochene Einreichungen</p>
        {data.abandonedSubmissionsError ? (
          <p className="form-error" role="alert">{data.abandonedSubmissionsError}</p>
        ) : data.abandonedSubmissions.length === 0 ? (
          <p className="queue-empty">Keine abgebrochene Einreichung aufgezeichnet.</p>
        ) : (
          <ul className="failure-list">
            {data.abandonedSubmissions.map((entry) => (
              <li className="is-lost" key={entry.id}>
                <strong>
                  {entry.category ? repairCategoryLabel(entry.category) : "Ohne Kategorie"}
                  {entry.kreis ? ` · ${entry.kreis}` : entry.ipRegion ? ` · ${entry.ipRegion}` : ""}
                  {entry.attempts > 1 ? ` · ${entry.attempts} Versuche` : ""}
                </strong>
                <span>{reasonLabels[entry.reason] ?? entry.reason}</span>
                <dl className="admin-facts">
                  <div><dt>Geraet</dt><dd>{entry.brandModel ?? "–"}</dd></div>
                  <div><dt>Reparatur</dt><dd>{performedByLabel(entry.performedBy)}</dd></div>
                  <div><dt>Dauer</dt><dd>{entry.durationMinutes ? `${entry.durationMinutes} Minuten` : "–"}</dd></div>
                  <div><dt>Wert</dt><dd>{entry.itemValueEuros === null ? "–" : `${entry.itemValueEuros.toLocaleString("de-DE")} Euro`}</dd></div>
                </dl>
                {entry.story && <p className="quota-note">„{entry.story}“</p>}
                <p className="quota-note">
                  {new Date(entry.lastAt).toLocaleString("de-DE")}
                  {entry.originSource ? ` · Herkunft aus ${entry.originSource}` : ""}
                  {entry.hasImage ? " · mit Foto (nicht gespeichert)" : ""}
                  {entry.wantsLottery ? " · wollte am Gewinnspiel teilnehmen (Name und Mail sind nicht gespeichert)" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="quota-note">Aufgehoben wird nur, was eine Reparatur beschreibt - kein Foto, kein Name, keine Mail-Adresse, keine IP. Die Zeilen loeschen sich nach 30 Tagen selbst.</p>
      </div>

      <p className="quota-note">Geprueft am {new Date(data.checkedAt).toLocaleString("de-DE")}. Die Grenzwerte stammen aus <code>SUPABASE_STORAGE_QUOTA_MB</code> und <code>SUPABASE_DB_QUOTA_MB</code>; ohne Angabe gelten die Free-Tier-Werte.</p>
      <button className="button button-secondary" type="button" onClick={reload}>Neu pruefen</button>
    </div>
  );
}
