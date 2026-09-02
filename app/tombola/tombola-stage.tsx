"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FullscreenButton } from "@/app/stats/fullscreen-button";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { useJsonResource } from "@/lib/use-json-resource";
import type { PrizeView, WinnerView } from "@/lib/lottery-store";
import "./tombola.css";

type Overview = {
  prizes: PrizeView[];
  counts: { entries: number; pending: number; eligible: number; people: number; winners: number };
};

/**
 * Wie lange die Namen durchlaufen, bevor der Zug stehenbleibt.
 *
 * Die Ziehung selbst faellt auf dem Server und ist beim ersten Bildwechsel
 * schon entschieden - das Durchlaufen ist Dramaturgie, keine Auslosung. Es
 * darf deshalb nichts verzoegern, was schiefgehen koennte: Steht die Antwort
 * frueher da, wartet die Anzeige trotzdem; kommt sie spaeter, laeuft es
 * weiter, bis sie da ist.
 */
const ROLL_MS = 2_600;
const ROLL_STEP_MS = 90;

/** Namen laufen durch - nur zur Ansicht, nie als Ergebnis. */
function useRoll(active: boolean, names: string[]) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || names.length === 0) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), ROLL_STEP_MS);
    return () => window.clearInterval(timer);
  }, [active, names]);

  if (!active || names.length === 0) return null;
  return names[tick % names.length];
}

type DrawResult = { winners?: WinnerView[]; error?: string; notice?: string };

/**
 * Eine Ziehung anstossen und dabei die volle Laufzeit der Animation abwarten.
 *
 * Anfrage und Uhr laufen nebeneinander, nicht nacheinander: So dauert der Zug
 * immer gleich lang, egal ob der Server in 80 Millisekunden antwortet oder in
 * zwei Sekunden. Ohne das waere die Spannung auf der Buehne eine Frage der
 * Netzgeschwindigkeit.
 */
