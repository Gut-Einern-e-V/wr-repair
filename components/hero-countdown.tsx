"use client";

import { useEffect, useState } from "react";

export type HeroCountdownProps = {
  status: "open" | "before" | "after" | "invalid";
  startAt: string | null;
  endAt: string | null;
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

/* Waehrend der Reparaturphase laeuft der Timer auf das Ende, davor auf den Start.
   Beim Server-Rendering ist der Kampagnenstatus noch "invalid" - dort greift der
   Zweig ohne Uhr, deshalb kann `now` gefahrlos direkt initialisiert werden. */
export function HeroCountdown({ status, startAt, endAt }: HeroCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const target = status === "before" ? startAt : status === "open" ? endAt : null;
  const targetTime = target ? new Date(target).valueOf() : Number.NaN;
  const hasTarget = !Number.isNaN(targetTime);

  useEffect(() => {
    if (!hasTarget) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [hasTarget, targetTime]);

  if (!hasTarget) {
    return <div className="hero-countdown is-quiet">
      <p className="hero-countdown-label">Reparaturphase</p>
      <p className="hero-countdown-note">
        {status === "after"
          ? "Der Einreichungszeitraum ist beendet. Danke an alle, die mitgemacht haben."
          : "Der genaue Zeitraum wird gerade festgelegt."}
      </p>
    </div>;
  }

  const label = status === "before" ? "Reparaturphase startet in" : "Noch Zeit zum Einreichen";
  const parts = splitDuration(targetTime - now);
  const units: Array<[keyof CountdownParts, string]> = [
    ["days", "Tage"],
    ["hours", "Std"],
    ["minutes", "Min"],
    ["seconds", "Sek"],
  ];
  const spokenTarget = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short" }).format(new Date(targetTime));

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
      {status === "before" ? "Start" : "Einreichen bis"}: <time dateTime={target ?? undefined}>{spokenTarget} Uhr</time>
    </p>
  </div>;
}
