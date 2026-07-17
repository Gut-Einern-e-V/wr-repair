"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CampaignWindowNoticeProps = {
  status: "before" | "after" | "invalid" | "unknown";
  startAt: string | null;
};

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return [days, hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0"));
}

export function CampaignWindowNotice({ status, startAt }: CampaignWindowNoticeProps) {
  const [now, setNow] = useState(() => Date.now());
  const startTime = startAt ? new Date(startAt).valueOf() : Number.NaN;

  useEffect(() => {
    if (status !== "before" || Number.isNaN(startTime)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [startTime, status]);

  if (status === "before" && !Number.isNaN(startTime)) {
    const [days, hours, minutes, seconds] = formatCountdown(startTime - now);
    return <section className="campaign-window" id="campaign-window" aria-labelledby="campaign-window-title">
      <p className="section-index">Weltrekordversuch NRW</p>
      <h2 id="campaign-window-title">Der Rekord startet bald.</h2>
      <p>Einreichungen oeffnen am <time dateTime={startAt ?? undefined}>{new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeStyle: "short" }).format(new Date(startTime))} Uhr</time>.</p>
      <div className="countdown" aria-label={`Noch ${days} Tage, ${hours} Stunden, ${minutes} Minuten und ${seconds} Sekunden bis zum Start`}>
        <span><strong>{days}</strong>Tage</span><span><strong>{hours}</strong>Stunden</span><span><strong>{minutes}</strong>Minuten</span><span><strong>{seconds}</strong>Sekunden</span>
      </div>
      <p className="campaign-window-links"><Link href="/supporters">Partner kennenlernen <span aria-hidden="true">&#8594;</span></Link><Link href="/about">Mehr zum Projekt <span aria-hidden="true">&#8594;</span></Link></p>
    </section>;
  }

  return <section className="campaign-window" id="campaign-window" aria-labelledby="campaign-window-title">
    <p className="section-index">Weltrekordversuch NRW</p>
    <h2 id="campaign-window-title">{status === "after" ? "Der Einreichungszeitraum ist beendet." : "Der Einreichungszeitraum wird vorbereitet."}</h2>
    <p>{status === "after" ? "Danke an alle Menschen, die Reparatur sichtbar gemacht haben. Die freigegebenen Geschichten bleiben Teil des Projekts." : "Der genaue Zeitraum wird gerade eingerichtet. Bis dahin kannst du die Projektpartner und Reparaturgeschichten entdecken."}</p>
    <p className="campaign-window-links"><Link href="/supporters">Partner kennenlernen <span aria-hidden="true">&#8594;</span></Link><Link href="/stories">Geschichten lesen <span aria-hidden="true">&#8594;</span></Link></p>
  </section>;
}