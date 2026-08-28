"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { repairCategories, repairCategoryLabel } from "@/lib/repair-catalog";
import { campaignElapsed, countdownTo, dayRecordState, formatDayLabel, formatMinutes, formatRemaining, goalPercent, paceVerdict, requiredPerHour, type DashboardSnapshot, type PaceVerdict } from "@/lib/dashboard";
import { type KreisRank } from "@/lib/nrw-map";
import { treemap } from "@/lib/treemap";

/** Feste Farbzuordnung, damit eine Kategorie ihre Farbe nie wechselt. */
const categoryColors: Record<string, string> = {
  computers_and_phones: "#465eab",
  bicycle: "#00b072",
  household_appliances: "#ffc432",
  furniture: "#ec424c",
  textiles: "#95d4bb",
  tools: "#f4bd4c",
  toys: "#8f6fd0",
  jewelry_glasses: "#e07ba8",
  watches: "#4fb8c9",
  photo_video_car: "#c2202b",
  sharpening: "#b4e0cc",
  other: "#8b93a7",
};

export function categoryColor(category: string) {
  return categoryColors[category] ?? "#8b93a7";
}

/**
 * Kategorien als Flaechenaufteilung.
 *
 * Vorher zwoelf Balken, von denen die meisten auf null standen - viel Zeile, wenig
 * Aussage. Die Flaeche einer Kachel ist der Anteil der Kategorie, leere Kategorien
 * entfallen, und aus zehn Metern erkennt man die groesste sofort.
 *
 * Das Seitenverhaeltnis der Kacheln haengt an dem der Flaeche, also wird sie
 * gemessen. Vor der ersten Messung liegen die Namen als Liste vor - ohne
 * Zwischenzustand mit falschen Proportionen.
 */
export function CategoryTreemap({ categories }: { categories: Record<string, number> }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const inputs = useMemo(
    () => repairCategories.map((item) => ({ key: item.value, value: categories[item.value] ?? 0 })),
    [categories],
  );
  const rects = useMemo(() => treemap(inputs, box.width, box.height), [inputs, box.width, box.height]);
  const total = inputs.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="category-map" ref={boxRef}>
      {rects.length === 0 && total === 0 && (
        <p className="category-map-empty">Die ersten Reparaturen erscheinen hier, sobald sie geprueft sind.</p>
      )}
      {rects.map((rect) => {
        // Beschriftung nur, wo sie hineinpasst - sonst bleibt die Farbflaeche
        // fuer sich, und die Zahl steht im Laufband und in der Sprechblase.
        const showLabel = rect.width > 74 && rect.height > 34;
        const showCount = rect.width > 44 && rect.height > 22;
        return (
          <div
            className="category-tile"
            key={rect.key}
            // Die Kategoriefarbe kommt nur als Variable herein. Gemischt wird sie
            // im Stylesheet, damit die Flaeche gedeckt und ruhig bleibt und die
            // volle Farbe allein in der Akzentkante steckt.
            style={{
              left: `${(rect.x / box.width) * 100}%`,
              top: `${(rect.y / box.height) * 100}%`,
              width: `${(rect.width / box.width) * 100}%`,
              height: `${(rect.height / box.height) * 100}%`,
              ["--tile" as string]: categoryColor(rect.key),
            }}
            title={`${repairCategoryLabel(rect.key)}: ${rect.value.toLocaleString("de-DE")}`}
          >
            {showLabel && <span className="category-tile-name">{repairCategoryLabel(rect.key)}</span>}
            {showCount && <strong className="category-tile-count">{rect.value.toLocaleString("de-DE")}</strong>}
          </div>
        );
      })}
    </div>
  );
}

const verdictText: Record<PaceVerdict["state"], string> = {
  ahead: "vor dem Plan",
  onTrack: "im Plan",
  behind: "hinter dem Plan",
};

/**
 * Restzeit und Soll-Ist-Vergleich.
 *
 * Ersetzt die Zeitachse der letzten 30 Tage, die auf einer Buehne vor allem
 * leere Tage zeigte. Eine blosse Uhr waere aber auch nur eine Uhr: Fuer einen
 * Rekordversuch lautet die Frage nicht "wie viel Zeit bleibt", sondern "reicht
 * sie". Deshalb stehen die beiden Balken untereinander - verbrauchte Zeit gegen
 * erreichten Anteil. Liegt der Rekordbalken zurueck, sieht man das sofort.
 *
 * Das noetige Tempo erscheint nur, solange es eine sinnvolle Zahl ergibt - also
 * wenn noch etwas fehlt und noch Zeit bleibt (siehe `requiredPerHour`).
 */
