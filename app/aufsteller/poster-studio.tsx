"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type PosterBackground,
  type PosterFormat,
  type PosterLanguage,
  posterBackgroundOrder,
  posterBackgrounds,
  posterCopy,
  posterFormatOrder,
  posterFormats,
  posterLanguageLabel,
  posterLanguageOrder,
  sheetSizeMm,
  stepsFit,
  trilingualOrder,
} from "@/lib/poster";
import type { QrGlyph } from "@/lib/qr-glyph";

/* Derselbe Foerderabbinder wie in components/funding-strip.tsx. Die Hoehen
   stehen im Verhaeltnis der Seitenleiste (56/44/44/19 Pixel) und kommen als
   `em` aus dem Stylesheet, damit sie mit dem Blattformat mitschrumpfen. */
const fundingLogos = [
  { src: "/funding/fab-region-dark.png", width: 1355, height: 381, className: "is-fab", alt: "FAB Region Bergisches Städtedreieck" },
  { src: "/funding/eu-dark.png", width: 1405, height: 293, className: "is-eu", alt: "Kofinanziert von der Europäischen Union" },
  { src: "/funding/nrw-dark.png", width: 1359, height: 294, className: "is-nrw", alt: "Ministerium für Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen" },
  { src: "/funding/efre-dark.png", width: 724, height: 98, className: "is-efre", alt: "www.efre.nrw" },
];

/* Aufkleber und Grund duerfen laut Styleguide nie dieselbe Farbfamilie teilen:
   Mint steht auf hellem Grund, Gelb auf dunklem, sonst traegt Papier. */
const stickerVariant: Record<PosterBackground, string> = {
  paper: "is-mint",
  mint: "is-paper",
  yellow: "is-paper",
  ink: "",
};

type PosterStudioProps = {
  submissionUrl: string;
  qrGlyph: QrGlyph;
  arabicFontClassName: string;
};

