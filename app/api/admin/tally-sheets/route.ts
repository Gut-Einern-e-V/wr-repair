import { requireAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import { kreisForPoint } from "@/lib/nrw-map";
import { locateInRegion } from "@/lib/origin-check";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { TALLY_TAG, eventTimestamp, expandCounts, parseTallySheet } from "@/lib/tally-sheet";

/**
 * Strichlisten von Repair-Cafes nachtragen (Issue #158).
 *
 * Eine Liste wird zu einer Zeile in `tally_sheets` und je Reparatur einer
 * Zeile in `repairs`. Die Reparaturen sind gleich freigegeben: Eingetragen hat
 * sie das Team selbst, eine zweite Pruefung in der Moderation waere dieselbe
 * Person noch einmal. Gezaehlt wird am Tag der Veranstaltung, nicht am Tag des
 * Nachtragens - sonst laege der Tagesrekord auf dem Bueroabend.
 */

function berlinToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tally_sheets")
    .select("id, cafe_name, address, event_date, kreis, repair_count, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: "Strichlisten konnten nicht geladen werden. Wurde die Migration 202610210001 ausgeführt?" }, { status: 502 });

  return Response.json({ sheets: data ?? [] });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const parsed = parseTallySheet(await request.json().catch(() => null), berlinToday());
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { sheet } = parsed;

  const settings = await getAppSettings();
  if (locateInRegion(sheet.point, settings.region) === "outside") {
    return Response.json({ error: `Der Ort liegt nicht in ${settings.region.label}. Bitte Adresse oder Koordinaten prüfen.` }, { status: 400 });
  }
  const kreis = kreisForPoint(sheet.point);

  const supabase = createSupabaseAdminClient();
  const adminId = authorization.currentAdmin.user.id;
  const sheetId = crypto.randomUUID();
  const { error: sheetError } = await supabase.from("tally_sheets").insert({
    id: sheetId,
    cafe_name: sheet.cafeName,
    address: sheet.address,
    event_date: sheet.eventDate,
    location_lat: sheet.point.lat,
    location_lon: sheet.point.lon,
    kreis,
    repair_count: sheet.total,
    created_by: adminId,
  });
  if (sheetError) return Response.json({ error: "Die Strichliste konnte nicht gespeichert werden. Wurde die Migration 202610210001 ausgeführt?" }, { status: 502 });

  const countedAt = eventTimestamp(sheet.eventDate);
  const moderatedAt = new Date().toISOString();
  const repairs = expandCounts(sheet.counts).map((category) => ({
    id: crypto.randomUUID(),
    tally_sheet_id: sheetId,
    category,
    repair_succeeded: true,
    tags: [TALLY_TAG],
    image_path: null,
    // Ohne Foto gibt es nichts zu veroeffentlichen; die Spalte verlangt die
    // Zustimmung aber fuer jede freigegebene Reparatur.
    consent_publication: true,
    status: "approved",
    // `moderated_at` jetzt, damit der Live-Stand die Zeilen als neu erkennt
    // (dashboard_delta liest ab dem letzten Freigabezeitpunkt).
    moderated_by: adminId,
    moderated_at: moderatedAt,
    moderator_comment: `Strichliste ${sheet.cafeName}`,
    created_at: countedAt,
    entry_time: countedAt,
    location_region: settings.region.label,
    location_lat: sheet.point.lat,
    location_lon: sheet.point.lon,
    kreis,
    origin_source: "manual",
  }));

  /* Ein Insert fuer alle Zeilen: Postgres nimmt ihn ganz oder gar nicht. Fuer
     die Lose danach gilt dasselbe; schlaegt einer der beiden fehl, nimmt das
     Loeschen der Liste alles mit (on delete cascade). */
  const { error: repairsError } = await supabase.from("repairs").insert(repairs);
  if (repairsError) {
    await supabase.from("tally_sheets").delete().eq("id", sheetId);
    return Response.json({ error: "Die Reparaturen konnten nicht gespeichert werden." }, { status: 502 });
  }

  if (sheet.lottery) {
    const { name, email } = sheet.lottery;
    const { error: lotteryError } = await supabase
      .from("lottery_entries")
      .insert(repairs.map((repair) => ({ repair_id: repair.id, name, email })));
    if (lotteryError) {
      await supabase.from("tally_sheets").delete().eq("id", sheetId);
      return Response.json({ error: "Die Gewinnspiel-Lose konnten nicht gespeichert werden. Es wurde nichts eingetragen." }, { status: 502 });
    }
  }

  return Response.json({ id: sheetId, total: sheet.total, kreis }, { status: 201 });
}

/**
 * Eine Liste zuruecknehmen, etwa nach einem Tippfehler. Ihre Reparaturen und
 * Lose verschwinden mit ihr. Hat eines der Lose schon gewonnen, bleibt sie
 * stehen - eine Ziehung nimmt man nicht nebenbei zurueck.
 */
export async function DELETE(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Keine Strichliste angegeben." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  // Ueber die Reparatur gefiltert statt mit einer Liste von IDs: Eine Liste
  // kann tausend Lose haben, und die passten in keine Adresszeile.
  const { count, error: winnerError } = await supabase
    .from("lottery_entries")
    .select("id, repairs!inner(tally_sheet_id)", { count: "exact", head: true })
    .eq("repairs.tally_sheet_id", id)
    .or("winner.eq.true,prize_id.not.is.null");
  if (winnerError) return Response.json({ error: "Die Strichliste konnte nicht geprüft werden." }, { status: 502 });
  if (count) return Response.json({ error: "Ein Los dieser Liste hat bereits gewonnen. Bitte zuerst die Ziehung zurücknehmen." }, { status: 409 });

  const { error } = await supabase.from("tally_sheets").delete().eq("id", id);
  if (error) return Response.json({ error: "Die Strichliste konnte nicht entfernt werden." }, { status: 502 });
  return Response.json({ ok: true });
}
