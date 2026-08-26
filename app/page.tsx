"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { CampaignWindowNotice } from "@/components/campaign-window-notice";
import { MobileNavigation } from "@/components/mobile-navigation";
import { RepairSubmissionForm } from "@/components/repair-submission-form";
import { brandPhotos } from "@/lib/brand-photos";
import { repairCategories, repairCategoryLabel, type RepairCategory } from "@/lib/repair-catalog";

type GalleryRepair = {
  id: string;
  category: string;
  productName: string | null;
  description: string | null;
  imageAltText: string | null;
  imageUrl: string | null;
};

type RepairStats = {
  total: number;
  categories: Record<string, number>;
};

type CampaignStatus = {
  status: "open" | "before" | "after" | "invalid";
  startAt: string | null;
};

function useAnimatedCounter(value: number | null) {
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const previousValue = useRef(value ?? 0);

  useEffect(() => {
    if (value === null) return;
    const startValue = previousValue.current;
    const startedAt = performance.now();
    const duration = 900;
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previousValue.current = value;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return displayValue;
}

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState<RepairCategory>(repairCategories[0].value);
  const [repairCount, setRepairCount] = useState<number | null>(null);
  const [repairStats, setRepairStats] = useState<RepairStats | null>(null);
  const [statsState, setStatsState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [galleryRepairs, setGalleryRepairs] = useState<GalleryRepair[]>([]);
  const [galleryError, setGalleryError] = useState("");
  const [campaign, setCampaign] = useState<CampaignStatus>({ status: "invalid", startAt: null });
  const animatedRepairCount = useAnimatedCounter(repairCount);

  useEffect(() => {
    async function loadRepairCount() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) {
          throw new Error("Statistik nicht verfuegbar");
        }

        const stats = await response.json() as RepairStats;
        setRepairCount(stats.total);
        setRepairStats(stats);
        setStatsState("ready");
        setStatsUpdatedAt(new Date());
      } catch {
        setStatsState("unavailable");
      }
    }

    void loadRepairCount();
    const interval = window.setInterval(() => void loadRepairCount(), 300_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadGallery() {
      const response = await fetch("/api/gallery");
      if (!response.ok) {
        setGalleryError("Die Galerie wird gerade vorbereitet.");
        return;
      }

      const data = await response.json() as { repairs: GalleryRepair[] };
      setGalleryRepairs(data.repairs);
    }

    void loadGallery();
  }, []);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch("/api/campaign", { cache: "no-store" });
        if (!response.ok) throw new Error("Kampagnenstatus nicht verfuegbar");
        const data = await response.json() as CampaignStatus;
        setCampaign(data);
      } catch {
        setCampaign({ status: "invalid", startAt: null });
      }
    }

    void loadCampaign();
  }, []);

  function closeSubmission() {
    setIsFormOpen(false);
  }

  function startSubmission(categoryValue?: RepairCategory) {
    if (categoryValue) setCategory(categoryValue);
    if (campaign.status !== "open") {
      document.getElementById("campaign-window")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setIsFormOpen(true);
  }

  const topCategories = Object.entries(repairStats?.categories ?? {})
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3);

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite">
          <span className="brand-mark">R</span>
          <span>Reparaturrekord<br />NRW</span>
        </Link>
        <nav aria-label="Hauptnavigation">
          <Link href="/stories">Geschichten</Link>
          <Link href="/about">Projekt</Link>
          <Link href="/supporters">Unterstützer</Link>
        </nav>
        <Link className="header-link" href="/stats">Live-Stand</Link>
        <MobileNavigation />
      </header>

      <section id="top" className="hero-poster" aria-labelledby="hero-title">
        <div className="hero-poster-photo" aria-hidden="true">
          <NextImage src={brandPhotos.workshop.src} alt="" fill priority sizes="(max-width: 1240px) 100vw, 1240px" />
        </div>
        <div className="hero-poster-inner">
          <div className="hero-copy">
            <p className="brand-kicker">Den ganzen Oktober lang reparieren &hellip;</p>
            <h1 className="sticker-head is-mint" id="hero-title">
              <span className="sticker">Gemeinsam zum</span>
              <span className="sticker">Reparatur-</span>
              <span className="sticker">Weltrekord</span>
            </h1>
            <p className="hero-intro">
              Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein und mache aus einem Gegenstand eine Geschichte.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => startSubmission()}>
                {campaign.status === "open" ? "Reparatur einreichen" : campaign.status === "before" ? "Countdown ansehen" : "Teilnahmezeitraum ansehen"} <span aria-hidden="true">&#8594;</span>
              </button>
              <Link className="button button-secondary" href="/stats">Live-Stand <span aria-hidden="true">&#8594;</span></Link>
            </div>
          </div>

          <div className="hero-side">
            <aside className="hero-facts" id="counter">
              <div>
                <p className="counter-label">Freigegebene Reparaturen</p>
                <p className={`counter-number ${animatedRepairCount === null ? "is-loading" : ""}`} aria-live="polite" aria-label={animatedRepairCount === null ? "Freigegebene Reparaturen werden geladen" : `${animatedRepairCount} freigegebene Reparaturen`}>{animatedRepairCount === null ? "..." : animatedRepairCount.toLocaleString("de-DE")}</p>
                <div className="counter-meta">
                  <span>Unser Ziel: 10.000</span>
                  <span>{((repairCount ?? 0) / 10_000 * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
                </div>
                <div className="progress-track" aria-hidden="true"><span style={{ width: `${Math.min((repairCount ?? 0) / 100, 100)}%` }} /></div>
                <p className="counter-note">{statsState === "unavailable" ? "Der Live-Stand ist gerade nicht verfügbar." : statsUpdatedAt ? `Aktualisiert um ${statsUpdatedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.` : "Live-Stand wird geladen."}</p>
              </div>
              <div className="hero-qr">
                {/* Lokales, vertrauenswuerdiges SVG: der Image-Optimizer lehnt SVG ohne dangerouslyAllowSVG ab, und die Option wuerde ihn fuer alle SVGs oeffnen. */}
                <NextImage src="/brand/qr-reparatur.svg" alt="" width={82} height={82} aria-hidden="true" unoptimized />
                <span>QR-Code scannen<small>reparatur.fab-bergisch.org</small></span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {campaign.status !== "open" && <CampaignWindowNotice status={campaign.status} startAt={campaign.startAt} />}

      <section className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="section-index">Mitmachen</p>
          <h2 id="how-title">Ein Foto. Ein paar Fragen. Ein Zeichen für Reparatur.</h2>
        </div>
        <ol className="steps">
          <li><span className="step-number" aria-hidden="true">01</span><p>Foto deiner Reparatur aufnehmen.</p></li>
          <li><span className="step-number" aria-hidden="true">02</span><p>Gerät und Reparatur kurz beschreiben.</p></li>
          <li><span className="step-number" aria-hidden="true">03</span><p>Nach Prüfung wird dein Beitrag gezählt.</p></li>
        </ol>
      </section>

      <section className="participation-section" aria-labelledby="participation-title">
        <div className="participation-heading"><p className="section-index">Dein Weg zur Reparatur</p><h2 id="participation-title">Mach aus einer Reparatur einen sichtbaren Beitrag.</h2><p>Du musst kein Profi sein. Wichtig ist nur: Die Reparatur ist echt, du beschreibst sie kurz und reichst sie während des Teilnahmezeitraums ein.</p></div>
        <div className="participation-options">
          <article><div className="participation-photo"><NextImage src={brandPhotos.secondLife.src} alt={brandPhotos.secondLife.alt} width={620} height={344} sizes="(max-width: 720px) 100vw, 33vw" /><span>Einreichen</span></div><h3>Selbst repariert?</h3><p>Mach ein Foto, wähle die Kategorie und erzähle in wenigen Sätzen, was wieder funktioniert.</p><button className="text-button" type="button" onClick={() => startSubmission()}>Reparatur einreichen <span aria-hidden="true">&#8594;</span></button></article>
          <article><div className="participation-photo"><NextImage src={brandPhotos.bicycle.src} alt={brandPhotos.bicycle.alt} width={620} height={344} sizes="(max-width: 720px) 100vw, 33vw" /><span>Mitmachen</span></div><h3>Du brauchst Hilfe?</h3><p>In Repair Cafés und offenen Werkstätten findest du Menschen, Werkzeuge und Zeit für die nächste Reparatur.</p><a className="text-button" href="https://www.repaircafe.org/en/visit/" target="_blank" rel="noreferrer">Repair Café finden <span aria-hidden="true">&#8599;</span></a></article>
          <article><div className="participation-photo"><NextImage src={brandPhotos.celebrate.src} alt={brandPhotos.celebrate.alt} width={620} height={344} sizes="(max-width: 720px) 100vw, 33vw" /><span>Unterstützen</span></div><h3>Ihr seid eine Einrichtung?</h3><p>Werkstätten, Schulen, Vereine und Initiativen können ihre Reparaturen sichtbar machen und das Projekt unterstützen.</p><a className="text-button" href="mailto:mail@gut-einern.org?subject=Reparaturrekord%20NRW%20unterstuetzen">Kontakt aufnehmen <span aria-hidden="true">&#8594;</span></a></article>
        </div>
      </section>

      <section className="home-stats-preview" aria-labelledby="home-stats-title">
        <div><p className="section-index">Live-Auswertung</p><h2 id="home-stats-title">Was gerade repariert wird.</h2><p>Die Auswertung zeigt ausschließlich freigegebene Einreichungen. Aus Datenschutzgründen werden keine Orte auf einer Karte dargestellt.</p><Link className="text-button" href="/stats">Alle Statistiken <span aria-hidden="true">&#8594;</span></Link></div>
        <ol>{topCategories.length > 0 ? topCategories.map(([categoryName, total]) => <li key={categoryName}><span>{repairCategoryLabel(categoryName)}</span><strong>{total.toLocaleString("de-DE")}</strong></li>) : <li className="home-stats-empty">{statsState === "unavailable" ? "Die Statistik wird während des Weltrekordversuchs freigeschaltet." : "Die ersten freigegebenen Reparaturen erscheinen hier."}</li>}</ol>
      </section>

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <p className="section-index">Kategorien</p>
            <h2 id="category-title">Was hast du wieder in Bewegung gebracht?</h2>
          </div>
          <button className="text-button" type="button" onClick={() => startSubmission()}>{campaign.status === "open" ? "Jetzt einreichen" : "Teilnahmezeitraum ansehen"} <span aria-hidden="true">&#8594;</span></button>
        </div>
        <div className="category-grid">
          {repairCategories.map((item, index) => (
            <button className={`category-card category-${index + 1}`} type="button" key={item.value} onClick={() => startSubmission(item.value)}>
              <span>{(repairStats?.categories[item.value] ?? 0).toLocaleString("de-DE")} Reparaturen</span>
              <strong>{item.label}</strong>
              <i aria-hidden="true">&#8599;</i>
            </button>
          ))}
        </div>
      </section>

      <section className="stories-section" id="geschichten" aria-labelledby="stories-title">
        <div className="section-heading">
          <div>
            <p className="section-index">Freigegebene Reparaturen</p>
            <h2 id="stories-title">Gegenstaende mit zweitem Kapitel.</h2>
          </div>
          <Link className="text-button" href="/stories">Alle Geschichten <span aria-hidden="true">&#8594;</span></Link>
        </div>
        {galleryError ? <p className="gallery-empty" role="status">{galleryError}</p> : galleryRepairs.length === 0 ? <p className="gallery-empty">Die ersten freigegebenen Reparaturen erscheinen bald hier.</p> : <div className="gallery-mini-grid">{galleryRepairs.map((repair) => { const categoryIndex = Math.max(repairCategories.findIndex((categoryItem) => categoryItem.value === repair.category), 0) + 1; return <article className="gallery-mini-card" key={repair.id}>{repair.imageUrl ? <>
          {/* Signed URLs from the private bucket cannot use Next.js image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={repair.imageUrl} alt={repair.imageAltText || `Reparatur aus der Kategorie ${repairCategoryLabel(repair.category)}`} />
        </> : <div className={`gallery-placeholder category-${categoryIndex}`} aria-label={`Kein Bild: ${repairCategoryLabel(repair.category)}`} /> }<div><span>{repairCategoryLabel(repair.category)}</span><strong>{repair.productName || "Reparatur aus NRW"}</strong></div></article>; })}</div>}
      </section>

      <section className="project-banner" id="ueber-uns">
        <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.reuse.src} alt="" fill sizes="(max-width: 1240px) 100vw, 1240px" /></div>
        <p>Reparatur ist keine Ausnahme.<br />Sie ist Infrastruktur.</p>
        <Link className="button button-secondary" href="/about">Über das Projekt <span aria-hidden="true">&#8594;</span></Link>
      </section>

      <section className="funding-strip" aria-label="Projekt- und Foerderhinweise">
        <p>Teil der FAB Region Bergisches Staedtedreieck</p>
        <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer"><NextImage src="/funding/fab-region.svg" alt="FAB Region Bergisches Staedtedreieck" width={170} height={56} /></a>
        <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer"><NextImage src="/funding/eu.svg" alt="Kofinanziert von der Europaeischen Union" width={130} height={56} /></a>
        <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer"><NextImage src="/funding/nrw.svg" alt="Ministerium fuer Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen" width={150} height={56} /></a>
      </section>

      <footer className="site-footer">
        <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
        <div><Link href="/privacy">Datenschutz</Link><Link href="/imprint">Impressum</Link><Link href="/accessibility">Barrierefreiheit</Link></div>
        <p>Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region</a></p>
      </footer>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeSubmission}>
          <section className="submission-panel" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button" type="button" aria-label="Formular schliessen" onClick={closeSubmission}>&times;</button>
            <RepairSubmissionForm initialCategory={category} onDone={closeSubmission} />
          </section>
        </div>
      )}
    </main>
  );
}