export function PosterStudio({ submissionUrl, qrGlyph, arabicFontClassName }: PosterStudioProps) {
  const [format, setFormat] = useState<PosterFormat>("a4");
  const [language, setLanguage] = useState<PosterLanguage>("de");
  const [background, setBackground] = useState<PosterBackground>("mint");
  const [showSteps, setShowSteps] = useState(true);
  const [showFunding, setShowFunding] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);

  const spec = posterFormats[format];
  const sheet = sheetSizeMm(format);

  /* Die Blattausrichtung steht in `@page` und laesst sich nicht ueber eine
     Klasse steuern - ohne sie schiebt der Browser den A4-Querbogen der
     A5-Vorlage auf zwei Seiten. Das Stylesheet wird von Hand gesetzt und beim
     Formatwechsel wieder entfernt: React haelt ueber `precedence` hochgezogene
     Stylesheets dauerhaft im <head>, dann stuenden dort am Ende beide Regeln
     und die zuletzt eingehaengte gewaenne. Gedruckt wird ohnehin erst nach der
     Hydration, die Regel fehlt also zu keinem Zeitpunkt, an dem sie zaehlt. */
  useEffect(() => {
    const rule = document.createElement("style");
    rule.textContent = `@page { size: A4 ${spec.orientation}; margin: 0; }`;
    document.head.append(rule);
    return () => rule.remove();
  }, [spec.orientation]);

  const stepsAvailable = stepsFit(format, language);
  const withSteps = showSteps && stepsAvailable;
  const multiUp = spec.perSheet > 1;
  const readableUrl = submissionUrl.replace(/^https?:\/\//, "");

  const sheetClasses = [
    "poster-sheet",
    `is-${format}`,
    `bg-${background}`,
    multiUp && showCutLines ? "shows-cuts" : "",
  ].filter(Boolean).join(" ");

  /* `data-reveal="off"`: Ein Werkzeug zum Drucken braucht keine Einblendung -
     und ein halbtransparenter Aufsteller in der Vorschau irritiert nur. */
  return <main className={`poster-page ${arabicFontClassName}`} data-reveal="off">
    <section className="poster-intro no-print">
      <p className="brand-kicker">Druckvorlage</p>
      <h1 className="sticker-head is-mint"><span className="sticker">Aufsteller</span><span className="sticker">selbst drucken</span></h1>
      <p>
        Format, Sprache und Hintergrund wählen, dann über die Druckfunktion des Browsers ausgeben. Der QR-Code führt
        auf <strong>{readableUrl}</strong> – dort trägt man eine Reparatur in zwei Minuten ein.
      </p>
      <p><Link className="text-button" href="/mitmachen">Zielseite ansehen <span aria-hidden="true">&#8594;</span></Link></p>
    </section>

    <form className="poster-controls no-print" onSubmit={(event) => event.preventDefault()}>
      <fieldset>
        <legend>Format</legend>
        <div className="poster-choices">
          {posterFormatOrder.map((value) => <label key={value}>
            <input type="radio" name="poster-format" value={value} checked={format === value} onChange={() => setFormat(value)} />
            <span>{posterFormats[value].label}<small>{posterFormats[value].hint}</small></span>
          </label>)}
        </div>
      </fieldset>

      <fieldset>
        <legend>Sprache</legend>
        <div className="poster-choices">
          {posterLanguageOrder.map((value) => <label key={value}>
            <input type="radio" name="poster-language" value={value} checked={language === value} onChange={() => setLanguage(value)} />
            <span {...(value === "ar" ? { lang: "ar" } : {})}>{posterLanguageLabel(value)}</span>
          </label>)}
        </div>
      </fieldset>

      <fieldset>
        <legend>Hintergrund</legend>
        <div className="poster-choices">
          {posterBackgroundOrder.map((value) => <label key={value}>
            <input type="radio" name="poster-background" value={value} checked={background === value} onChange={() => setBackground(value)} />
            <i className={`poster-swatch bg-${value}`} aria-hidden="true" />
            <span>{posterBackgrounds[value].label}<small>{posterBackgrounds[value].hint}</small></span>
          </label>)}
        </div>
      </fieldset>

      <fieldset>
        <legend>Inhalt</legend>
        <div className="poster-toggles">
          <label>
            <input type="checkbox" checked={withSteps} disabled={!stepsAvailable} onChange={(event) => setShowSteps(event.target.checked)} />
            <span>Die drei Schritte zeigen{!stepsAvailable && <small>Auf {spec.label}{language === "all" ? " dreisprachig" : ""} zu klein zum Lesen</small>}</span>
          </label>
          <label>
            <input type="checkbox" checked={showFunding} onChange={(event) => setShowFunding(event.target.checked)} />
            <span>Förderlogos zeigen<small>EFRE, EU, Land NRW und FAB Region</small></span>
          </label>
          <label>
            <input type="checkbox" checked={showCutLines} disabled={!multiUp} onChange={(event) => setShowCutLines(event.target.checked)} />
            <span>Schnittlinien zeigen{!multiUp && <small>Nur nötig, wenn mehrere auf einen Bogen kommen</small>}</span>
          </label>
        </div>
      </fieldset>

      <div className="poster-actions">
        <button type="button" className="button button-primary" onClick={() => window.print()}>Drucken</button>
        <p className="poster-target">
          {spec.perSheet === 1
            ? `Ein Aufsteller ${spec.cardWidthMm} × ${spec.cardHeightMm} mm`
            : `${spec.perSheet} Aufsteller je ${spec.cardWidthMm} × ${spec.cardHeightMm} mm`}
          {" "}auf einem A4-Bogen ({sheet.widthMm} × {sheet.heightMm} mm, {spec.orientation === "landscape" ? "quer" : "hoch"}).
          Im Druckdialog „Hintergrundgrafiken drucken“ anhaken und die Skalierung auf 100 % lassen.
        </p>
      </div>
    </form>

    <div className="poster-stage">
      <div className={sheetClasses}>
        {Array.from({ length: spec.perSheet }, (_, index) => <PosterCard
          key={index}
          /* Alle Karten eines Bogens sind identisch - nur die erste gehoert in
             den Vorlesebaum, sonst liest ein Screenreader dasselbe viermal. */
          hidden={index > 0}
          format={format}
          language={language}
          background={background}
          withSteps={withSteps}
          withFunding={showFunding}
          qrGlyph={qrGlyph}
          readableUrl={readableUrl}
        />)}
        {multiUp && showCutLines && <div className="poster-cutlines" aria-hidden="true">
          {Array.from({ length: spec.columns - 1 }, (_, index) => <span key={`v${index}`} className="is-vertical" style={{ left: `${((index + 1) / spec.columns) * 100}%` }} />)}
          {Array.from({ length: spec.rows - 1 }, (_, index) => <span key={`h${index}`} className="is-horizontal" style={{ top: `${((index + 1) / spec.rows) * 100}%` }} />)}
        </div>}
      </div>
    </div>
  </main>;
}

