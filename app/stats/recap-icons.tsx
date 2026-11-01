import { useId } from "react";

/**
 * Zeichen fuer den Rueckblick.
 *
 * Die Kennzahlen unter "Anschaulich gesagt" bekommen Konturzeichen im selben
 * 24er-Raster wie components/step-icons.tsx. Der Pokal neben den Rekorden ist
 * die Ausnahme: gefuellt und golden, weil er das eine Ergebnis feiert.
 */

const factShapes = {
  /** Uhr: der Takt, in dem Reparaturen dazukamen. */
  clock: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3.2 2",
  /** Sanduhr: wie lange alles am Stueck gedauert haette. */
  hourglass: "M6.5 3h11M6.5 21h11M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9",
  /** Euromuenze: der Wert, der geblieben ist. */
  euro: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM15.4 8.7a4.2 4.2 0 1 0 0 6.6M7.6 10.8h5.4M7.6 13.2h5.4",
  /** Schraubenschluessel - wie bei den Mitmach-Schritten. */
  wrench: "M17.6 3.3a5 5 0 0 0-6 6.8l-8 8a2 2 0 1 0 2.8 2.8l8-8a5 5 0 0 0 6.8-6l-3 3-2.7-.7-.7-2.7z",
  /** Blatt: eingespartes CO2e. */
  leaf: "M4.5 19.5c0-8.5 5.5-14 15-15c-.6 9.6-6 15-14 15zM4.5 19.5l7.5-7.5",
} as const;

export type FactIconName = keyof typeof factShapes;

export function FactIcon({ name }: { name: FactIconName }) {
  return (
    <svg aria-hidden="true" className="recap-fact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={factShapes[name]} />
    </svg>
  );
}

export function Trophy() {
  const id = useId();
  const gold = `${id}-gold`;
  const shine = `${id}-shine`;

  return (
    <svg aria-hidden="true" className="recap-trophy" viewBox="0 0 64 64">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b3" />
          <stop offset=".45" stopColor="#ffc432" />
          <stop offset="1" stopColor="#b8770a" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Henkel */}
      <path d="M18 13h-7v4c0 5.5 4 9.5 9.5 10M46 13h7v4c0 5.5-4 9.5-9.5 10" fill="none" stroke={`url(#${gold})`} strokeWidth="3.4" strokeLinecap="round" />
      {/* Kelch */}
      <path d="M17 7h30v15c0 9.6-6.7 16-15 16s-15-6.4-15-16z" fill={`url(#${gold})`} />
      <path d="M21 10h4v12c0 5 2 8.6 5 10.6-5.4-.8-9-5.2-9-11z" fill={`url(#${shine})`} />
      {/* Stern */}
      <path d="m32 13 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" fill="#fff6d1" opacity=".9" />
      {/* Stiel und Sockel */}
      <path d="M29 37.5h6v7h-6z" fill={`url(#${gold})`} />
      <path d="M22.5 44.5h19l2 7h-23z" fill={`url(#${gold})`} />
      <rect x="18" y="51.5" width="28" height="5.5" rx="1.2" fill="#b8770a" />
    </svg>
  );
}
