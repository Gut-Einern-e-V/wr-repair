"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useMemo, useState } from "react";
import "./recap.css";
import { CategoryMotif } from "@/components/category-motif";
import type { CampaignDates } from "@/lib/campaign-phase";
import { formatMinutes } from "@/lib/dashboard";
import { successShare, type PublicStats, type PublicStatsTimelineDay } from "@/lib/public-stats";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { DAY_PLACE_RECORD, MONTH_RECORD, recordMargin } from "@/lib/repair-records";
import { FactIcon, Trophy, type FactIconName } from "./recap-icons";
import { RecapPlaces } from "./recap-map";

/**
 * Rueckblick auf den Weltrekordversuch (Issue #66).
 *
 * Steht unter /stats, sobald der Einreichungszeitraum vorbei ist. Anders als
 * die Buehne fuellt er nicht einen Bildschirm, sondern ist eine Seite zum
 * Scrollen und Lesen: Das Ergebnis an den Rekorden gemessen, jeder Tag einzeln, und
 * ein paar Zahlen, die man sonst nirgends sieht - etwa wie viele Stunden in
 * Uhren steckten.
 *
 * Die Daten kommen aus `/api/stats` und nicht aus `/api/dashboard`: Die
 * Zeitachse der Buehne umfasst fest die letzten 30 Tage und trifft einen
 * laenger zurueckliegenden Zeitraum irgendwann gar nicht mehr. `/api/stats`
 * bekommt den Abschnitt als Parameter, kennt keine Einzeleintraege und keine
 * Bilder und liegt deshalb fuer alle gleich im CDN.
 */

const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });
const longDayFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });
const tipDayFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

/** So viele neue Orte nennt der Tooltip mit Namen, der Rest steht als "+n". */
const TIP_NEW_PLACES = 3;

/** Eine Geschichte, wie der Rueckblick sie anteasert (siehe page.tsx). */
export type RecapStory = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  image: { src: string; alt: string };
};

/**
 * Grober Faustwert fuer eingespartes CO2e je Reparatur: das Verhaeltnis, das
 * The BIG FIX 2025 gemeldet hat (rund 66.000 kg bei 2.532 Reparaturen, siehe
 * lib/repair-records.ts). Eine eigene Rechnung je Kategorie gibt es nicht -
 * die Seite sagt deshalb dazu, woher die Zahl kommt.
 */
const CO2_KG_PER_REPAIR = 66_000 / 2_532;

function parseDay(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

/**
 * Die beiden Tage, an denen die Kurve ausschlaegt, haben einen Grund. Ohne
 * Namen sieht ein Ausreisser nach Zufall oder Messfehler aus.
 */
const EVENT_DAYS: Record<string, string> = {
  "2026-10-17": "International Repair Day",
  "2026-10-31": "Repair & Share Festival",
};

/**
 * Obergrenze und Schrittweite der Hilfslinien: runde Werte (1, 2, 2,5 oder 5
 * mal eine Zehnerpotenz), etwa vier Linien. Die Balken skalieren auf die
 * Obergrenze, nicht auf den Hoechstwert, damit Linie und Balken zueinander
 * passen.
 */
function chartScale(peak: number) {
  if (peak <= 0) return { max: 1, ticks: [] as number[] };
  const rough = peak / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) ?? 10) * magnitude;
  const max = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  return { max, ticks };
}

