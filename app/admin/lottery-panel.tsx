"use client";

import { useState } from "react";
import { useJsonResource } from "@/lib/use-json-resource";

type LotteryEntry = { id: string; repair_id: string; name: string; email: string; winner: boolean; drawn_at: string | null; created_at: string };

/** Verlosung unter den angemeldeten Teilnehmer*innen. Nur Superadmins. */
export default function LotteryPanel({ onStatus, onError }: { onStatus: (message: string) => void; onError: (message: string) => void }) {
  const { data, error, isLoading, reload } = useJsonResource<{ entries: LotteryEntry[] }>("/api/admin/lottery", "Verlosungseintraege konnten nicht geladen werden.");
  const [winner, setWinner] = useState<LotteryEntry | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const entries = data?.entries ?? [];
  const drawn = entries.filter((entry) => entry.winner);

  async function draw() {
    if (!window.confirm("Jetzt eine Gewinner*in auslosen?")) return;
    setIsDrawing(true);

    try {
      const response = await fetch("/api/admin/lottery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draw" }),
      });
      const payload = await response.json() as { winner?: LotteryEntry; error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Verlosung konnte nicht gestartet werden.");
        return;
      }

      setWinner(payload.winner ?? null);
      onStatus("Gewinner*in wurde ausgelost.");
      reload();
    } finally {
      setIsDrawing(false);
    }
  }

  return (
    <div className="admin-stack">
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="form-notice">{isLoading ? "Verlosung wird geladen." : `${entries.length} Teilnehmer*innen haben sich fuer die Verlosung angemeldet, ${drawn.length} davon wurden bereits gezogen.`}</p>
      <button className="button button-primary" type="button" disabled={isDrawing || isLoading} onClick={() => void draw()}>{isDrawing ? "Lost aus ..." : "Gewinner*in auslosen"}</button>
      {winner && (
        <div className="lottery-winner">
          <p className="section-index">Gewinner*in</p>
          <p><strong>{winner.name}</strong> &mdash; {winner.email}</p>
          <p>Ausgelost am {winner.drawn_at ? new Date(winner.drawn_at).toLocaleString("de-DE") : "–"}</p>
        </div>
      )}
      {drawn.length > 0 && (
        <div className="lottery-winners-list">
          <p className="section-index">Bisherige Gewinner*innen</p>
          {drawn.map((entry) => (
            <div key={entry.id} className="user-row">
              <div><strong>{entry.name}</strong><span>{entry.email}</span></div>
              <span>{entry.drawn_at ? new Date(entry.drawn_at).toLocaleString("de-DE") : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
