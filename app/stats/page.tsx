"use client";

import { useEffect, useState } from "react";
import "./dashboard.css";
import { campaignPhaseAt, type CampaignDates, type CampaignPhase } from "@/lib/campaign-phase";
import LiveDashboard from "./live-dashboard";
import Recap from "./recap";

/**
 * Drei Zustaende unter einer Adresse (Issue #66):
 *
 * - **vorher** verschlossen. Es gibt nichts zu zeigen, und eine Null als
 *   "Live-Stand" waere eine falsche Auskunft.
 * - **waehrenddessen** die Buehne, siehe live-dashboard.tsx.
 * - **danach** der Rueckblick. Die Seite bleibt damit erreichbar, statt zum
 *   Ende der Aktion zuzugehen - geteilte Links laufen weiter, und das
 *   Ergebnis ist das, was von der Aktion bleibt.
 *
 * Die Phase kommt aus den Zeitpunkten und der Uhr des Browsers, nicht aus dem
 * Status der Antwort: Ein Screen, der die ganze Aktion ueber im Foyer laeuft,
 * soll zum Ende von selbst auf den Rueckblick umschalten, ohne dass jemand
 * neu laedt.
 */
export default function StatsPage() {
  const [campaign, setCampaign] = useState<CampaignDates | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<CampaignPhase>("invalid");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/campaign", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        setCampaign(await response.json() as CampaignDates);
      } catch {
        setFailed(true);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!campaign) return;
    const tick = () => setPhase(campaignPhaseAt(campaign, Date.now()));
    tick();
    // Sekundentakt, damit der Wechsel auf die Sekunde sitzt. Bleibt die Phase
    // gleich, verwirft React die Aktualisierung und nichts rendert neu.
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [campaign]);

  if (phase === "open") return <LiveDashboard />;
  if (phase === "after") return <Recap campaign={campaign as CampaignDates} />;

  return (
    <main className="dashboard-root is-standby">
      <p className="standby-mark">Reparaturrekord NRW</p>
      <p className="standby-message" role="status">
        {failed
          ? "Die Live-Daten sind gerade nicht verfuegbar."
          : campaign
            ? "Der Live-Stand wird mit dem Start des Weltrekordversuchs freigeschaltet."
            : "Live-Daten werden geladen."}
      </p>
    </main>
  );
}
