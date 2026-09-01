"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { CampaignWindowNotice } from "@/components/campaign-window-notice";
import { CategoryMotif } from "@/components/category-motif";
import { ConsentSettingsLink } from "@/components/consent-settings-link";
import { FundingStrip } from "@/components/funding-strip";
import { HeroCountdown } from "@/components/hero-countdown";
import { MobileNavigation } from "@/components/mobile-navigation";
import { RepairSubmissionForm } from "@/components/repair-submission-form";
import { StoryMosaic } from "@/components/story-mosaic";
import { brandPhotos } from "@/lib/brand-photos";
import { campaignPhaseAt, type CampaignDates, type CampaignPhase } from "@/lib/campaign-phase";
import { repairCategories, repairCategoryLabel, type RepairCategory } from "@/lib/repair-catalog";
import { faqEntries, repairRecords } from "@/lib/repair-records";
import type { StoryTeaser } from "@/lib/stories";

type RepairStats = {
  total: number;
  goal: number;
  categories: Record<string, number>;
};

/**
 * Was die Startseite je nach Phase sagt (Issue #66).
 *
 * "invalid" traegt bewusst denselben Text wie die laufende Aktion: So steht er
 * beim ersten Rendern und beim Server-Rendern schon richtig da, statt fuer
 * einen Moment etwas anderes zu behaupten.
 */
