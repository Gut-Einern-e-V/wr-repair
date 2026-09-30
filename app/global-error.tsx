"use client";

import "./globals.css";
import { fontClassName } from "./fonts";
import { ErrorView } from "@/components/error-view";

/* Letzte Rueckfallebene: greift, wenn das Root-Layout selbst abstuerzt, und
   ersetzt es dann ganz. Deshalb eigenes `<html>`, eigene Schriften und
   eigenes Stylesheet - vom Layout ist in diesem Fall nichts mehr da.
   Kein Consent-Banner, keine Analyse: Beides haengt am Layout, und auf einer
   Absturzseite hat Messung nichts verloren. */
export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <html lang="de" className={fontClassName}>
    <body>
      <title>Kurzschluss | Reparaturrekord NRW</title>
      <main className="page-shell content-page">
        <header className="error-header">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Das Layout ist abgestuerzt; ein voller Seitenaufruf baut es neu auf. */}
          <a className="brand" href="/" aria-label="Reparaturrekord NRW Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></a>
        </header>
        <ErrorView error={error} retry={unstable_retry} />
      </main>
    </body>
  </html>;
}