export default function Recap({ campaign, stories }: { campaign: CampaignDates; stories: RecapStory[] }) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  /* Der Tag unter dem Tooltip: per Maus, oder per Fokus - Tastatur und
     Antippen auf dem Handy. Die Maus geht vor, solange sie ueber dem Diagramm
     ist. */
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const activeDay = hoveredDay ?? focusedDay;

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) throw new Error("unavailable");
        setStats(await response.json() as PublicStats);
        setState("ready");
      } catch {
        setState("error");
      }
    }

    void load();
  }, []);

  const derived = useMemo(() => {
    if (!stats) return null;

    const timeline = stats.timeline;
    /* Stand nach jedem Tag - "Stand danach" im Tooltip. */
    const running = timeline.reduce<number[]>((list, day) => [...list, (list.at(-1) ?? 0) + day.total], []);
    const peak = timeline.reduce((highest, day) => Math.max(highest, day.total), 0);
    const activeDays = timeline.filter((day) => day.total > 0).length;
    const categories = Object.entries(stats.categories).sort(([, left], [, right]) => right - left);
    const categoryMinutes = Object.entries(stats.categoryMinutes)
      .filter(([, minutes]) => minutes > 0)
      .sort(([, left], [, right]) => right - left);
    const kreise = Object.entries(stats.kreise).sort(([, left], [, right]) => right - left);

    return {
      timeline,
      running,
      peak,
      scale: chartScale(peak),
      activeDays,
      categories,
      categoryMinutes,
      kreise,
      /* Gemessen wird an den Weltrekorden, nicht am eigenen Ziel - siehe
         `recordMargin`. */
      monthMargin: recordMargin(stats.total, MONTH_RECORD),
      dayMargin: recordMargin(stats.bestKreisDay?.total, DAY_PLACE_RECORD),
      perDay: timeline.length > 0 ? stats.total / timeline.length : 0,
      successRate: successShare(stats.succeeded, stats.attempted, stats.total),
      hours: stats.minutesSaved / 60,
      /* Ueber den ganzen Zeitraum, Tag und Nacht - so liest sich die Zahl. */
      minutesPerRepair: stats.total > 0 ? (timeline.length * 24 * 60) / stats.total : 0,
      euroPerRepair: stats.total > 0 ? stats.valueSavedEuros / stats.total : 0,
      co2Tonnes: (stats.total * CO2_KG_PER_REPAIR) / 1000,
    };
  }, [stats]);

  /* Die Zahlen unter "Anschaulich gesagt", jeweils mit Zeichen. Fehlt eine
     Groesse, faellt die Kachel weg statt eine Null zu zeigen. */
  const facts = useMemo(() => {
    if (!stats || !derived) return [];
    const all = Object.values(stats.performedBy).reduce((sum, value) => sum + value, 0);
    const share = (key: string) => (all > 0 ? Math.round(((stats.performedBy[key] ?? 0) / all) * 100) : 0);
    const list: { icon: FactIconName; value: React.ReactNode; text: React.ReactNode }[] = [];
    if (derived.minutesPerRepair > 0) {
      list.push({ icon: "clock", value: <>alle {Math.round(derived.minutesPerRepair).toLocaleString("de-DE")}&nbsp;Minuten</>, text: <>eine gelungene Reparatur &ndash; {derived.timeline.length.toLocaleString("de-DE")} Tage lang, Tag und Nacht.</> });
    }
    if (derived.hours > 0) {
      list.push({ icon: "hourglass", value: <>{Math.round(derived.hours / 24).toLocaleString("de-DE")}&nbsp;Tage</>, text: <>würde eine Person ohne Pause brauchen, um alles allein zu reparieren &ndash; rund {(derived.hours / 1_700).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Arbeitsjahre.</> });
    }
    if (derived.euroPerRepair > 0) {
      list.push({ icon: "euro", value: <>{Math.round(derived.euroPerRepair).toLocaleString("de-DE")}&nbsp;&euro;</>, text: "war ein geretteter Gegenstand im Schnitt wert – Geld, das nicht in Neues gehen musste." });
    }
    if (all > 0) {
      list.push({ icon: "wrench", value: <>{(share("alone") + share("with_support")).toLocaleString("de-DE")}&nbsp;%</>, text: <>selbst repariert: {share("alone").toLocaleString("de-DE")}&nbsp;% ganz allein, {share("with_support").toLocaleString("de-DE")}&nbsp;% mit Hilfe &ndash; etwa im Repair Café.</> });
    }
    list.push({ icon: "leaf", value: <>&asymp;&nbsp;{Math.round(derived.co2Tonnes).toLocaleString("de-DE")}&nbsp;t&nbsp;CO&#8322;e</>, text: <>eingespart, grob geschätzt nach dem Verhältnis von The BIG FIX 2025 (etwa {Math.round(CO2_KG_PER_REPAIR)}&nbsp;kg je Reparatur). Einen eigenen Bericht mit genaueren Zahlen für NRW erarbeiten wir gerade.</> });
    return list;
  }, [stats, derived]);


  if (state !== "ready" || !stats || !derived) {
    return (
      <main className="recap-root is-standby">
        <p className="standby-mark">Reparaturrekord NRW</p>
        <p className="standby-message" role="status">
          {state === "error" ? "Der Rückblick ist gerade nicht verfügbar." : "Der Rückblick wird geladen."}
        </p>
      </main>
    );
  }

  return (
    <main className={`recap-root${derived.monthMargin !== null ? " is-reached" : ""}`}>
      <header className="recap-bar">
        <Link className="recap-brand" href="/">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Reparaturrekord<br />NRW</span>
        </Link>
        <p className="recap-period">
          {campaign.startAt && campaign.endAt
            ? <>{longDayFormat.format(new Date(campaign.startAt))} &ndash; {longDayFormat.format(new Date(campaign.endAt))}</>
            : "Rückblick"}
        </p>
      </header>

      {/* Das Ergebnis zuerst. Es ist die eine Frage, mit der jemand nach der
          Aktion auf diese Seite kommt. */}
      <section className="recap-result" aria-labelledby="recap-result-title">
        <p className="recap-kicker">Ergebnis</p>
        <h1 id="recap-result-title">
          {derived.monthMargin !== null ? "Wir haben den Weltrekord geknackt." : "So weit sind wir gekommen."}
        </h1>
        <p className="recap-total">{stats.total.toLocaleString("de-DE")}</p>
        <p className="recap-total-label">gezählte Reparaturen in Nordrhein-Westfalen</p>
        <ul className="recap-records">
          <li className={derived.monthMargin !== null ? "is-broken" : undefined}>
            {derived.monthMargin !== null && <Trophy />}
            <div>
              <strong>Monatsrekord</strong>
              {derived.monthMargin !== null && (
                <p className="recap-record-value">
                  +{derived.monthMargin.toLocaleString("de-DE")}
                  <small>über der alten Bestmarke</small>
                </p>
              )}
              <p>
                {derived.monthMargin !== null
                  ? <>{stats.total.toLocaleString("de-DE")} statt {MONTH_RECORD.toLocaleString("de-DE")} Reparaturen in einem Monat &ndash; die bisherige Bestmarke stammt von The BIG FIX 2024.</>
                  : <>Die Bestmarke liegt bei {MONTH_RECORD.toLocaleString("de-DE")} Reparaturen (The BIG FIX 2024).</>}
              </p>
            </div>
          </li>
          {stats.bestKreisDay && derived.dayMargin !== null && (
            <li className="is-broken">
              <Trophy />
              <div>
                <strong>Tagesrekord an einem Ort</strong>
                <p className="recap-record-value">
                  {stats.bestKreisDay.total.toLocaleString("de-DE")}
                  <small>an einem Tag in {stats.bestKreisDay.kreis}</small>
                </p>
                <p>
                  Am {longDayFormat.format(parseDay(stats.bestKreisDay.date))} &ndash; die bisherige Bestmarke lag bei{" "}
                  {DAY_PLACE_RECORD.toLocaleString("de-DE")} (Exeter 2019).
                </p>
              </div>
            </li>
          )}
        </ul>
      </section>

      <section className="recap-days" aria-labelledby="recap-days-title">
        <h2 id="recap-days-title">Jeder Tag einzeln</h2>
        <div className="recap-chart-frame">
          <div className="recap-chart-grid" aria-hidden="true">
            {derived.scale.ticks.map((tick) => (
              <span key={tick} style={{ bottom: `${(tick / derived.scale.max) * 100}%` }}>
                <span>{tick.toLocaleString("de-DE")}</span>
              </span>
            ))}
          </div>
          <ol className="recap-chart" aria-label={`Reparaturen je Tag, Höchstwert ${derived.peak}`} onMouseLeave={() => setHoveredDay(null)}>
            {derived.timeline.map((day, index) => {
              const event = EVENT_DAYS[day.date];
              const height = Math.max((day.total / derived.scale.max) * 100, day.total > 0 ? 1 : 0);
              const classes = [
                stats.bestDay?.date === day.date ? "is-best" : "",
                event ? "is-event" : "",
                index > derived.timeline.length - 4 ? "is-end" : "",
                activeDay === index ? "is-active" : "",
              ].filter(Boolean).join(" ");
              return (
                <li
                  key={day.date}
                  className={classes}
                  tabIndex={0}
                  aria-label={`${longDayFormat.format(parseDay(day.date))}: ${day.total.toLocaleString("de-DE")}`}
                  aria-describedby={activeDay === index ? "recap-day-tip" : undefined}
                  onMouseEnter={() => setHoveredDay(index)}
                  onFocus={() => setFocusedDay(index)}
                  onBlur={() => setFocusedDay(null)}
                >
                  <span className="recap-day-slot">
                    <span className="recap-day-bar" style={{ height: `${height}%` }} />
                    {/* Der staerkste Ort an diesem Tag als Anteil im Balken -
                        am Festivaltag Wuppertal, die Zahl hinter dem Tagesrekord. */}
                    {stats.bestKreisDay?.date === day.date && (
                      <>
                        <span className="recap-day-place" style={{ height: `${(stats.bestKreisDay.total / derived.scale.max) * 100}%` }} />
                        <span className="recap-day-place-label" style={{ bottom: `${(stats.bestKreisDay.total / derived.scale.max) * 100}%` }}>
                          davon {stats.bestKreisDay.kreis} <strong>{stats.bestKreisDay.total.toLocaleString("de-DE")}</strong>
                        </span>
                      </>
                    )}
                    {event && (
                      <span className="recap-day-event" style={{ bottom: `${height}%` }}>
                        <strong>{day.total.toLocaleString("de-DE")}</strong>
                        <span>{event}</span>
                      </span>
                    )}
                  </span>
                  <span className="recap-bar-day">{dayFormat.format(parseDay(day.date))}</span>
                </li>
              );
            })}
          </ol>
          {activeDay !== null && derived.timeline[activeDay] && (
            <DayTip
              day={derived.timeline[activeDay]}
              index={activeDay}
              count={derived.timeline.length}
              running={derived.running[activeDay]}
              perDay={derived.perDay}
            />
          )}
        </div>
        <p className="recap-days-note">
          {stats.bestDay
            ? <>Bester Tag: <strong>{longDayFormat.format(parseDay(stats.bestDay.date))}</strong> mit {stats.bestDay.total.toLocaleString("de-DE")} Reparaturen.</>
            : "Für einen besten Tag reichen die Zahlen nicht."}
          {" "}An {derived.activeDays.toLocaleString("de-DE")} von {derived.timeline.length.toLocaleString("de-DE")} Tagen kam mindestens eine Reparatur dazu, im Schnitt {derived.perDay.toLocaleString("de-DE", { maximumFractionDigits: 1 })} pro Tag.
        </p>
        {/* Der Tag an einem einzelnen Ort (Issue #75). Die Bestmarke, an der
            sich die Aktion misst, ist "an einem Tag und Ort" - dafuer ist der
            landesweite beste Tag darueber die falsche Zahl. */}
        {stats.bestKreisDay && (
          <p className="recap-days-note">
            Stärkster Tag an einem einzelnen Ort: <strong>{stats.bestKreisDay.kreis}</strong> mit{" "}
            {stats.bestKreisDay.total.toLocaleString("de-DE")} Reparaturen am{" "}
            {longDayFormat.format(parseDay(stats.bestKreisDay.date))}.
          </p>
        )}
      </section>

      <section className="recap-numbers" aria-labelledby="recap-numbers-title">
        <h2 id="recap-numbers-title">Was dahintersteckt</h2>
        <ol className="recap-tiles">
          <li><strong>{formatMinutes(stats.minutesSaved)}</strong><span>Reparaturzeit, so weit angegeben</span></li>
          <li><strong>{Math.round(stats.valueSavedEuros).toLocaleString("de-DE")}&nbsp;&euro;</strong><span>Wert der Gegenstände, die geblieben sind</span></li>
          <li><strong>{derived.successRate.toLocaleString("de-DE", { maximumFractionDigits: 0 })}&nbsp;%</strong><span>der Versuche sind geglückt</span></li>
          <li><strong>{derived.kreise.length.toLocaleString("de-DE")}</strong><span>Kreise und kreisfreie Städte haben mitgemacht</span></li>
          <li><strong>{stats.withStory.toLocaleString("de-DE")}</strong><span>Einreichungen mit erzählter Geschichte</span></li>
          <li><strong>{derived.categories.length.toLocaleString("de-DE")}</strong><span>Kategorien kamen zusammen</span></li>
        </ol>
      </section>

      <section className="recap-plain" aria-labelledby="recap-plain-title">
        <h2 id="recap-plain-title">Anschaulich gesagt</h2>
        <ol className="recap-plain-list">
          {facts.map((fact) => (
            <li key={fact.icon}>
              <FactIcon name={fact.icon} />
              <strong>{fact.value}</strong>
              <span>{fact.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {derived.categoryMinutes.length > 0 && (
        <section className="recap-time" aria-labelledby="recap-time-title">
          <h2 id="recap-time-title">Wo die Zeit hineinging</h2>
          <ol className="recap-time-list">
            {derived.categoryMinutes.slice(0, 6).map(([category, minutes]) => (
              <li key={category}>
                <CategoryMotif category={category} size={64} />
                <span className="recap-time-label">{repairCategoryLabel(category)}</span>
                <strong>{formatMinutes(minutes)}</strong>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="recap-categories" aria-labelledby="recap-categories-title">
        <h2 id="recap-categories-title">Was repariert wurde</h2>
        <ol className="recap-ranking is-wide">
          {derived.categories.slice(0, 12).map(([category, amount]) => (
            <li key={category}>
              <span className="recap-ranking-label">{repairCategoryLabel(category)}</span>
              <span className="recap-ranking-track" aria-hidden="true">
                <span style={{ width: `${(amount / (derived.categories[0]?.[1] || 1)) * 100}%` }} />
              </span>
              <strong>{amount.toLocaleString("de-DE")}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="recap-places" aria-labelledby="recap-kreise-title">
        <h2 id="recap-kreise-title">Wo repariert wurde</h2>
        <RecapPlaces kreise={stats.kreise} />
      </section>

      {stories.length > 0 && (
        <section className="recap-stories" aria-labelledby="recap-stories-title">
          <h2 id="recap-stories-title">Geschichten aus dem Oktober</h2>
          <ol className="recap-story-list">
            {stories.map((story) => (
              <li key={story.slug}>
                <Link href={`/stories/${story.slug}`}>
                  <span className="recap-story-image">
                    <NextImage src={story.image.src} alt={story.image.alt} fill sizes="(max-width: 720px) 100vw, 33vw" />
                  </span>
                  <span className="recap-story-category">{story.category}</span>
                  <strong>{story.title}</strong>
                  <span className="recap-story-summary">{story.summary}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="recap-footer">
        <p>
          Gezählt wurde, was die Moderation geprüft hat. Ortsangaben stehen nur als Summe je Kreis &ndash; nie als
          Koordinate.
        </p>
        <p className="recap-links">
          <Link href="/stories">Reparaturgeschichten lesen <span aria-hidden="true">&#8594;</span></Link>
          <Link href="/about">Über das Projekt <span aria-hidden="true">&#8594;</span></Link>
          <Link href="/">Zur Startseite <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </footer>
    </main>
  );
}

/**
 * Was einen Tag ausgemacht hat, beim Ueberfahren oder Antippen eines Balkens:
 * neben der Summe der Vergleich mit dem Schnitt, der Stand danach, der
 * staerkste Ort, die haeufigste Kategorie und die Orte, die an diesem Tag zum
 * ersten Mal dabei waren. Fehlt eine Angabe (aeltere Datenbankfunktion, Tag
 * ohne Reparatur), faellt die Zeile weg.
 *
 * Er steht neben dem Balken statt darueber, damit er weder den Balken noch
 * die Beschriftung der Festtage verdeckt: in der linken Haelfte rechts
 * daneben, in der rechten links.
 */
function DayTip({ day, index, count, running, perDay }: {
  day: PublicStatsTimelineDay;
  index: number;
  count: number;
  running: number;
  perDay: number;
}) {
  const leftHalf = index < count / 2;
  const style = leftHalf
    ? { left: `calc(var(--chart-inset) + (100% - var(--chart-inset)) * ${(index + 1) / count} + 8px)` }
    : { right: `calc((100% - var(--chart-inset)) * ${(count - index) / count} + 8px)` };
  const factor = perDay > 0 ? day.total / perDay : 0;
  const newPlaces = day.newKreise ?? [];

  return (
    <div id="recap-day-tip" className="recap-day-tip" role="tooltip" style={style}>
      <span className="recap-day-tip-date">{tipDayFormat.format(parseDay(day.date))}</span>
      <strong className="recap-day-tip-total">
        {day.total.toLocaleString("de-DE")} {day.total === 1 ? "Reparatur" : "Reparaturen"}
      </strong>
      {day.total > 0 && (
        <span className="recap-day-tip-meta">
          {factor.toLocaleString("de-DE", { maximumFractionDigits: 1 })}&times; Tagesschnitt &middot; Stand danach {running.toLocaleString("de-DE")}
        </span>
      )}
      {(day.topKreis || day.topCategory || newPlaces.length > 0) && (
        <dl>
          {day.topKreis && (
            <div>
              <dt>Vorne</dt>
              <dd>{day.topKreis.kreis} <strong>{day.topKreis.total.toLocaleString("de-DE")}</strong></dd>
            </div>
          )}
          {day.places !== undefined && day.places > 1 && (
            <div>
              <dt>Orte</dt>
              <dd>{day.places.toLocaleString("de-DE")} dabei</dd>
            </div>
          )}
          {day.topCategory && (
            <div>
              <dt>Meist</dt>
              <dd className="recap-day-tip-category">
                <CategoryMotif category={day.topCategory.category} size={22} />
                <span>{repairCategoryLabel(day.topCategory.category)} <strong>{day.topCategory.total.toLocaleString("de-DE")}</strong></span>
              </dd>
            </div>
          )}
          {newPlaces.length > 0 && (
            <div>
              <dt>Neu dabei</dt>
              <dd>
                {newPlaces.slice(0, TIP_NEW_PLACES).join(", ")}
                {newPlaces.length > TIP_NEW_PLACES && <span> +{(newPlaces.length - TIP_NEW_PLACES).toLocaleString("de-DE")}</span>}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
