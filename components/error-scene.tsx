"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./error-scene.css";

/**
 * Bildteile der Fehlerseiten: app/not-found.tsx, app/error.tsx und
 * app/global-error.tsx.
 *
 * Eine Fehlerseite ist auf einer Reparaturseite die eine Stelle, an der etwas
 * wirklich kaputt ist. Statt das zu verstecken, spielt sie damit: Die Null der
 * 404 haengt an einer einzigen Schraube, und wer sie festziehen will, merkt,
 * dass es nicht haelt. Beim Serverfehler ist der Stecker rausgerutscht.
 *
 * Alles Bewegte ist Dekoration und steht unter `aria-hidden`. Was die Seite
 * sagt, steht als Text daneben - wer Animationen abgeschaltet hat, bekommt
 * dieselbe Seite ohne Wackeln (siehe error-scene.css).
 */

/* Rueckmeldungen auf die Reparaturversuche an der Null. Der Index ist die
   Anzahl der Versuche; wo nichts steht, bleibt die letzte Meldung stehen. */
const attemptMessages: Record<number, string> = {
  1: "Fast. Die Schraube war wohl zu kurz.",
  2: "Hält wieder nicht. Hat jemand Kabelbinder?",
  3: "Auch das Repair-Café ist ratlos.",
  5: "Du gibst nicht auf. Genau das braucht der Rekord.",
  8: "Ehrlich: Echte Dinge lassen sich leichter reparieren als diese Seite.",
  12: "Die Null bleibt locker. Aber du hast Ausdauer - trag doch eine echte Reparatur ein.",
};

type ZeroState = "loose" | "fixing" | "slipping";

/** Die 404 aus drei Aufklebern, die Null haengt an einer Schraube. */
export function LooseZero() {
  const [state, setState] = useState<ZeroState>("loose");
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  function tighten() {
    if (state !== "loose") return;
    setState("fixing");
    timers.current.push(
      window.setTimeout(() => {
        setState("slipping");
        setAttempts((count) => {
          const next = count + 1;
          const reply = attemptMessages[next];
          if (reply) setMessage(reply);
          return next;
        });
      }, 1100),
      window.setTimeout(() => setState("loose"), 2000),
    );
  }

  return <div className="loose-zero">
    <div className={`broken-digits is-${state}`}>
      <span className="digit" aria-hidden="true">4</span>
      <button
        type="button"
        className="digit digit-zero"
        onClick={tighten}
        aria-label="Die lockere Null festschrauben"
        aria-disabled={state !== "loose"}
      >
        <span aria-hidden="true">0</span>
        <i className="screw screw-hold" aria-hidden="true" />
        <i className="screw-hole" aria-hidden="true" />
      </button>
      <span className="digit" aria-hidden="true">4</span>
      <i className="screw screw-flying" aria-hidden="true" />
      <svg className="fix-wrench" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.6 3.3a5 5 0 0 0-6 6.8l-8 8a2 2 0 1 0 2.8 2.8l8-8a5 5 0 0 0 6.8-6l-3 3-2.7-.7-.7-2.7z" />
      </svg>
      <i className="screw screw-floor" aria-hidden="true" />
    </div>
    <p className="loose-zero-log" aria-live="polite">
      {attempts === 0
        ? "Tipp: Die Null lässt sich festschrauben. Vielleicht."
        : <>
            <span className="loose-zero-count">Reparaturversuche: {attempts} · Erfolgreich: 0</span>
            {message}
          </>}
    </p>
  </div>;
}

/* Befunde fuer den Reparaturzettel der 404. Einer wird pro Besuch gezogen -
   erst nach dem Laden, damit Server und Browser dasselbe rendern. */
const diagnoses = [
  "Link hat sich gelöst",
  "Wackelkontakt zwischen Tastatur und Adresszeile",
  "Seite wurde weggeworfen statt repariert",
  "Tippfehler, klassischer Verschleiß",
  "Ersatzteil nicht mehr lieferbar",
  "Geplante Obsoleszenz (nicht von uns)",
  "Adresse beim Umzug verloren gegangen",
];

export type TicketRow = { label: string; value: React.ReactNode };

/** Reparaturzettel wie am Tresen im Repair-Café. */
export function RepairTicket({ number, rows }: { number: string; rows: TicketRow[] }) {
  return <aside className="repair-ticket" aria-label="Reparaturzettel">
    <p className="repair-ticket-head"><span>Reparaturzettel</span><span>Nr. {number}</span></p>
    <dl>
      {rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
    </dl>
  </aside>;
}

/** Zettel der 404: aufgerufene Adresse und ein zufaelliger Befund. */
export function NotFoundTicket() {
  const pathname = usePathname();
  const [diagnosis, setDiagnosis] = useState<string | null>(null);

  useEffect(() => {
    // Kurz "ermitteln" lassen - der Befund tippt sich nicht, er wird gestellt.
    const id = window.setTimeout(() => setDiagnosis(diagnoses[Math.floor(Math.random() * diagnoses.length)]), 900);
    return () => window.clearTimeout(id);
  }, []);

  return <RepairTicket number="404" rows={[
    { label: "Gerät", value: <code className="ticket-path">{pathname || "/"}</code> },
    { label: "Fehlerbild", value: "Seite nicht auffindbar" },
    { label: "Befund", value: diagnosis ?? <span className="ticket-pending">wird ermittelt</span> },
    { label: "Zählt für den Rekord", value: "Leider nein" },
  ]} />;
}

/**
 * Stecker, der aus der Dose gerutscht ist, mit Funken dazwischen. Wird
 * `plugging` gesetzt, faehrt er hinein - app/error.tsx tut das kurz, bevor es
 * die Seite neu laedt, damit der Knopf sichtbar etwas tut.
 */
export function ShortCircuit({ plugging = false }: { plugging?: boolean }) {
  return <svg className={`short-circuit${plugging ? " is-plugging" : ""}`} viewBox="0 0 320 140" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {/* Stecker samt Kabel, faehrt als Ganzes. Steht vor der Dose im
        Quelltext, damit die Dose die Stifte beim Einstecken verdeckt. */}
    <g className="plug">
      <path d="M-160 96c40 0 60-26 110-26h132" />
      <path d="M82 52h44a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10H82z" />
      <path d="M92 58v24M100 58v24" strokeWidth={1.2} />
      <path d="M136 64h26M136 76h26" strokeWidth={3} />
    </g>
    {/* Steckdose von der Seite, rechts in der Wand */}
    <g className="socket">
      <path className="wall" d="M300 10v120" />
      <path className="wall-hatch" d="M300 22l12-12M300 42l12-12M300 62l12-12M300 82l12-12M300 102l12-12M300 122l12-12" strokeWidth={1} />
      <rect x="240" y="44" width="60" height="52" />
      <path d="M240 64h8M240 76h8" strokeWidth={3} />
    </g>
    {/* Funken im Spalt */}
    <g className="sparks" strokeWidth={1.6}>
      <path className="spark spark-1" d="M182 50l8 10-6 2 9 12" />
      <path className="spark spark-2" d="M198 96l-6-10 7-1-8-11" />
      <path className="spark spark-3" d="M176 70h-10M208 66l10-4M205 82l9 6" />
    </g>
  </svg>;
}