type PosterCardProps = {
  hidden: boolean;
  format: PosterFormat;
  language: PosterLanguage;
  background: PosterBackground;
  withSteps: boolean;
  withFunding: boolean;
  qrGlyph: QrGlyph;
  readableUrl: string;
};

function PosterCard({ hidden, format, language, background, withSteps, withFunding, qrGlyph, readableUrl }: PosterCardProps) {
  /* Die dreisprachige Fassung traegt die deutsche Schlagzeile und darunter je
     eine kurze Zeile pro Sprache - drei grosse Aufkleberbloecke uebereinander
     passen auf kein Format mehr. */
  const copy = posterCopy[language === "all" ? "de" : language];
  const lead = format === "a6" ? copy.leadShort : copy.lead;
  const sticker = stickerVariant[background];

  return <article className="poster-card" {...(hidden ? { "aria-hidden": true } : {})}>
    <div className={`poster-inner${language === "all" ? " is-trilingual" : ""}`} lang={copy.locale} dir={copy.direction}>
      <p className="poster-kicker">{copy.kicker}</p>
      <p className={`poster-head sticker-head ${sticker}`.trimEnd()}>
        {copy.headline.map((line) => <span key={line} className="sticker">{line}</span>)}
      </p>

      {language === "all"
        ? <ul className="poster-langs">
          {trilingualOrder.map((value) => <li key={value} lang={posterCopy[value].locale} dir={posterCopy[value].direction}>
            {posterCopy[value].leadShort}
          </li>)}
        </ul>
        : <p className="poster-lead">{lead}</p>}

      <div className="poster-code">
        <svg className="poster-qr" viewBox={`0 0 ${qrGlyph.size} ${qrGlyph.size}`} shapeRendering="crispEdges" role="img" aria-label={`QR-Code zu ${readableUrl}`}>
          <rect width={qrGlyph.size} height={qrGlyph.size} fill="var(--poster-qr-light)" />
          <path d={qrGlyph.path} fill="var(--poster-qr-dark)" />
        </svg>
        <p className="poster-url" dir="ltr">{readableUrl}</p>
      </div>

      {withSteps && <ol className="poster-steps">
        {copy.steps.map((step, index) => <li key={step}><b>{`0${index + 1}`}</b>{step}</li>)}
      </ol>}

      {withFunding && <div className="poster-funding">
        {/* Statische Logos in fester Groesse - der Bildoptimierer bringt hier
            nichts und liefert im Druck gelegentlich noch den Platzhalter aus. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {fundingLogos.map((logo) => <img
          key={logo.src}
          className={logo.className}
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
        />)}
      </div>}

      <p className="poster-footer">{copy.footer}</p>
    </div>
  </article>;
}
