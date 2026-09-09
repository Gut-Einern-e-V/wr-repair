"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CampaignWindowNotice } from "@/components/campaign-window-notice";
import { RepairSubmissionForm } from "@/components/repair-submission-form";

type CampaignStatus = {
  status: "open" | "before" | "after" | "invalid";
  startAt: string | null;
  /** Testlauf: Die Einreichung ist offen, auch wenn der Zeitraum es nicht ist (Issue #102). */
  testRun?: boolean;
};

export function QuickSubmission() {
  const [campaign, setCampaign] = useState<CampaignStatus | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch("/api/campaign", { cache: "no-store" });
        if (!response.ok) throw new Error("Kampagnenstatus nicht verfuegbar");
        setCampaign(await response.json() as CampaignStatus);
      } catch {
        setCampaign({ status: "invalid", startAt: null });
      }
    }

    void loadCampaign();
  }, []);

  if (!campaign) {
    return <p className="form-notice" role="status">Einreichung wird geladen ...</p>;
  }

  /* Der Testlauf hebt den Zeitraum auf (Issue #102) - dieselbe Entscheidung
     wie in der Einreichungsroute, siehe acceptsSubmissions in
     lib/app-settings.ts. */
  if (campaign.status !== "open" && !campaign.testRun) {
    return <>
      <CampaignWindowNotice status={campaign.status} startAt={campaign.startAt} />
      <p className="quick-submit-back"><Link className="text-button" href="/">Zur Startseite <span aria-hidden="true">&#8594;</span></Link></p>
    </>;
  }

  return <RepairSubmissionForm heading="Reparatur einreichen" isTestRun={Boolean(campaign.testRun)} />;
}