async function drawWithSuspense(body: Record<string, unknown>): Promise<DrawResult> {
  const request = (async (): Promise<DrawResult> => {
    try {
      const response = await fetch("/api/admin/lottery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as DrawResult;
      return response.ok ? payload : { error: payload.error ?? "Es konnte nicht gezogen werden." };
    } catch {
      return { error: "Die Ziehung ist nicht durchgekommen. Verbindung prüfen und erneut versuchen." };
    }
  })();

  const [result] = await Promise.all([request, new Promise((resolve) => window.setTimeout(resolve, ROLL_MS))]);
  return result;
}

function WinnerStage({ winner }: { winner: WinnerView }) {
  return (
    <div className="tombola-winner">
      <p className="tombola-eyebrow">Gezogen</p>
      <p className="tombola-name">{winner.name}</p>
      {winner.repair && (
        <p className="tombola-repair">
          {repairCategoryLabel(winner.repair.category)}
          {winner.repair.brandModel ? ` · ${winner.repair.brandModel}` : ""}
          {winner.repair.kreis ? ` · ${winner.repair.kreis}` : ""}
        </p>
      )}
      {winner.repair?.story && <p className="tombola-story">„{winner.repair.story}“</p>}
    </div>
  );
}

export default function TombolaStage() {
  const { data, error, isLoading, reload } = useJsonResource<Overview>("/api/admin/lottery", "Der Stand der Verlosung konnte nicht geladen werden.");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [drawn, setDrawn] = useState<WinnerView | null>(null);
  const [notice, setNotice] = useState("");

  const prizes = useMemo(() => data?.prizes ?? [], [data]);
  const mainPrizes = prizes.filter((prize) => prize.isMain);
  /* Ohne ausdrueckliche Wahl steht der erste Hauptpreis mit offenen
     Exemplaren vorne - auf einer Buehne soll niemand erst etwas auswaehlen. */
  const selected = mainPrizes.find((prize) => prize.id === selectedId)
    ?? mainPrizes.find((prize) => prize.open > 0)
    ?? mainPrizes[0]
    ?? null;

  /* Was durchlaeuft, sind die schon gezogenen Namen - die Liste aller
     Teilnehmenden verlaesst den Server bewusst nicht, auch nicht fuer eine
     Animation. Vor der ersten Ziehung gibt es nichts zu zeigen; dann laeuft
     ein Platzhalter. */
  const rollNames = useMemo(() => {
    const names = prizes.flatMap((prize) => prize.winners.map((winner) => winner.name));
    return names.length > 0 ? names : ["…"];
  }, [prizes]);

  const rolling = useRoll(isRolling, rollNames);

  async function draw() {
    if (!selected || selected.open === 0) return;
    setNotice("");
    setDrawn(null);
    setIsRolling(true);

    const result = await drawWithSuspense({ action: "draw", prizeId: selected.id, count: 1 });

    setIsRolling(false);
    if (result.error || !result.winners?.length) {
      setNotice(result.error ?? "Es liegt keine teilnahmeberechtigte Anmeldung vor.");
      return;
    }

    setDrawn(result.winners[0]);
    reload();
  }

  async function redraw(entryId: string) {
    if (!window.confirm("Neu ziehen? Die gezogene Person wird dabei von der Verlosung ausgeschlossen.")) return;
    setNotice("");
    setDrawn(null);
    setIsRolling(true);

    const result = await drawWithSuspense({ action: "redraw", entryId });

    setIsRolling(false);
    reload();
    if (result.winners?.length) {
      setDrawn(result.winners[0]);
      return;
    }
    setNotice(result.notice ?? result.error ?? "Es wurde niemand neu gezogen.");
  }

  return (
    <main className="tombola-shell">
      <header className="tombola-header">
        <p className="brand-kicker">Reparaturrekord NRW · Ziehung</p>
        <div className="tombola-header-actions">
          <Link className="text-button" href="/admin">Zur Verwaltung</Link>
          <FullscreenButton />
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      {isLoading && <p className="tombola-hint">Der Stand der Verlosung wird geladen.</p>}

      {!isLoading && mainPrizes.length === 0 && (
        <p className="tombola-hint">
          Für die Bühne ist noch kein Hauptpreis eingetragen. In der <Link href="/admin">Verwaltung</Link> lässt sich
          bei einem Preis das Häkchen „Hauptpreis“ setzen.
        </p>
      )}

      {selected && (
        <section className="tombola-stage" aria-live="polite">
          <p className="tombola-eyebrow">{selected.isMain ? "Hauptpreis" : "Preis"}</p>
          <h1 className="tombola-prize">{selected.title}</h1>
          {selected.description && <p className="tombola-prize-note">{selected.description}</p>}
          {selected.sponsorName && (
            <p className="tombola-sponsor">
              Gestiftet von {selected.sponsorName}
              {selected.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- Logo aus dem oeffentlichen Speicher, ohne feste Groesse.
                <img src={selected.logoUrl} alt="" />
              )}
            </p>
          )}

          {isRolling
            ? <p className="tombola-name is-rolling">{rolling ?? "…"}</p>
            : drawn
              ? <WinnerStage winner={drawn} />
              : <p className="tombola-idle">{selected.open > 0 ? `${selected.open} von ${selected.quantity} noch zu vergeben` : "Vollständig vergeben"}</p>}

          {notice && <p className="tombola-hint" role="status">{notice}</p>}

          <div className="tombola-actions">
            <button className="button button-primary" type="button" disabled={isRolling || selected.open === 0} onClick={() => void draw()}>
              {isRolling ? "Zieht ..." : selected.open === 0 ? "Vergeben" : "Ziehen"}
            </button>
            {drawn && (
              <button className="button button-secondary" type="button" disabled={isRolling} onClick={() => void redraw(drawn.entryId)}>
                Neu ziehen
              </button>
            )}
          </div>
        </section>
      )}

      {mainPrizes.length > 1 && (
        <nav className="tombola-prizes" aria-label="Hauptpreise">
          {mainPrizes.map((prize) => (
            <button
              key={prize.id}
              type="button"
              className={prize.id === selected?.id ? "is-current" : ""}
              disabled={isRolling}
              onClick={() => { setSelectedId(prize.id); setDrawn(null); setNotice(""); }}
            >
              {prize.title}
              <small>{prize.open > 0 ? `${prize.open} offen` : "vergeben"}</small>
            </button>
          ))}
        </nav>
      )}

      {selected && selected.winners.length > 0 && (
        <section className="tombola-drawn" aria-label={`Bereits gezogen für ${selected.title}`}>
          <p className="tombola-eyebrow">Bereits gezogen</p>
          <ul>
            {selected.winners.map((winner) => (
              <li key={winner.entryId}>
                <span>{winner.name}{winner.repair?.kreis ? ` · ${winner.repair.kreis}` : ""}</span>
                <button className="text-button" type="button" disabled={isRolling} onClick={() => void redraw(winner.entryId)}>Neu ziehen</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
