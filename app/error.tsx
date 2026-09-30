"use client";

import Link from "next/link";
import { ErrorView } from "@/components/error-view";

/* Fehlergrenze fuer alle Seiten unterhalb des Root-Layouts. Ohne sie zeigte
   Next.js bei einem Serverfehler seine eigene, englische Standardseite.

   Der SiteHeader fehlt mit Absicht: Er ist eine asynchrone Serverkomponente
   und kann in einer Client-Fehlergrenze nicht gerendert werden. Die schmale
   Kopfzeile fuehrt trotzdem nach Hause. */
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <main className="page-shell content-page">
    <title>Kurzschluss | Reparaturrekord NRW</title>
    <header className="error-header">
      <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
    </header>
    <ErrorView error={error} retry={unstable_retry} />
  </main>;
}
