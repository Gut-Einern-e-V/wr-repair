"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import BackendHeader from "@/components/backend-header";
import CampaignPanel, { type AdminSettings } from "./campaign-panel";
import LotteryPanel from "./lottery-panel";
import PartnerPanel from "./partner-panel";
import SystemStatus from "./system-status";
import TeamSettings from "./team-settings";

type Role = "moderator" | "admin" | "superadmin";
type Tab = "status" | "campaign" | "team" | "partners" | "lottery";

const tabLabels: Record<Tab, string> = {
  status: "System",
  campaign: "Kampagne",
  team: "Team",
  partners: "Partner",
  lottery: "Verlosung",
};

/**
 * Administration: alles, was nicht Moderation ist. Die Einreichungen selbst
 * liegen unter /moderator, erreichbar ueber die Kopfzeile (Issue #10).
 */
export default function AdminConsole({ email, roles, initialSettings }: { email: string; roles: Role[]; initialSettings: AdminSettings }) {
  const isSuperadmin = roles.includes("superadmin");
  const [tab, setTab] = useState<Tab>("status");
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const tabs: Tab[] = isSuperadmin ? ["status", "campaign", "team", "partners", "lottery"] : ["status", "campaign", "team", "partners"];

  const onStatus = useCallback((message: string) => { setStatus(message); setError(""); }, []);
  const onError = useCallback((message: string) => { setError(message); setStatus(""); }, []);

  // Meldungen gehoeren zum Vorgang: beim Bereichswechsel verschwinden sie.
  function selectTab(next: Tab) {
    setTab(next);
    setStatus("");
    setError("");
  }

  return (
    <main className="moderator-shell">
      <BackendHeader area="admin" email={email} logoUrl={settings.logoUrl} canAdminister />
      <section className="moderator-intro">
        <p className="brand-kicker">Administration</p>
        <h1 className="sticker-head"><span className="sticker">Rekord</span><span className="sticker">steuern</span></h1>
        <p className="moderator-lead">Zeitrahmen, Gebiet, Ziel, Schnittstellen, Team und Systemzustand an einer Stelle. Zum Pruefen der Einreichungen geht es in die <Link href="/moderator">Moderation</Link>.</p>
      </section>

      {!settings.persisted && (
        <div className="admin-body">
          <p className="form-error" role="alert">Die Einstellungstabelle ist nicht erreichbar. Bis die Migration <code>202608270001_admin_settings.sql</code> eingespielt ist, gelten ausschliesslich die Umgebungsvariablen und Aenderungen hier schlagen fehl.</p>
        </div>
      )}

      <div className="admin-tabs" role="tablist" aria-label="Verwaltungsbereiche">
        {tabs.map((value) => (
          <button key={value} role="tab" type="button" aria-selected={tab === value} className={tab === value ? "is-current" : ""} onClick={() => selectTab(value)}>
            {tabLabels[value]}
          </button>
        ))}
      </div>

      <div className="admin-body">
        {status && <p className="form-notice" role="status">{status}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {tab === "status" && (
          <>
            <SystemStatus />
            <div className="admin-links">
              <a className="button button-secondary" href="/api/admin/repairs/export">Einreichungen als CSV exportieren</a>
              <Link className="button button-secondary" href="/stats">Buehnen-Dashboard oeffnen</Link>
              <Link className="button button-secondary" href="/moderator">Zur Moderation</Link>
            </div>
          </>
        )}
        {tab === "campaign" && <CampaignPanel settings={settings} onStatus={onStatus} onError={onError} onSaved={(next) => setSettings((current) => ({ ...current, ...next }))} />}
        {tab === "team" && <TeamSettings onStatus={onStatus} onError={onError} />}
        {tab === "partners" && <PartnerPanel onStatus={onStatus} onError={onError} />}
        {tab === "lottery" && isSuperadmin && <LotteryPanel settings={settings} onSaved={(next) => setSettings((current) => ({ ...current, ...next }))} onStatus={onStatus} onError={onError} />}
      </div>
    </main>
  );
}
