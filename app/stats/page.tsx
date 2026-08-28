"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./dashboard.css";
import { goalLaps, mergeDashboardDelta, type DashboardDelta, type DashboardSnapshot } from "@/lib/dashboard";
import { rankKreise } from "@/lib/nrw-map";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { RepairCloud } from "./repair-cloud";
import { RecordCounter } from "./record-counter";
import { LiveTicker } from "./live-ticker";
import { CategoryTreemap, DayRecord, DeadlineCountdown, KreisTop, MetricTiles, categoryColor } from "./panels";
import { StageSettings } from "./stage-settings";
import { SubmitQr } from "./submit-qr";

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
const CELEBRATION_MS = 14_000;
const TOP_KREISE = 20;
const EMPTY_KREIS_COUNTS: Record<string, number> = {};

type Status = "loading" | "ready" | "closed" | "error";

export default function LiveDashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [arrivals, setArrivals] = useState<{ id: string; kreis: string | null }[]>([]);
  const [spotlight, setSpotlight] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [clock, setClock] = useState("");
  // Basis fuer die relativen Zeitangaben im Laufband; laeuft mit der Uhr mit.
  // Startwert 0 statt Date.now(): Auf dem Server gaebe das eine andere Zeit als
  // im Browser und damit einen Hydration-Konflikt.
  const [nowMs, setNowMs] = useState(0);
  // Zaehler im Vollbild: fuer den Moment, in dem nur die Zahl zaehlt.
  const [counterFullscreen, setCounterFullscreen] = useState(false);
  // Einzelne Reparaturen als Bild zeigen. Abschaltbar, weil der Spotlight mitten
  // auf der Karte liegt und nicht auf jede Buehne gehoert.
  const [showSpotlight, setShowSpotlight] = useState(true);
  // Beamer-Modus: reines Schwarz statt des dunklen Blaus. Ein DLP-Projektor
  // schaltet dort das Licht ganz ab, was den Kontrast deutlich anhebt.
  const [beamer, setBeamer] = useState(false);

  /**
   * Kreisstaende beim ersten Snapshot mit Herkunftsdaten - Bezugsgroesse fuer den
   * Zuwachs in der Rangliste. Bewusst Zustand und keine Ref: Der Wert geht in die
   * Darstellung ein und muss ein Rendern ausloesen.
   */
  const [kreisBaseline, setKreisBaseline] = useState<Record<string, number> | null>(null);

  const cursorRef = useRef<string | null>(null);
  /** Letzte gefeierte Runde, damit dieselbe nicht zweimal gefeiert wird. */
  const celebratedLapRef = useRef(0);
  // Flaeche, in die die Karte gezeichnet wird. Die Canvas liegt ganzflaechig
  // hinter dem Layout, die Karte selbst gehoert aber in die Buehnenspalte.
  const stageRef = useRef<HTMLElement | null>(null);
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
      // Beim ersten Laden nicht feiern: Ein Dashboard, das mitten im Betrieb neu
      // startet, soll nicht sofort Konfetti werfen.
      celebratedLapRef.current = Math.max(celebratedLapRef.current, goalLaps(data.total, data.goal));

      // Bezugsstand fuer den Zuwachs: der erste Snapshot, der ueberhaupt
      // Kreis-Summen enthaelt. Ein leerer Stand als Bezug wuerde spaeter jede
      // Reparatur als neu ausweisen.
      if (Object.keys(data.kreise).length > 0) setKreisBaseline((current) => current ?? data.kreise);

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
          setArrivals(delta.added.map((item) => ({ id: item.id, kreis: item.mapKreis })));
        }
        setSnapshot((current) => (current ? mergeDashboardDelta(current, delta) : current));
      } catch {
        // Ein verpasstes Delta holt der naechste Snapshot wieder ein.
      }
    }, DELTA_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  // Zielerreichung feiern - und jede weitere volle Runde genauso. Der Rekord
  // ist mit dem Ziel nicht zu Ende, also ist das Feiern nicht einmalig.
  const laps = snapshot ? goalLaps(snapshot.total, snapshot.goal) : 0;
  useEffect(() => {
    if (laps === 0 || laps <= celebratedLapRef.current) return;
    celebratedLapRef.current = laps;
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [laps]);

  // Spotlight: alle 20 Sekunden faehrt die Kamera fuenf Sekunden auf ein Bild.
  // Sind die Einzelbilder aus, laeuft der Zyklus nicht; ein zurueckgesetzter
  // Zustand ist dann nicht noetig, weil `featured` weiter unten ohnehin sperrt.
  const highlightCount = showSpotlight ? snapshot?.highlights.length ?? 0 : 0;
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

  // Tastatur: F schaltet das Vollbild des Zaehlers, B die Einzelbilder. Auf einer
  // Buehne ist das bequemer als eine Schaltflaeche zu treffen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "f" || event.key === "F") setCounterFullscreen((current) => !current);
      else if (event.key === "b" || event.key === "B") setShowSpotlight((current) => !current);
      else if (event.key === "Escape") setCounterFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
      setNowMs(now.getTime());
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const featured = showSpotlight && spotlight !== null ? snapshot?.highlights[spotlight] ?? null : null;

  // Reparaturen je Kreis - kommt bereits fertig aggregiert vom Server statt
  // hier aus den Herkunftszellen neu berechnet zu werden.
  const kreisCounts = snapshot?.kreise ?? EMPTY_KREIS_COUNTS;
  const kreisRanking = useMemo(
    () => rankKreise(kreisCounts, kreisBaseline ?? {}, TOP_KREISE),
    [kreisCounts, kreisBaseline],
  );

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
    <main className={`dashboard-root ${celebrating ? "is-celebrating" : ""} ${beamer ? "is-beamer" : ""}`}>
      <RepairCloud
        arrivals={arrivals}
        beamer={beamer}
        celebrating={celebrating}
        cells={snapshot.cells}
        focusId={featured?.id ?? null}
        frameRef={stageRef}
        kreisCounts={kreisCounts}
        total={snapshot.total}
      />

      <div className="dashboard-grid">
        <header className="dashboard-bar">
          <Link className="dashboard-brand" href="/">
            <span className="brand-mark" aria-hidden="true">R</span>
            <span>Reparaturrekord<br />NRW</span>
          </Link>
          <p className="dashboard-live"><i aria-hidden="true" />Live aus Nordrhein-Westfalen</p>
          <div className="dashboard-tools">
            <p className="dashboard-clock">{clock} Uhr</p>
            <StageSettings
              beamer={beamer}
              onToggleBeamer={() => setBeamer((current) => !current)}
              onToggleSpotlight={() => setShowSpotlight((current) => !current)}
              showSpotlight={showSpotlight}
            />
          </div>
        </header>

        <section className="dashboard-panel panel-left">
          {/* Im Vollbild zieht der Zaehler nach unten aus dem Panel heraus. Er
              kann nicht einfach `position: fixed` bekommen: Das `backdrop-filter`
              des Panels macht dieses selbst zum Bezugsrahmen. */}
          {!counterFullscreen && (
            <RecordCounter
              celebrating={celebrating}
              fullscreen={false}
              goal={snapshot.goal}
              onToggleFullscreen={() => setCounterFullscreen(true)}
              total={snapshot.total}
            />
          )}
          <MetricTiles snapshot={snapshot} />
          <p className="panel-label">Aktivste Kreise</p>
          <KreisTop ranking={kreisRanking} />
        </section>

        <section className="dashboard-stage" aria-label="Karte der Reparaturen" ref={stageRef}>
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
        </section>

        {/* Steht ausserhalb der Buehne im Laufbandstreifen: Innerhalb lag der
            Text ueber der Karte, und der Umriss von NRW reicht dort bis unten. */}
        <p className="stage-note">
          {snapshot.cells.length > 0
            ? "Jeder Punkt steht fuer eine Reparatur."
            : "Jeder Punkt steht fuer eine Reparatur. Die Standorte sind aus Datenschutzgruenden stilisiert."}
          <span className="stage-credit">Kartendaten © OpenStreetMap-Mitwirkende</span>
        </p>

        <section className="dashboard-panel panel-right">
          <p className="panel-label">Was repariert wird</p>
          <CategoryTreemap categories={snapshot.categories} />
          <p className="panel-label">Noch Zeit bis zum Ende</p>
          <DeadlineCountdown campaign={snapshot.campaign} goal={snapshot.goal} nowMs={nowMs} total={snapshot.total} />
          <DayRecord snapshot={snapshot} />
          <SubmitQr />
        </section>

        <LiveTicker highlights={snapshot.highlights} nowMs={nowMs} />
      </div>

      {/* Ausserhalb des Rasters: hier gibt es keinen Filter, der den festen
          Bezugsrahmen des Viewports brechen wuerde. */}
      {counterFullscreen && (
        <div className="counter-overlay">
          <RecordCounter
            celebrating={celebrating}
            fullscreen
            goal={snapshot.goal}
            onToggleFullscreen={() => setCounterFullscreen(false)}
            total={snapshot.total}
          />
        </div>
      )}
    </main>
  );
}
