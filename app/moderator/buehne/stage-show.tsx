"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CategoryMotif } from "@/components/category-motif";

export type StageSlide = {
  id: string;
  title: string;
  teaser: string;
  category: string;
  categoryLabel: string;
  kreis: string | null;
  imageUrl: string | null;
};

const AUTOPLAY_SECONDS = 20;

/**
 * Die Diashow selbst. Bedienung mit Tastatur oder Presenter-Klicker:
 *
 * - Pfeil rechts, Leertaste, Bild ab: weiter · Pfeil links, Bild auf: zurueck
 * - F: Vollbild · A: automatisch weiter · R: neu laden · Pos1: erste Folie
 *
 * Ein Klick auf die rechte Haelfte blaettert weiter, auf die linke zurueck.
 * Alle Fotos laden sofort im Hintergrund, damit beim Blaettern nichts nachlaedt.
 */
export default function StageShow({ slides, error }: { slides: StageSlide[]; error: string }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const count = slides.length;
  const current = count ? slides[Math.min(index, count - 1)] : null;

  const go = useCallback((step: number) => {
    if (!count) return;
    setIndex((value) => (value + step + count) % count);
  }, [count]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (["arrowright", " ", "pagedown", "enter"].includes(key)) { event.preventDefault(); go(1); }
      else if (["arrowleft", "pageup", "backspace"].includes(key)) { event.preventDefault(); go(-1); }
      else if (key === "home") setIndex(0);
      else if (key === "a") setAutoplay((value) => !value);
      else if (key === "r") router.refresh();
      else if (key === "h") setShowHelp((value) => !value);
      else if (key === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      }
      setShowHelp(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router]);

  useEffect(() => {
    if (!autoplay || count < 2) return;
    const timer = window.setInterval(() => go(1), AUTOPLAY_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [autoplay, count, go]);

  if (!current) {
    return <main className="stage-show is-empty">
      <p className="stage-kicker">Reparaturrekord NRW</p>
      <h1>{error || "Noch keine geprüften Highlights."}</h1>
      <p className="stage-teaser">Im Highlight-Eimer eine Geschichte auf „Geprüft · auf die Bühne“ setzen, dann hier R drücken.</p>
    </main>;
  }

  return <main
    className={`stage-show${current.imageUrl ? "" : " is-text-only"}`}
    onClick={(event) => go(event.clientX > window.innerWidth / 2 ? 1 : -1)}
  >
    <div className="stage-photo" aria-hidden={!current.imageUrl}>
      {current.imageUrl
        // eslint-disable-next-line @next/next/no-img-element -- Signierte Adresse aus dem privaten Bucket.
        ? <><img className="stage-photo-blur" src={current.imageUrl} alt="" /><img key={current.id} className="stage-photo-main" src={current.imageUrl} alt="" /></>
        : <CategoryMotif category={current.category} size={420} priority />}
    </div>
    <section className="stage-text" key={current.id} aria-live="polite">
      <p className="stage-kicker">{current.categoryLabel}{current.kreis ? ` · ${current.kreis}` : ""}</p>
      <h1>{current.title}</h1>
      <p className="stage-teaser">{current.teaser}</p>
    </section>
    <footer className="stage-footer">
      <span>Reparaturrekord NRW · Weltrekordversuch Reparieren</span>
      <span>{autoplay ? "▶ " : ""}{Math.min(index, count - 1) + 1} / {count}</span>
    </footer>
    {showHelp && <p className="stage-help">→ weiter · ← zurück · F Vollbild · A automatisch · R neu laden · H Hilfe</p>}
    <div hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- Vorladen fuer ruckelfreies Blaettern. */}
      {slides.map((slide) => slide.imageUrl && <img key={slide.id} src={slide.imageUrl} alt="" />)}
    </div>
  </main>;
}