export function DeadlineCountdown({ campaign, total, goal, nowMs }: { campaign: DashboardSnapshot["campaign"]; total: number; goal: number; nowMs: number }) {
  const countdown = countdownTo(campaign.endAt, nowMs);

  if (!countdown) {
    return <p className="stage-countdown-note">Der Zeitraum fuer Einreichungen wird gerade eingerichtet.</p>;
  }

  if (countdown.expired) {
    return <p className="stage-countdown-note">Das Einreichungsfenster ist geschlossen. Danke an alle, die mitgemacht haben.</p>;
  }

  const missing = Math.max(0, goal - total);
  const pace = requiredPerHour(total, goal, countdown.totalMs);
  const reached = goalPercent(total, goal);
  const elapsed = campaignElapsed(campaign.startAt, campaign.endAt, nowMs);
  const verdict = elapsed === null ? null : paceVerdict(reached, elapsed);

  return (
    <div className="stage-countdown">
      <p className="stage-countdown-remaining">{formatRemaining(countdown)}</p>

      {/* Der eigentliche Punkt: nicht wie viel Zeit bleibt, sondern ob der
          Rekord mit ihr Schritt haelt. Zwei Balken uebereinander, damit der
          Vergleich ohne Rechnen sichtbar ist. */}
      {elapsed !== null && (
        <div className={`stage-countdown-race is-${verdict?.state ?? "onTrack"}`}>
          <span>Rekord</span>
          <span className="stage-countdown-bar"><i style={{ width: `${Math.min(100, reached)}%` }} /></span>
          <b>{Math.round(reached)} %</b>

          <span>Zeit</span>
          <span className="stage-countdown-bar is-time"><i style={{ width: `${elapsed}%` }} /></span>
          <b>{Math.round(elapsed)} %</b>
        </div>
      )}

      {verdict && (
        <p className={`stage-countdown-verdict is-${verdict.state}`}>
          {verdict.state === "onTrack"
            ? "Genau im Plan"
            : <>{Math.abs(Math.round(verdict.gap))} Punkte {verdictText[verdict.state]}</>}
        </p>
      )}

      <p className="stage-countdown-line">
        {missing > 0
          ? <>Noch <b>{missing.toLocaleString("de-DE")}</b> bis zum Ziel{pace !== null && <>, das sind <b>{pace < 10 ? pace.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : Math.ceil(pace).toLocaleString("de-DE")}</b> pro Stunde</>}</>
          : <>Das Ziel steht - jede weitere Reparatur baut den Rekord aus.</>}
      </p>
    </div>
  );
}

/**
 * Der heutige Tag gegen den bisherigen Tagesrekord.
 *
 * Steht direkt unter dem Countdown, weil beide dieselbe Frage stellen: Der
 * Countdown die fuer die ganze Aktion, dieser Block die fuer den einzelnen Tag.
 * Ein Tag ist dabei der Einreichungstag - der Tag, an dem geschraubt wurde, und
 * nicht der, an dem die Moderation die Eintraege abgearbeitet hat.
 *
 * Ohne Rekord und ohne heutige Reparatur gibt es nichts zu zeigen: Dann bleibt
 * der Block ganz weg, statt eine Null gegen eine Null laufen zu lassen.
 */
