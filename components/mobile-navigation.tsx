"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConsentSettingsLink } from "@/components/consent-settings-link";
import { campaignPhaseAt, type CampaignDates } from "@/lib/campaign-phase";

/**
 * Menue auf dem Telefon (Issue #56).
 *
 * Vorher war das ein kleines Kaestchen unter dem Kopf: sechs Zeilen mit 58
 * Pixeln Hoehe, angeschnitten am Rand, mit dem Seiteninhalt dahinter. Jetzt
 * faehrt eine Flaeche ueber die ganze Bildschirmhoehe von rechts herein - oben
 * der Stand des Rekordversuchs, darunter die Seiten, unten die Rechtstexte.
 *
 * Der Stand wird erst beim Oeffnen geladen. Geschlossen kostet das Menue damit
 * keine einzige Anfrage; einmal geladen bleibt der Wert bis zum Seitenwechsel
 * stehen.
 */

const pages = [
  ["/mitmachen", "Einreichen"],
  ["/stats", "Live-Stand"],
  ["/stories", "Geschichten"],
  ["/repair-cafes", "Repair Cafés"],
  ["/festival", "Repair & Share Festival"],
  ["/gewinnspiel", "Gewinnspiel"],
  ["/about", "Projekt"],
  ["/supporters", "Unterstützung"],
] as const;

const legalLinks = [
  ["/privacy", "Datenschutz"],
  ["/imprint", "Impressum"],
  ["/accessibility", "Barrierefreiheit"],
  ["/leichte-sprache", "Leichte Sprache"],
] as const;

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  /* Solange das Menue offen ist, soll die Seite dahinter nicht mitscrollen -
     sonst verliert man beim Schliessen seine Stelle. Der Tastaturfokus wandert
     in die Flaeche und beim Schliessen zurueck auf die Schaltflaeche; sonst
     faengt er nach dem Schliessen wieder ganz oben an. */
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    // Die Schaltflaeche jetzt merken: Beim Aufraeumen kann die Ref schon auf
    // etwas anderes zeigen.
    const toggle = toggleRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      // Nicht beim Seitenwechsel: Dort ist die Schaltflaeche schon weg.
      if (toggle && document.body.contains(toggle)) toggle.focus();
    };
  }, [isOpen]);

  return <div className={`mobile-navigation ${isOpen ? "is-open" : ""}`}>
    <button className="mobile-nav-toggle" type="button" aria-expanded={isOpen} aria-controls="mobile-navigation-panel" onClick={() => setIsOpen(true)} ref={toggleRef}>
      <span className="sr-only">Menü öffnen</span>
      <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
    </button>
    {isOpen && <>
      <button className="mobile-nav-backdrop" type="button" aria-label="Menü schließen" onClick={() => setIsOpen(false)} />
      <div className="mobile-nav-panel" id="mobile-navigation-panel" role="dialog" aria-modal="true" aria-label="Menü">
        <div className="mobile-nav-top">
          <MobileNavStatus />
          <button className="mobile-nav-close" type="button" onClick={() => setIsOpen(false)} ref={closeRef}>
            <span className="sr-only">Menü schließen</span>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <nav className="mobile-nav-pages" aria-label="Hauptnavigation">
          {pages.map(([href, label]) => <Link href={href} key={href} onClick={() => setIsOpen(false)}>{label}<i aria-hidden="true">&#8594;</i></Link>)}
        </nav>
        <div className="mobile-nav-legal">
          {legalLinks.map(([href, label]) => <Link href={href} key={href} onClick={() => setIsOpen(false)}>{label}</Link>)}
          <ConsentSettingsLink />
        </div>
      </div>
    </>}
  </div>;
}

type Stats = { total: number; goal: number };

/**
 * Der Kopf des Menues: die Zahl, um die es geht, und wie lange noch.
 *
 * Beide Angaben sind optional. Vor dem Start liefert /api/stats bewusst einen
 * Fehler (es gibt noch nichts zu zaehlen) - dann steht hier nur die Uhr. Steht
 * auch der Zeitraum nicht fest, faellt der ganze Kopf weg, statt eine leere
 * Flaeche zu zeigen.
 */
function MobileNavStatus() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaign, setCampaign] = useState<CampaignDates>({ startAt: null, endAt: null });
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) return;
        const data = await response.json() as Stats;
        if (active) setStats({ total: data.total, goal: data.goal });
      } catch {
        // Ohne Zahl bleibt die Uhr - das Menue funktioniert trotzdem.
      }
    })();

    void (async () => {
      try {
        const response = await fetch("/api/campaign", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as CampaignDates;
        if (active) setCampaign({ startAt: data.startAt, endAt: data.endAt });
      } catch {
        // Ohne Zeitraum bleibt die Zahl.
      }
    })();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const phase = campaignPhaseAt(campaign, now);
  const target = phase === "before" ? campaign.startAt : phase === "open" ? campaign.endAt : null;
  const remaining = target ? Date.parse(target) - now : Number.NaN;
  const countdown = Number.isNaN(remaining) ? null : formatRemaining(remaining);

  if (!stats && !countdown) return <p className="mobile-nav-brand">Reparaturrekord NRW</p>;

  return <div className="mobile-nav-status">
    {stats && <>
      <p className="mobile-nav-status-label">{phase === "after" ? "Endstand" : "Reparaturen bisher"}</p>
      <p className="mobile-nav-status-number">{stats.total.toLocaleString("de-DE")}</p>
    </>}
    {countdown && <p className="mobile-nav-status-time">{phase === "before" ? "Start in" : "Noch"} {countdown}</p>}
  </div>;
}

/** Grob genug fuer eine Menuezeile: Tage und Stunden, sonst Stunden und Minuten. */
function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days} ${days === 1 ? "Tag" : "Tage"}, ${hours} Std.`;
  if (hours > 0) return `${hours} Std., ${minutes} Min.`;
  return `${minutes} Min.`;
}
