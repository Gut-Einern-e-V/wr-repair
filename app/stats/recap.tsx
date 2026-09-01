"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "./recap.css";
import { CategoryMotif } from "@/components/category-motif";
import type { CampaignDates } from "@/lib/campaign-phase";
import { formatMinutes } from "@/lib/dashboard";
import type { PublicStats } from "@/lib/public-stats";
import { repairCategoryLabel } from "@/lib/repair-catalog";

/**
 * Rueckblick auf den Weltrekordversuch (Issue #66).
 *
 * Steht unter /stats, sobald der Einreichungszeitraum vorbei ist. Anders als
 * die Buehne fuellt er nicht einen Bildschirm, sondern ist eine Seite zum
 * Scrollen und Lesen: Das Ergebnis am Ziel gemessen, jeder Tag einzeln, und
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

function parseDay(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

export default function Recap({ campaign }: { campaign: CampaignDates }) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

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
    const peak = timeline.reduce((highest, day) => Math.max(highest, day.total), 0);
    const activeDays = timeline.filter((day) => day.total > 0).length;
    const categories = Object.entries(stats.categories).sort(([, left], [, right]) => right - left);
    const categoryMinutes = Object.entries(stats.categoryMinutes)
      .filter(([, minutes]) => minutes > 0)
      .sort(([, left], [, right]) => right - left);
    const kreise = Object.entries(stats.kreise).sort(([, left], [, right]) => right - left);

    return {
      timeline,
      peak,
      activeDays,
      categories,
      categoryMinutes,
      kreise,
      reached: stats.goal > 0 && stats.total >= stats.goal,
      percent: stats.goal > 0 ? (stats.total / stats.goal) * 100 : 0,
      perDay: timeline.length > 0 ? stats.total / timeline.length : 0,
      successRate: stats.total > 0 ? (stats.succeeded / stats.total) * 100 : 0,
    };
  }, [stats]);

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
    <main className={`recap-root${derived.reached ? " is-reached" : ""}`}>
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
          {derived.reached ? "Wir haben das Ziel geknackt." : "So weit sind wir gekommen."}
        </h1>
        <p className="recap-total">{stats.total.toLocaleString("de-DE")}</p>
        <p className="recap-total-label">gezählte Reparaturen in Nordrhein-Westfalen</p>
        <div className="recap-goal">
          <div className="recap-goal-track" aria-hidden="true">
            <span style={{ width: `${Math.min(derived.percent, 100)}%` }} />
          </div>
          <p>
            {derived.percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % des Ziels von{" "}
            {stats.goal.toLocaleString("de-DE")}
            {derived.reached
              ? ` – ${(stats.total - stats.goal).toLocaleString("de-DE")} mehr als geplant.`
              : ` – ${(stats.goal - stats.total).toLocaleString("de-DE")} haben gefehlt.`}
          </p>
        </div>
      </section>

      <section className="recap-days" aria-labelledby="recap-days-title">
        <h2 id="recap-days-title">Jeder Tag einzeln</h2>
        <ol className="recap-chart" aria-label={`Reparaturen je Tag, Höchstwert ${derived.peak}`}>
          {derived.timeline.map((day) => (
            <li
              key={day.date}
              className={stats.bestDay?.date === day.date ? "is-best" : ""}
              title={`${longDayFormat.format(parseDay(day.date))}: ${day.total.toLocaleString("de-DE")}`}
            >
              <span className="recap-day-bar" style={{ height: `${derived.peak > 0 ? Math.max((day.total / derived.peak) * 100, day.total > 0 ? 2 : 0) : 0}%` }} />
              <span className="recap-bar-day">{dayFormat.format(parseDay(day.date))}</span>
            </li>
          ))}
        </ol>
        <p className="recap-days-note">
          {stats.bestDay
            ? <>Bester Tag: <strong>{longDayFormat.format(parseDay(stats.bestDay.date))}</strong> mit {stats.bestDay.total.toLocaleString("de-DE")} Reparaturen.</>
            : "Für einen besten Tag reichen die Zahlen nicht."}
          {" "}An {derived.activeDays.toLocaleString("de-DE")} von {derived.timeline.length.toLocaleString("de-DE")} Tagen kam mindestens eine Reparatur dazu, im Schnitt {derived.perDay.toLocaleString("de-DE", { maximumFractionDigits: 1 })} pro Tag.
        </p>
      </section>

      <section className="recap-numbers" aria-labelledby="recap-numbers-title">
        <h2 id="recap-numbers-title">Was dahintersteckt</h2>
        <ol className="recap-tiles">
          <li><strong>{formatMinutes(stats.minutesSaved)}</strong><span>Reparaturzeit, so weit angegeben</span></li>
          <li><strong>{Math.round(stats.valueSavedEuros).toLocaleString("de-DE")} &euro;</strong><span>Wert der Gegenstände, die geblieben sind</span></li>
          <li><strong>{derived.successRate.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %</strong><span>der Reparaturen sind geglückt</span></li>
          <li><strong>{derived.kreise.length.toLocaleString("de-DE")}</strong><span>Kreise und kreisfreie Städte haben mitgemacht</span></li>
          <li><strong>{stats.withStory.toLocaleString("de-DE")}</strong><span>Einreichungen mit erzählter Geschichte</span></li>
          <li><strong>{derived.categories.length.toLocaleString("de-DE")}</strong><span>Kategorien kamen zusammen</span></li>
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

      <div className="recap-columns">
        <section aria-labelledby="recap-categories-title">
          <h2 id="recap-categories-title">Was repariert wurde</h2>
          <ol className="recap-ranking">
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

        <section aria-labelledby="recap-kreise-title">
          <h2 id="recap-kreise-title">Wo repariert wurde</h2>
          <ol className="recap-ranking">
            {derived.kreise.slice(0, 12).map(([kreis, amount]) => (
              <li key={kreis}>
                <span className="recap-ranking-label">{kreis}</span>
                <span className="recap-ranking-track" aria-hidden="true">
                  <span style={{ width: `${(amount / (derived.kreise[0]?.[1] || 1)) * 100}%` }} />
                </span>
                <strong>{amount.toLocaleString("de-DE")}</strong>
              </li>
            ))}
          </ol>
          {derived.kreise.length > 12 && (
            <p className="recap-more">und {(derived.kreise.length - 12).toLocaleString("de-DE")} weitere</p>
          )}
        </section>
      </div>

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