const heroCopy: Record<CampaignPhase, {
  kicker: string;
  intro: string;
  counterLabel: string;
  categoryLead: string;
}> = {
  invalid: {
    kicker: "Den ganzen Oktober lang reparieren …",
    intro: "Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein und mache aus einem Gegenstand eine Geschichte.",
    counterLabel: "Reparaturen in Nordrhein-Westfalen",
    categoryLead: "Ein Klick auf eine Kategorie öffnet direkt das Einreichungsformular – die Kategorie ist dann schon ausgewählt. Die Zahl darunter zeigt, wie viele Reparaturen dort bisher gezählt wurden.",
  },
  open: {
    kicker: "Den ganzen Oktober lang reparieren …",
    intro: "Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein und mache aus einem Gegenstand eine Geschichte.",
    counterLabel: "Reparaturen in Nordrhein-Westfalen",
    categoryLead: "Ein Klick auf eine Kategorie öffnet direkt das Einreichungsformular – die Kategorie ist dann schon ausgewählt. Die Zahl darunter zeigt, wie viele Reparaturen dort bisher gezählt wurden.",
  },
  before: {
    kicker: "Bald zählt jede Reparatur …",
    intro: "Ganz NRW zeigt, was noch funktioniert. Sammle schon jetzt, was bei dir auf eine Reparatur wartet – eintragen kannst du es, sobald der Zeitraum beginnt.",
    counterLabel: "Reparaturen in Nordrhein-Westfalen",
    categoryLead: "Das wird gezählt. Sobald der Zeitraum läuft, öffnet ein Klick auf eine Kategorie direkt das Einreichungsformular.",
  },
  after: {
    kicker: "Ein Monat lang hat NRW repariert …",
    intro: "Danke an alle, die mitgemacht haben. Das ist der Endstand – jede Zahl darin war einmal ein Gegenstand, der sonst weggeworfen worden wäre.",
    counterLabel: "Endstand in Nordrhein-Westfalen",
    categoryLead: "So verteilen sich die gezählten Reparaturen auf die Kategorien.",
  },
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

export type HomeViewProps = {
  /* Kommt statisch aus content/stories/, deshalb ohne Netzwerkanfrage im Browser. */
  stories: StoryTeaser[];
};

export function HomeView({ stories }: HomeViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState<RepairCategory>(repairCategories[0].value);
  const [repairCount, setRepairCount] = useState<number | null>(null);
  const [repairStats, setRepairStats] = useState<RepairStats | null>(null);
  const [statsState, setStatsState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  /* Nur die beiden Zeitpunkte; wo wir darin stehen, rechnet der Browser aus. */
  const [campaign, setCampaign] = useState<CampaignDates>({ startAt: null, endAt: null });
  /* Die Phase aus der Uhr des Browsers statt aus der Antwort vom Laden der
     Seite: Sonst behauptet eine offen gebliebene Seite nach Ablauf der Frist
     weiter, es laufe noch (Issue #66). Sekundentakt, damit der Text im selben
     Moment umspringt wie die Uhr im Hero. Bleibt die Phase gleich, verwirft
     React die Aktualisierung, es rendert also nichts neu. */
  const [phase, setPhase] = useState<CampaignPhase>("invalid");
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
    async function loadCampaign() {
      try {
        const response = await fetch("/api/campaign", { cache: "no-store" });
        if (!response.ok) throw new Error("Kampagnenstatus nicht verfuegbar");
        const data = await response.json() as CampaignDates;
        setCampaign({ startAt: data.startAt, endAt: data.endAt });
      } catch {
        setCampaign({ startAt: null, endAt: null });
      }
    }

    void loadCampaign();
  }, []);

  useEffect(() => {
    const tick = () => setPhase(campaignPhaseAt(campaign, Date.now()));
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [campaign]);

  function closeSubmission() {
    setIsFormOpen(false);
  }

  function startSubmission(categoryValue?: RepairCategory) {
    if (categoryValue) setCategory(categoryValue);
    if (phase !== "open") {
      document.getElementById("campaign-window")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setIsFormOpen(true);
  }

  const topCategories = Object.entries(repairStats?.categories ?? {})
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3);

  const copy = heroCopy[phase];
  const goal = repairStats?.goal ?? 10_000;
  const isDone = phase === "after";

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
            <p className="brand-kicker">{copy.kicker}</p>
            <h1 className="sticker-head is-mint" id="hero-title">
              <span className="sticker">Gemeinsam zum</span>
              <span className="sticker">Reparatur-</span>
              <span className="sticker">Weltrekord</span>
            </h1>
            <p className="hero-intro">{copy.intro}</p>
            <div className="hero-actions">
              {/* Nach dem Zeitraum fuehrt der Hauptweg nicht mehr ins Formular,
                  sondern zum Rueckblick - der ist dann das, was es zu sehen gibt. */}
              {isDone
                ? <Link className="button button-primary" href="/stats">Rückblick ansehen <span aria-hidden="true">&#8594;</span></Link>
                : <button className="button button-primary" type="button" onClick={() => startSubmission()}>
                    {phase === "open" ? "Reparatur einreichen" : "Mehr zum Rekordversuch"} <span aria-hidden="true">&#8594;</span>
                  </button>}
              <Link className="button button-secondary" href={isDone ? "/stories" : "/stats"}>
                {isDone ? "Geschichten lesen" : "Live-Stand"} <span aria-hidden="true">&#8594;</span>
              </Link>
            </div>
          </div>

          <div className="hero-side">
            <aside className="hero-facts" id="counter">
              <div>
                <p className="counter-label">{copy.counterLabel}</p>
                <p className={`counter-number ${animatedRepairCount === null ? "is-loading" : ""}`} aria-live="polite" aria-label={animatedRepairCount === null ? "Reparaturen werden geladen" : `${animatedRepairCount} Reparaturen`}>{animatedRepairCount === null ? "..." : animatedRepairCount.toLocaleString("de-DE")}</p>
                <div className="counter-meta">
                  <span>{isDone ? "Ziel war" : "Unser Ziel"}: {goal.toLocaleString("de-DE")}</span>
                  <span>{((repairCount ?? 0) / goal * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
                </div>
                <div className="progress-track" aria-hidden="true"><span style={{ width: `${Math.min((repairCount ?? 0) / goal * 100, 100)}%` }} /></div>
                <p className="counter-note">{counterNote(phase, statsState, statsUpdatedAt)}</p>
              </div>
              <HeroCountdown campaign={campaign} total={repairCount} goal={repairStats?.goal ?? null} />
            </aside>
          </div>
        </div>
      </section>

      {phase !== "open" && <CampaignWindowNotice status={phase} startAt={campaign.startAt} />}

      <section className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="section-index">Mitmachen</p>
          <h2 id="how-title">Wir in NRW schaffen die meisten reparierten Gegenstände in einem Monat.</h2>
          <p className="how-it-works-lead">So einfach geht&rsquo;s:</p>
        </div>
        <ol className="steps">
          <li><span className="step-number" aria-hidden="true">01</span><div><strong>Reparieren</strong><p>Es zählt alles, was vorher kaputt, d.&#8239;h. nur eingeschränkt oder nicht nutzbar war.</p></div></li>
          <li><span className="step-number" aria-hidden="true">02</span><div><strong>Hochladen</strong><p>Ein Foto machen und ein paar Fragen beantworten.</p></div></li>
          <li><span className="step-number" aria-hidden="true">03</span><div><strong>Weltrekordhalter:in werden!</strong><p>Nach Prüfung wird dein Beitrag gezählt.</p></div></li>
        </ol>
      </section>

      <section className="record-facts" id="zahlen-und-fakten" aria-labelledby="record-facts-title">
        <div className="record-facts-heading">
          <p className="section-index">Zahlen und Fakten</p>
          <h2 id="record-facts-title">Das sind die Bestleistungen, die wir übertreffen wollen.</h2>
          <p>Reparaturrekorde werden bisher vor allem in Großbritannien gezählt. Diese Marken sind unser Maßstab für NRW.</p>
        </div>
        <ol className="record-list">
          {repairRecords.map((record) => (
            <li key={record.label}>
              <strong>{record.value}</strong>
              <span>{record.label}</span>
              <p>{record.detail}</p>
              <a href={record.source.href} target="_blank" rel="noreferrer">
                Quelle: {record.source.label} <span aria-hidden="true">&#8599;</span>
              </a>
            </li>
          ))}
        </ol>
        <p className="record-note">
          <strong>Wichtig:</strong> Es geht uns nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen und als echte Alternative zum Neukauf zu stärken.
        </p>
      </section>

      <section className="participation-section" aria-labelledby="participation-title">
        <div className="participation-heading"><p className="section-index">Dein Weg zur Reparatur</p><h2 id="participation-title">Mach aus einer Reparatur einen sichtbaren Beitrag.</h2><p>Du musst kein Profi sein. Wichtig ist nur: Die Reparatur ist echt, du beschreibst sie kurz und reichst sie während des Teilnahmezeitraums ein.</p></div>
        <div className="participation-options">
          <article><div className="participation-photo"><NextImage src={brandPhotos.secondLife.src} alt={brandPhotos.secondLife.alt} width={620} height={344} sizes="(max-width: 720px) 100vw, 33vw" /><span>Einreichen</span></div><h3>Selbst repariert?</h3><p>Mach ein Foto, wähle die Kategorie und erzähle in wenigen Sätzen, was wieder funktioniert.</p><button className="text-button" type="button" onClick={() => startSubmission()}>Reparatur einreichen <span aria-hidden="true">&#8594;</span></button></article>
          <article><div className="participation-photo"><NextImage src={brandPhotos.bicycle.src} alt={brandPhotos.bicycle.alt} width={620} height={344} sizes="(max-width: 720px) 100vw, 33vw" /><span>Mitmachen</span></div><h3>Du brauchst Hilfe?</h3><p>In Repair Cafés und offenen Werkstätten findest du Menschen, Werkzeuge und Zeit für die nächste Reparatur &ndash; in ganz NRW und kostenlos.</p><Link className="text-button" href="/repair-cafes">Repair Café finden <span aria-hidden="true">&#8594;</span></Link></article>
          <article><div className="participation-photo"><NextImage src={brandPhotos.celebrate.src} alt={brandPhotos.celebrate.alt} width={620} height={344} sizes="(max-width: 720px) 100vw, 33vw" /><span>Unterstützen</span></div><h3>Ihr seid eine Einrichtung?</h3><p>Werkstätten, Schulen, Vereine und Initiativen tragen sich in den Verteiler ein und bekommen Plakate, Kommunikationsmaterial und alle Infos zum Rekordmonat.</p><a className="text-button" href="https://www.fab-bergisch.org/reparatur-weltrekord-in-nrw" target="_blank" rel="noreferrer">In den Verteiler eintragen <span aria-hidden="true">&#8599;</span></a></article>
        </div>
      </section>

      <section className="home-stats-preview" aria-labelledby="home-stats-title">
        <div><p className="section-index">Live-Auswertung</p><h2 id="home-stats-title">{isDone ? "Was repariert wurde." : "Was gerade repariert wird."}</h2><p>Gezählt wird, was die Moderation geprüft hat. Aus Datenschutzgründen werden keine Orte auf einer Karte dargestellt.</p><Link className="text-button" href="/stats">{isDone ? "Zum Rückblick" : "Alle Statistiken"} <span aria-hidden="true">&#8594;</span></Link></div>
        <ol>{topCategories.length > 0 ? topCategories.map(([categoryName, total]) => <li key={categoryName}><span>{repairCategoryLabel(categoryName)}</span><strong>{total.toLocaleString("de-DE")}</strong></li>) : <li className="home-stats-empty">{statsState === "unavailable" ? "Die Statistik wird mit dem Start des Weltrekordversuchs freigeschaltet." : "Die ersten Reparaturen erscheinen hier."}</li>}</ol>
      </section>

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <p className="section-index">{isDone ? "Nach Kategorien" : "Reparatur eintragen"}</p>
            <h2 id="category-title">{isDone ? "Das wurde repariert." : "Kategorie wählen und Reparatur eintragen."}</h2>
            <p className="section-lead">{copy.categoryLead}</p>
          </div>
          <button className="text-button" type="button" onClick={() => startSubmission()}>{phase === "open" ? "Ohne Kategorie starten" : "Teilnahmezeitraum ansehen"} <span aria-hidden="true">&#8594;</span></button>
        </div>
        <div className="category-grid">
          {repairCategories.map((item, index) => (
            <button
              className={`category-card category-${index + 1}`}
              type="button"
              key={item.value}
              onClick={() => startSubmission(item.value)}
              aria-label={`Reparatur in der Kategorie ${item.label} eintragen`}
            >
              {/* Das Motiv steht oben, der Name bleibt unten am Fuss der
                  Kachel (`margin-top: auto`). */}
              <CategoryMotif category={item.value} size={56} />
              <strong>{item.label}</strong>
              <span className="category-card-count">{(repairStats?.categories[item.value] ?? 0).toLocaleString("de-DE")} Reparaturen</span>
              <span className="category-card-action"><i aria-hidden="true">+</i>Eintragen</span>
            </button>
          ))}
        </div>
      </section>

      <section className="stories-section" id="geschichten" aria-labelledby="stories-title">
        <div className="section-heading">
          <div>
            <p className="section-index">Reparaturgeschichten</p>
            <h2 id="stories-title">Gegenstände mit zweitem Kapitel.</h2>
            <p className="section-lead">Ausgewählte Reparaturen erzählen wir ausführlich &ndash; mit Foto, Ursache und dem, was am Ende wieder funktioniert.</p>
          </div>
          <Link className="text-button" href="/stories">Alle Geschichten <span aria-hidden="true">&#8594;</span></Link>
        </div>
        <StoryMosaic stories={stories} />
      </section>

      <section className="faq-section" id="faq" aria-labelledby="faq-title">
        <div className="section-heading">
          <div>
            <p className="section-index">Häufige Fragen</p>
            <h2 id="faq-title">Was du vor dem Einreichen wissen solltest.</h2>
          </div>
          <Link className="text-button" href="/about">Mehr über das Projekt <span aria-hidden="true">&#8594;</span></Link>
        </div>
        <div className="faq-list">
          {faqEntries.map((entry) => (
            <details key={entry.question}>
              <summary>{entry.question}<i aria-hidden="true">+</i></summary>
              <p>{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="project-banner" id="ueber-uns">
        <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.reuse.src} alt="" fill sizes="(max-width: 1240px) 100vw, 1240px" /></div>
        <p>Reparatur ist keine Ausnahme.<br />Sie ist Infrastruktur.</p>
        <Link className="button button-secondary" href="/about">Über das Projekt <span aria-hidden="true">&#8594;</span></Link>
      </section>

      <FundingStrip />

      <footer className="site-footer">
        <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
        <div><Link href="/privacy">Datenschutz</Link><Link href="/imprint">Impressum</Link><Link href="/accessibility">Barrierefreiheit</Link><ConsentSettingsLink /></div>
        <p>Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region</a></p>
      </footer>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeSubmission}>
          <section className="submission-panel" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button" type="button" aria-label="Formular schließen" onClick={closeSubmission}>&times;</button>
            <RepairSubmissionForm initialCategory={category} onDone={closeSubmission} />
          </section>
        </div>
      )}
    </main>
  );
}

/**
 * Der Satz unter dem Zaehler. Nach dem Zeitraum ist die Zahl kein Live-Stand
 * mehr, sondern das Ergebnis - und "Aktualisiert um 14:07 Uhr" waere dort
 * die falsche Auskunft (Issue #66).
 */
function counterNote(phase: CampaignPhase, statsState: "loading" | "ready" | "unavailable", updatedAt: Date | null) {
  if (statsState === "unavailable") {
    if (phase === "before") return "Gezählt wird ab dem Start der Reparaturphase.";
    return phase === "after" ? "Der Endstand ist gerade nicht verfügbar." : "Der Live-Stand ist gerade nicht verfügbar.";
  }
  if (!updatedAt) return "Live-Stand wird geladen.";
  if (phase === "after") return "Endstand nach der Prüfung durch die Moderation.";

  return `Aktualisiert um ${updatedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.`;
}
