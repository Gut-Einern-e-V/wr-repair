"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stats = {
  total: number;
  categories: Record<string, number>;
  timeline: { date: string; total: number }[];
};

const categoryLabels: Record<string, string> = {
  electrical_appliances: "Elektrogeraete",
  household_appliances: "Haushaltsgeraete",
  computers_and_communication: "Computer & Kommunikation",
  bicycles: "Fahrraeder",
  furniture: "Moebel",
  textiles_and_clothing: "Textilien & Kleidung",
  tools: "Werkzeuge",
  toys_and_leisure: "Spielzeug & Freizeit",
  other: "Sonstiges",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`));
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) {
          throw new Error("Die Statistik ist gerade nicht verfuegbar.");
        }

        setStats(await response.json() as Stats);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Die Statistik ist gerade nicht verfuegbar.");
      }
    }

    void loadStats();
  }, []);

  const categoryEntries = Object.entries(stats?.categories ?? {}).sort(([, left], [, right]) => right - left);
  const maxCategory = Math.max(...categoryEntries.map(([, total]) => total), 1);
  const maxTimeline = Math.max(...(stats?.timeline ?? []).map((day) => day.total), 1);

  return (
    <main className="stats-page">
      <header className="stats-header"><Link className="brand" href="/"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link><Link className="header-link" href="/">Startseite</Link></header>
      <section className="stats-hero"><p className="section-index">Live-Auswertung</p><h1>Reparaturen<br /><span>sichtbar</span> machen.</h1><p>Die Zahlen zeigen ausschliesslich freigegebene Einreichungen.</p></section>
      {error ? <p className="stats-message" role="alert">{error}</p> : !stats ? <p className="stats-message" role="status">Statistik wird geladen.</p> : <>
        <section className="stats-total" aria-label={`${stats.total} freigegebene Reparaturen`}><p>Freigegebene Reparaturen</p><strong>{stats.total.toLocaleString("de-DE")}</strong></section>
        <section className="stats-section" aria-labelledby="timeline-title"><div className="stats-section-heading"><p className="section-index">Letzte 30 Tage</p><h2 id="timeline-title">Freigaben im Verlauf</h2></div><div className="timeline-chart" role="img" aria-label="Tagesverlauf der in den letzten 30 Tagen freigegebenen Reparaturen">{stats.timeline.map((day, index) => <div className="timeline-day" key={day.date} title={`${formatDate(day.date)}: ${day.total}`}><span className="timeline-value">{day.total || ""}</span><i style={{ height: `${Math.max(day.total ? (day.total / maxTimeline) * 100 : 2, 2)}%` }} /><small>{index % 5 === 0 || index === stats.timeline.length - 1 ? formatDate(day.date) : ""}</small></div>)}</div></section>
        <section className="stats-section" aria-labelledby="categories-title"><div className="stats-section-heading"><p className="section-index">Kategorien</p><h2 id="categories-title">Was wurde repariert?</h2></div>{categoryEntries.length === 0 ? <p className="stats-message">Noch keine freigegebenen Reparaturen.</p> : <ol className="category-stats">{categoryEntries.map(([category, total]) => <li key={category}><div><strong>{categoryLabels[category] ?? category}</strong><span>{total}</span></div><i><b style={{ width: `${(total / maxCategory) * 100}%` }} /></i></li>)}</ol>}</section>
      </>}
    </main>
  );
}