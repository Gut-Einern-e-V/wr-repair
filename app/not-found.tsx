import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LooseZero, NotFoundTicket } from "@/components/error-scene";

/* Greift fuer jede Adresse, die es nicht gibt, und fuer jedes `notFound()`
   ohne eigene not-found.tsx im Segment (Stories, private Reparaturlinks).
   `noindex` setzt Next.js bei 404 selbst. */
export const metadata: Metadata = { title: "Seite nicht gefunden" };

export default function NotFound() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section id="inhalt" className="error-stage" aria-labelledby="not-found-title">
      <div className="error-copy">
        <p className="eyebrow">Fehler 404</p>
        <h1 className="sticker-head is-mint" id="not-found-title">
          <span className="sticker">Hier fehlt</span>
          <span className="sticker">ein Teil.</span>
        </h1>
        <p className="error-lead">
          Unter dieser Adresse ist nichts. Vielleicht ein Tippfehler, vielleicht ein alter Link, der sich gelöst hat.
          Wegwerfen musst du deshalb nichts: Hier geht es weiter.
        </p>
        <div className="error-actions">
          <Link className="button button-primary" href="/">Zur Startseite</Link>
          <Link className="button button-secondary" href="/mitmachen">Etwas Echtes reparieren</Link>
          <Link className="text-button" href="/stats">Zum Live-Stand</Link>
        </div>
      </div>
      <div className="error-visual">
        <div className="error-panel"><LooseZero /></div>
        <NotFoundTicket />
      </div>
    </section>
    <SiteFooter />
  </main>;
}