export function DayRecord({ snapshot }: { snapshot: DashboardSnapshot }) {
  const state = dayRecordState(snapshot.today, snapshot.bestDay, snapshot.dayRecord);
  if (state.record === 0 && snapshot.today === 0) return null;

  const dayLabel = formatDayLabel(state.date);

  return (
    <div className={`stage-dayrecord ${state.broken ? "is-record" : ""}`}>
      <p className="stage-dayrecord-head">
        <strong>{snapshot.today.toLocaleString("de-DE")}</strong>
        <span>heute</span>
      </p>

      {state.record > 0 && (
        <span className="stage-dayrecord-bar">
          <i style={{ width: `${state.progress}%` }} />
        </span>
      )}

      <p className="stage-dayrecord-line">
        {state.record === 0
          ? <>Der erste gezaehlte Tag - was heute zusammenkommt, ist die Marke.</>
          : state.broken
            ? <>Neuer Tagesrekord, <b>{state.lead.toLocaleString("de-DE")}</b> ueber den bisherigen <b>{state.record.toLocaleString("de-DE")}</b></>
            : state.missing === 0
              ? <>Gleichauf mit dem Tagesrekord von <b>{state.record.toLocaleString("de-DE")}</b>{dayLabel && <> vom {dayLabel}</>}</>
              : <>Noch <b>{state.missing.toLocaleString("de-DE")}</b> bis zum Tagesrekord von <b>{state.record.toLocaleString("de-DE")}</b>{dayLabel && <> vom {dayLabel}</>}</>}
      </p>
    </div>
  );
}

/** Ab dieser Laenge wandert die Liste; darunter passt sie ohnehin ins Panel. */
const KREIS_SCROLL_FROM = 8;
/** Sekunden je Zeile fuer eine Richtung - langsam genug zum Mitlesen. */
const KREIS_SECONDS_PER_ROW = 1.9;

/**
 * Rangliste der aktivsten Kreise.
 *
 * Der Zuwachs bezieht sich auf den Start dieser Anzeige - eine Zeitreihe je
 * Kreis liefert das Aggregat nicht (siehe `rankKreise`). Ohne Zuwachs bleibt die
 * Spalte leer, statt eine Null hinzuschreiben, die wie ein Stillstand aussieht.
 */
export function KreisTop({ ranking }: { ranking: KreisRank[] }) {
  if (ranking.length === 0) {
    return <p className="kreis-top-empty">Sobald genug Reparaturen je Ort zusammenkommen, erscheint hier die Rangliste.</p>;
  }

  const max = Math.max(...ranking.map((entry) => entry.total), 1);
  // Die Liste faehrt hinunter und wieder hinauf (CSS: `alternate`). Anders als
  // ein Endlosband braucht das keine zweite Kopie der Eintraege, und der erste
  // Platz bleibt regelmaessig zu sehen statt einmal pro Runde vorbeizuziehen.
  const sweeps = ranking.length >= KREIS_SCROLL_FROM;

  return (
    <div className={`kreis-top-viewport ${sweeps ? "is-sweeping" : ""}`}>
      <ol
        className="kreis-top"
        style={sweeps ? { animationDuration: `${(ranking.length * KREIS_SECONDS_PER_ROW).toFixed(0)}s` } : undefined}
      >
        {ranking.map((entry, index) => (
          <li key={entry.name}>
            <span className="kreis-top-rank" aria-hidden="true">{index + 1}</span>
            <span className="kreis-top-name">{entry.name}</span>
            <span className="kreis-top-track"><i style={{ width: `${(entry.total / max) * 100}%` }} /></span>
            <span className="kreis-top-total">{entry.total.toLocaleString("de-DE")}</span>
            <span className="kreis-top-delta">{entry.delta > 0 ? `+${entry.delta.toLocaleString("de-DE")}` : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Kennzahlen neben dem Zaehler.
 *
 * Bewusst nur drei: Erfolgsquote, Zeit und Warenwert. "Erzaehlte Geschichten"
 * und "haeufigste Reparaturart" standen daneben, ohne auf einer Buehne etwas
 * beizutragen - die Felder kommen weiter mit dem Aggregat, werden hier aber
 * nicht gezeigt.
 */
export function MetricTiles({ snapshot }: { snapshot: DashboardSnapshot }) {
  const successRate = snapshot.total > 0 ? (snapshot.succeeded / snapshot.total) * 100 : 0;

  return (
    <ul className="metric-tiles">
      <li>
        <strong>{successRate.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %</strong>
        <span>erfolgreich repariert</span>
      </li>
      <li>
        <strong>{formatMinutes(snapshot.minutesSaved)}</strong>
        <span>investierte Schrauberzeit</span>
      </li>
      <li>
        <strong>{Math.round(snapshot.valueSavedEuros).toLocaleString("de-DE")} €</strong>
        <span>Warenwert gerettet</span>
      </li>
    </ul>
  );
}
