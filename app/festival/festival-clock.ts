"use client";

import { useEffect, useState } from "react";
import { FESTIVAL_DATE_ISO } from "./festival-chrome";

/**
 * Wo der Festivaltag gerade steht, in Wuppertaler Zeit.
 *
 * `null` vor dem ersten Takt: Server und erster Browser-Durchlauf zeigen so
 * dasselbe, erst danach kommt die Uhr dazu (wie in components/hero-countdown).
 *
 * `?uhrzeit=13:20` in der Adresse stellt die Uhr auf diese Zeit am Festivaltag.
 * Damit laesst sich der Tag vorher durchspielen, ohne die Systemzeit zu
 * verstellen; fuer alle anderen aendert sich nichts.
 */
export type FestivalClock = { phase: "before" | "day" | "after"; minutes: number; daysLeft: number };

const berlinParts = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function toMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function readClock(): FestivalClock {
  const override = new URLSearchParams(window.location.search).get("uhrzeit");
  if (override && /^\d{1,2}:\d{2}$/.test(override)) return { phase: "day", minutes: toMinutes(override), daysLeft: 0 };

  const parts = Object.fromEntries(berlinParts.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = toMinutes(`${parts.hour}:${parts.minute}`);
  const daysLeft = Math.round((Date.parse(FESTIVAL_DATE_ISO) - Date.parse(today)) / 86_400_000);
  return { phase: daysLeft > 0 ? "before" : daysLeft < 0 ? "after" : "day", minutes, daysLeft };
}

export function useFestivalClock() {
  const [clock, setClock] = useState<FestivalClock | null>(null);

  useEffect(() => {
    const tick = () => setClock(readClock());
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return clock;
}
