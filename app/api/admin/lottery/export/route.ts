import { requireSuperadmin } from "@/lib/admin-auth";
import { readLotteryOverview } from "@/lib/lottery-store";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Die gezogenen Personen als CSV (Issue #45).
 *
 * Die Gewinnbenachrichtigungen werden von Hand geschrieben. Wer das tut,
 * braucht eine Liste, in der sich abhaken laesst, wen man schon angeschrieben
 * hat - und darin nicht nur Name und Adresse, sondern auch den Preis und den
 * Zusammenhang: Kreis, Kategorie, Reparaturgeschichte. Ohne den liest sich
 * jede dieser Mails wie ein Serienbrief.
 *
 * Die Datei enthaelt Namen und E-Mail-Adressen und ist damit das Sensibelste,
 * was dieses Projekt herausgibt: kein Zwischenspeicher, nur Superadmins.
 */

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // Fuehrende Rechenzeichen macht eine Tabellenkalkulation sonst zur Formel.
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll("\"", "\"\"")}"`;
}

export async function GET() {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const overview = await readLotteryOverview(createSupabaseAdminClient());
  if (!overview) {
    return Response.json({ error: "Der Stand der Verlosung konnte nicht geladen werden." }, { status: 502 });
  }

  const columns = [
    "preis", "hauptpreis", "gestiftet_von", "name", "email",
    "gezogen_am", "reparatur_id", "kategorie", "kreis", "marke_modell", "gelungen", "geschichte",
  ];

  const rows = overview.prizes.flatMap((prize) => prize.winners.map((winner) => [
    prize.title,
    prize.isMain ? "ja" : "nein",
    prize.sponsorName ?? "",
    winner.name,
    winner.email,
    winner.drawnAt ?? "",
    winner.repair?.id ?? "",
    winner.repair?.category ?? "",
    winner.repair?.kreis ?? "",
    winner.repair?.brandModel ?? "",
    winner.repair ? (winner.repair.succeeded ? "ja" : "nein") : "",
    winner.repair?.story ?? "",
  ].map(escapeCsv).join(";")));

  const csv = `﻿${columns.map(escapeCsv).join(";")}\r\n${rows.join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename=gewinnspiel-gewinner.csv",
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
