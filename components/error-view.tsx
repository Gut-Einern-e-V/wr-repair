"use client";

import { useEffect, useState } from "react";
import { RepairTicket, ShortCircuit } from "@/components/error-scene";
import { CONTACT_EMAIL, mailto } from "@/lib/organisation";

/**
 * Inhalt von app/error.tsx und app/global-error.tsx.
 *
 * Beide zeigen dasselbe; sie unterscheiden sich nur darin, was um sie herum
 * noch steht - error.tsx sitzt im Root-Layout, global-error.tsx ersetzt es.
 * Links sind deshalb einfache `<a>`: Nach einem Absturz des Layouts ist ein
 * voller Seitenaufruf die sicherere Heimkehr als eine Client-Navigation.
 */
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [plugging, setPlugging] = useState(false);

  useEffect(() => {
    // Landet in den Browser-Logs; auf dem Server steht der Fehler unter derselben Kennung.
    console.error(error);
  }, [error]);

  function replug() {
    if (plugging) return;
    setPlugging(true);
    // Erst einstecken, dann neu laden - sonst tut der Knopf scheinbar nichts.
    window.setTimeout(() => {
      retry();
      setPlugging(false);
    }, 480);
  }

  const reference = error.digest;
  const subject = reference ? `Fehler auf der Website (Kennung ${reference})` : "Fehler auf der Website";

  return <section id="inhalt" className="error-stage" aria-labelledby="error-title">
    <div className="error-copy">
      <p className="eyebrow">Kurzschluss</p>
      <h1 className="sticker-head is-mint" id="error-title">
        <span className="sticker">Da hat&apos;s</span>
        <span className="sticker">gefunkt.</span>
      </h1>
      <p className="error-lead">
        Bei uns ist gerade etwas durchgebrannt. Du hast nichts falsch gemacht.
        Meistens reicht es, den Stecker einmal neu einzustecken.
      </p>
      <div className="error-actions">
        <button type="button" className="button button-primary" onClick={replug} disabled={plugging}>
          {plugging ? "Wird eingesteckt …" : "Neu einstecken"}
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- siehe Kommentar oben: voller Seitenaufruf nach einem Absturz. */}
        <a className="button button-secondary" href="/">Zur Startseite</a>
      </div>
      <p className="error-fineprint">
        Funkt es immer wieder? Schreib uns an <a href={mailto(CONTACT_EMAIL, subject)}>{CONTACT_EMAIL}</a>
        {reference ? " und nenne die Kennung vom Zettel - damit finden wir den Fehler." : "."}
      </p>
    </div>
    <div className="error-visual">
      <div className="error-panel"><ShortCircuit plugging={plugging} /></div>
      <RepairTicket number="500" rows={[
        { label: "Gerät", value: "Reparaturrekord-Server" },
        { label: "Fehlerbild", value: "Kurzschluss" },
        { label: "Kennung", value: reference ? <code className="ticket-path">{reference}</code> : "keine" },
        { label: "Deine Schuld", value: "Nein" },
      ]} />
    </div>
  </section>;
}
