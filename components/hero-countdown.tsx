"use client";

import { useEffect, useState } from "react";
import { campaignPhaseAt, type CampaignDates } from "@/lib/campaign-phase";

export type HeroCountdownProps = {
  campaign: CampaignDates;
  /** Endstand und Ziel, sobald sie geladen sind - fuer die Bilanz nach dem Ende. */
  total: number | null;
  goal: number | null;
};

type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

function splitDuration(milliseconds: number): CountdownParts {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3_600),
    minutes: Math.floor((seconds % 3_600) / 60),
    seconds: seconds % 60,
  };
}

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short" });
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

/**
 * Uhr im Hero.
 *
 * Vor der Reparaturphase laeuft sie auf den Start, waehrenddessen auf das Ende,
 * danach steht statt der Uhr die Bilanz.
 *
 * Die Phase wird hier aus den beiden Zeitpunkten abgeleitet und nicht vom
 * Server uebernommen (siehe lib/campaign-phase.ts). Vorher blieb ein offener
 * Browser beim Ablauf der Frist auf 00:00:00 stehen - der Zustand vom Laden
 * der Seite galt weiter (Issue #66).
 *
 * Vor dem ersten Uhrentakt ist die Phase "invalid"; dort greift der Zweig ohne
 * Uhr, deshalb kann `now` gefahrlos mit 0 starten und Server und erster
 * Browser-Durchlauf zeigen dasselbe.
 */
export function HeroCountdown({ campaign, total, goal }: HeroCountdownProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const phase = campaignPhaseAt(campaign, now);

  if (phase === "after") {
    return <div className="hero-countdown is-done">
      <p className="hero-countdown-label">Reparaturphase beendet</p>
      <p className="hero-countdown-result">{resultLine(total, goal)}</p>
      <p className="hero-countdown-note">
        {campaign.endAt
          ? <>Letzter Eintrag: <time dateTime={campaign.endAt}>{dateFormat.format(new Date(campaign.endAt))}</time>. Danke an alle, die mitgemacht haben.</>
          : "Danke an alle, die mitgemacht haben."}
      </p>
    </div>;
  }

  const target = phase === "before" ? campaign.startAt : phase === "open" ? campaign.endAt : null;
  const targetTime = target ? new Date(target).valueOf() : Number.NaN;

  if (Number.isNaN(targetTime)) {
    return <div className="hero-countdown is-quiet">
      <p className="hero-countdown-label">Reparaturphase</p>
      <p className="hero-countdown-note">Der genaue Zeitraum wird gerade festgelegt.</p>
    </div>;
  }

  const label = phase === "before" ? "Reparaturphase startet in" : "Noch Zeit zum Einreichen";
  const parts = splitDuration(targetTime - now);
  const units: Array<[keyof CountdownParts, string]> = [
    ["days", "Tage"],
    ["hours", "Std"],
    ["minutes", "Min"],
    ["seconds", "Sek"],
  ];

  return <div className="hero-countdown">
    <p className="hero-countdown-label">{label}</p>
    <div
      className="hero-countdown-clock"
      role="timer"
      aria-live="off"
      aria-label={`${label}: ${parts.days} Tage, ${parts.hours} Stunden, ${parts.minutes} Minuten, ${parts.seconds} Sekunden`}
    >
      {units.map(([key, unitLabel]) => (
        <span key={key}>
          <strong>{String(parts[key]).padStart(2, "0")}</strong>
          <small>{unitLabel}</small>
        </span>
      ))}
    </div>
    <p className="hero-countdown-note">
      {phase === "before" ? "Start" : "Einreichen bis"}: <time dateTime={target ?? undefined}>{dateTimeFormat.format(new Date(targetTime))} Uhr</time>
    </p>
  </div>;
}

/**
 * Die eine Zeile, die nach dem Ende zaehlt: Ist das Ziel gefallen oder nicht?
 *
 * Solange die Zahlen noch laden, bleibt es bei der neutralen Aussage - eine
 * Ueberschrift, die von "Ziel knapp verfehlt" auf "Ziel geknackt" springt,
 * sobald die Antwort da ist, waere schlimmer als eine Sekunde ohne Wertung.
 */
function resultLine(total: number | null, goal: number | null) {
  if (total === null || !goal) return "Alle Reparaturen sind gezählt.";
  if (total >= goal) return `Ziel geknackt: ${total.toLocaleString("de-DE")} von ${goal.toLocaleString("de-DE")} Reparaturen.`;

  const percent = Math.round((total / goal) * 100);
  return `${percent} % des Ziels: ${total.toLocaleString("de-DE")} von ${goal.toLocaleString("de-DE")} Reparaturen.`;
}
