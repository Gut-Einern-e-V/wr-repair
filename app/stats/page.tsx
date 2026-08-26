"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./dashboard.css";
import { mergeDashboardDelta, type DashboardDelta, type DashboardSnapshot } from "@/lib/dashboard";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { RepairCloud } from "./repair-cloud";
import { RecordCounter } from "./record-counter";
import { CategoryBars, MetricTiles, TimelineChart, categoryColor } from "./panels";

/**
 * Buehnen-Dashboard: fuellt genau einen Bildschirm, scrollt nicht und kommt
 * ohne Header, Footer und Navigation aus. Der dunkle Hintergrund ist fuer
 * Beamer-Projektionen gedacht.
 *
 * Datenstrategie (siehe app/api/dashboard/route.ts): einmal ein vollstaendiger
 * Snapshot, danach nur noch kleine Deltas. Selbst bei vielen gleichzeitig
 * laufenden Screens landet praktisch jede Abfrage im Vercel-CDN-Cache.
 */

const DELTA_INTERVAL_MS = 15_000;
const SNAPSHOT_INTERVAL_MS = 5 * 60_000;
const SPOTLIGHT_CYCLE_MS = 20_000;
const SPOTLIGHT_HOLD_MS = 5_000;

type Status = "loading" | "ready" | "closed" | "error";

export default function LiveDashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [arrivals, setArrivals] = useState<string[]>([]);
  const [spotlight, setSpotlight] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [clock, setClock] = useState("");

  const cursorRef = useRef<string | null>(null);
  const reachedRef = useRef(false);
  // Die Intervall-Callbacks werden nur einmal registriert und lesen den
  // aktuellen Stand deshalb ueber eine Ref statt ueber die Closure.
  const totalRef = useRef(0);
  useEffect(() => {
    totalRef.current = snapshot?.total ?? 0;
  }, [snapshot]);

  const loadSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.status === 403) {
        setStatus("closed");
        return;
      }
      if (!response.ok) throw new Error("unavailable");

      const data = await response.json() as DashboardSnapshot;
      cursorRef.current = data.cursor;
      reachedRef.current = data.total >= data.goal;
      setSnapshot(data);
      setStatus("ready");
    } catch {
      setStatus((current) => (current === "ready" ? current : "error"));
    }
  }, []);

  useEffect(() => {
    const load = () => void loadSnapshot();
    // Der erste Aufruf laeuft bewusst nach dem Effekt-Durchlauf, damit der
    // Snapshot den laufenden Render nicht erneut anstoesst.
    const initial = window.setTimeout(load, 0);
    const timer = window.setInterval(load, SNAPSHOT_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [loadSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const cursor = cursorRef.current;
      if (!cursor || document.hidden) return;

      try {
        const response = await fetch(`/api/dashboard?since=${encodeURIComponent(cursor)}`);
        if (!response.ok) return;

        const delta = await response.json() as DashboardDelta;
        if (delta.added.length === 0 && delta.total === totalRef.current) return;

        cursorRef.current = delta.cursor;
        if (delta.added.length > 0) {
          setArrivals(delta.added.map((item) => item.id));
        }
        setSnapshot((current) => (current ? mergeDashboardDelta(current, delta) : current));
      } catch {
        // Ein verpasstes Delta holt der naechste Snapshot wieder ein.
      }
    }, DELTA_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  // Zielerreichung feiern, sobald die Marke ueberschritten wird.
  useEffect(() => {
    if (!snapshot || snapshot.total < snapshot.goal || reachedRef.current) return;
    reachedRef.current = true;
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 12_000);
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  // Spotlight: alle 20 Sekunden faehrt die Kamera fuenf Sekunden auf ein Bild.
  const highlightCount = snapshot?.highlights.length ?? 0;
  useEffect(() => {
    if (highlightCount === 0) return;

    let index = 0;
    let hold = 0;
    const cycle = () => {
      setSpotlight(index % highlightCount);
      index += 1;
      hold = window.setTimeout(() => setSpotlight(null), SPOTLIGHT_HOLD_MS);
    };

    const timer = window.setInterval(cycle, SPOTLIGHT_CYCLE_MS);
    const initial = window.setTimeout(cycle, 4_000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initial);
      window.clearTimeout(hold);
    };
  }, [highlightCount]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const featured = spotlight !== null ? snapshot?.highlights[spotlight] ?? null : null;

  if (status !== "ready" || !snapshot) {
    return (
      <main className="dashboard-root is-standby">
        <p className="standby-mark">Reparaturrekord NRW</p>
        <p className="standby-message" role="status">
          {status === "closed"
            ? "Das Live-Dashboard laeuft waehrend des Weltrekordversuchs."
            : status === "error"
              ? "Die Live-Daten sind gerade nicht verfuegbar."
              : "Live-Daten werden geladen."}
        </p>
      </main>
    );
  }

  return (
    <main className={`dashboard-root ${celebrating ? "is-celebrating" : ""}`}>
      <RepairCloud
        arrivals={arrivals}
        celebrating={celebrating}
        focusId={featured?.id ?? null}
        total={snapshot.total}
      />

      <div className="dashboard-grid">
        <header className="dashboard-bar">
          <p className="dashboard-brand"><span aria-hidden="true">R</span>Reparaturrekord NRW</p>
          <p className="dashboard-live"><i aria-hidden="true" />Live aus Nordrhein-Westfalen</p>
          <p className="dashboard-clock">{clock} Uhr</p>
        </header>

        <section className="dashboard-panel panel-left">
          <RecordCounter goal={snapshot.goal} reached={snapshot.total >= snapshot.goal} total={snapshot.total} />
          <MetricTiles snapshot={snapshot} />
        </section>

        <section className="dashboard-stage" aria-label="Karte der Reparaturen">
          {featured && (
            <figure className="spotlight">
              {featured.imageUrl
                // Signierte Supabase-URLs laufen ab und wuerden vom Next-Optimizer zusaetzlich gecacht.
                // eslint-disable-next-line @next/next/no-img-element
                ? <img alt={featured.imageAltText ?? ""} src={featured.imageUrl} />
                : <div className="spotlight-placeholder" aria-hidden="true">{repairCategoryLabel(featured.category).charAt(0)}</div>}
              <figcaption>
                <span style={{ color: categoryColor(featured.category) }}>{repairCategoryLabel(featured.category)}</span>
                <strong>{featured.brandModel ?? "Frisch repariert"}</strong>
              </figcaption>
            </figure>
          )}
          <p className="stage-note">Jeder Punkt steht fuer eine Reparatur. Die Standorte sind aus Datenschutzgruenden stilisiert.</p>
        </section>

        <section className="dashboard-panel panel-right">
          <p className="panel-label">Was repariert wird</p>
          <CategoryBars categories={snapshot.categories} />
          <p className="panel-label">Freigaben der letzten 30 Tage</p>
          <TimelineChart timeline={snapshot.timeline} />
        </section>

        <footer className="dashboard-ticker" aria-hidden="true">
          <div>
            {[...snapshot.highlights, ...snapshot.highlights].map((item, index) => (
              <span key={`${item.id}-${index}`}>
                <i style={{ background: categoryColor(item.category) }} />
                {repairCategoryLabel(item.category)}
                {item.brandModel ? ` · ${item.brandModel}` : ""}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
