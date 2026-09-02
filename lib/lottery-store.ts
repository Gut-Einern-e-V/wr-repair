import { publicPrizeLogoUrl } from "./prize-logo";
import { eligibleEntries, normalizeEmail, openSlots, pickEntries, type LotteryEntry } from "./lottery";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Alles, was das Backend ueber das Gewinnspiel liest und schreibt (Issue #45).
 *
 * Die Regeln der Ziehung stehen in lib/lottery.ts und sind dort ohne Datenbank
 * pruefbar. Hier steht nur, wie sie an die Tabellen kommen - Abfragen,
 * Zuordnungen, das Speichern eines Zugs.
 */

export type PrizeRow = {
  id: string;
  title: string;
  description: string | null;
  sponsor_name: string | null;
  sponsor_kind: "organisation" | "person";
  sponsor_website: string | null;
  logo_path: string | null;
  quantity: number;
  is_main: boolean;
  sort_order: number;
};

/**
 * Eine gezogene Person, so wie das Backend sie zeigt.
 *
 * Mit Herkunft, Kategorie und Reparaturgeschichte: Wer die Gewinne verschickt,
 * schreibt die Mails von Hand und braucht dafuer den Zusammenhang - und bei
 * der Buehnenziehung ist genau das die Geschichte, die erzaehlt wird.
 */
export type WinnerView = {
  entryId: string;
  name: string;
  email: string;
  drawnAt: string | null;
  repair: {
    id: string;
    category: string;
    kreis: string | null;
    brandModel: string | null;
    story: string | null;
    succeeded: boolean;
  } | null;
};

export type PrizeView = {
  id: string;
  title: string;
  description: string | null;
  sponsorName: string | null;
  sponsorKind: "organisation" | "person";
  sponsorWebsite: string | null;
  logoUrl: string | null;
  quantity: number;
  isMain: boolean;
  sortOrder: number;
  winners: WinnerView[];
  /** Wie viele Exemplare dieses Preises noch niemandem gehoeren. */
  open: number;
};

/** Eine Zeile aus `lottery_entries` samt eingebetteter Reparatur. */
export type EntryRow = {
  id: string;
  repair_id: string;
  name: string;
  email: string;
  winner: boolean;
  excluded_at: string | null;
  prize_id: string | null;
  drawn_at: string | null;
  created_at: string;
  /* PostgREST haengt die Reparatur als Objekt an - oder als Liste, je nachdem,
     wie es die Beziehung aufloest. Beides wird unten abgefangen, damit ein
     Wechsel der Bibliotheksversion nicht die Ziehung lahmlegt. */
  repairs: RepairRow | RepairRow[] | null;
};

export type RepairRow = {
  id: string;
  status: string;
  category: string;
  kreis: string | null;
  brand_model: string | null;
  story: string | null;
  repair_succeeded: boolean;
};

const entryColumns =
  "id, repair_id, name, email, winner, excluded_at, prize_id, drawn_at, created_at, repairs(id, status, category, kreis, brand_model, story, repair_succeeded)";

function repairOf(row: EntryRow): RepairRow | null {
  if (!row.repairs) return null;
  return Array.isArray(row.repairs) ? row.repairs[0] ?? null : row.repairs;
}

function toLotteryEntry(row: EntryRow): LotteryEntry {
  return {
    id: row.id,
    repairId: row.repair_id,
    name: row.name,
    email: row.email,
    winner: row.winner,
    excluded: row.excluded_at !== null,
    approved: repairOf(row)?.status === "approved",
  };
}

function toWinnerView(row: EntryRow): WinnerView {
  const repair = repairOf(row);
  return {
    entryId: row.id,
    name: row.name,
    email: row.email,
    drawnAt: row.drawn_at,
    repair: repair
      ? {
          id: repair.id,
          category: repair.category,
          kreis: repair.kreis,
          brandModel: repair.brand_model,
          story: repair.story,
          succeeded: repair.repair_succeeded,
        }
      : null,
  };
}

/**
 * Seitengroesse beim Lesen der Anmeldungen.
 *
 * Gelesen wird ausdruecklich in Seiten und nicht in einem Zug: PostgREST
 * begrenzt eine Abfrage ohne Bereichsangabe je nach Projekteinstellung
 * stillschweigend - und eine Verlosung, die nur die ersten tausend Lose in den
 * Topf legt, waere falsch, ohne dass es jemandem auffiele.
 */
const ENTRY_PAGE_SIZE = 1_000;

/** Schutz gegen eine Endlosschleife, falls der Server anders paginiert als erwartet. */
const MAX_ENTRY_PAGES = 200;

export async function readEntries(supabase: SupabaseClient) {
  const rows: EntryRow[] = [];

  for (let page = 0; page < MAX_ENTRY_PAGES; page += 1) {
    const start = page * ENTRY_PAGE_SIZE;
    const { data, error } = await supabase
      .from("lottery_entries")
      .select(entryColumns)
      .order("created_at", { ascending: false })
      .range(start, start + ENTRY_PAGE_SIZE - 1);

    if (error) return { rows: null, error };

    const batch = (data ?? []) as unknown as EntryRow[];
    rows.push(...batch);
    if (batch.length < ENTRY_PAGE_SIZE) break;
  }

  return { rows, error: null };
}

export async function readPrizes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("lottery_prizes")
    .select("id, title, description, sponsor_name, sponsor_kind, sponsor_website, logo_path, quantity, is_main, sort_order")
    .order("is_main", { ascending: false })
    .order("sort_order")
    .order("created_at");

  if (error) return { rows: null, error };
  return { rows: (data ?? []) as PrizeRow[], error: null };
}

export async function readExclusions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("lottery_exclusions")
    .select("id, pattern, note, created_at")
    .order("created_at");

  if (error) return { rows: null, error };
  return { rows: (data ?? []) as { id: string; pattern: string; note: string | null; created_at: string }[], error: null };
}

export function buildPrizeViews(prizes: PrizeRow[], entries: EntryRow[]): PrizeView[] {
  const winnersByPrize = new Map<string, WinnerView[]>();
  for (const row of entries) {
    if (!row.winner || !row.prize_id) continue;
    const list = winnersByPrize.get(row.prize_id) ?? [];
    list.push(toWinnerView(row));
    winnersByPrize.set(row.prize_id, list);
  }

  return prizes.map((prize) => {
    const winners = (winnersByPrize.get(prize.id) ?? []).sort((left, right) =>
      (left.drawnAt ?? "").localeCompare(right.drawnAt ?? ""));
    return {
      id: prize.id,
      title: prize.title,
      description: prize.description,
      sponsorName: prize.sponsor_name,
      sponsorKind: prize.sponsor_kind,
      sponsorWebsite: prize.sponsor_website,
      logoUrl: publicPrizeLogoUrl(prize.logo_path),
      quantity: prize.quantity,
      isMain: prize.is_main,
      sortOrder: prize.sort_order,
      winners,
      open: openSlots(prize.quantity, winners.length),
    };
  });
}

/**
 * Der ganze Stand des Gewinnspiels in einem Zug: Preise samt Gewinner*innen,
 * die Ausschlussliste und die Zahlen darunter.
 */
export async function readLotteryOverview(supabase: SupabaseClient) {
  const [entriesResult, prizesResult, exclusionsResult] = await Promise.all([
    readEntries(supabase),
    readPrizes(supabase),
    readExclusions(supabase),
  ]);

  if (!entriesResult.rows || !prizesResult.rows || !exclusionsResult.rows) {
    return null;
  }

  const entries = entriesResult.rows;
  const patterns = exclusionsResult.rows.map((rule) => rule.pattern);
  const eligible = eligibleEntries(entries.map(toLotteryEntry), patterns);

  return {
    prizes: buildPrizeViews(prizesResult.rows, entries),
    exclusions: exclusionsResult.rows,
    counts: {
      entries: entries.length,
      /* Anmeldungen zu Reparaturen, die noch in der Moderation liegen. Sie
         koennen noch dazukommen - die Zahl gehoert deshalb sichtbar neben die
         teilnehmenden Lose, sonst wundert sich jemand ueber den Unterschied. */
      pending: entries.filter((row) => repairOf(row)?.status === "pending").length,
      eligible: eligible.length,
      /* Nicht die Zahl der Lose, sondern die der Personen: Wer mehrfach
         eingereicht hat, zaehlt einmal. */
      people: new Set(eligible.map((entry) => normalizeEmail(entry.email))).size,
      winners: entries.filter((row) => row.winner).length,
    },
  };
}

export type DrawOutcome =
  | { ok: true; winners: WinnerView[] }
  | { ok: false; status: number; error: string };

/**
 * Fuer einen Preis ziehen und das Ergebnis festschreiben.
 *
 * Die Lose werden unmittelbar vor der Ziehung gelesen, nicht aus einem
 * mitgegebenen Stand: Zwischen dem Aufbau der Seite und dem Druck auf den
 * Knopf koennen Einreichungen freigegeben oder Personen ausgeschlossen worden
 * sein, und die muessen mitzaehlen.
 */
export async function drawForPrize(
  supabase: SupabaseClient,
  prizeId: string,
  wanted: number | "all",
  random: () => number = Math.random,
): Promise<DrawOutcome> {
  const [entriesResult, prizesResult, exclusionsResult] = await Promise.all([
    readEntries(supabase),
    readPrizes(supabase),
    readExclusions(supabase),
  ]);

  if (!entriesResult.rows || !prizesResult.rows || !exclusionsResult.rows) {
    return { ok: false, status: 502, error: "Der Stand der Verlosung konnte nicht gelesen werden." };
  }

  const prize = prizesResult.rows.find((row) => row.id === prizeId);
  if (!prize) {
    return { ok: false, status: 404, error: "Diesen Preis gibt es nicht (mehr)." };
  }

  const view = buildPrizeViews([prize], entriesResult.rows)[0];
  if (view.open === 0) {
    return { ok: false, status: 409, error: `„${prize.title}“ ist bereits vollständig vergeben.` };
  }

  const rounds = wanted === "all" ? view.open : Math.min(wanted, view.open);
  const pool = eligibleEntries(
    entriesResult.rows.map(toLotteryEntry),
    exclusionsResult.rows.map((rule) => rule.pattern),
  );

  if (pool.length === 0) {
    return { ok: false, status: 409, error: "Es liegt keine teilnahmeberechtigte Anmeldung vor." };
  }

  const picked = pickEntries(pool, rounds, random);
  const drawnAt = new Date().toISOString();

  /* Nacheinander und mit Bedingung auf `winner = false`: Zoege jemand
     gleichzeitig fuer denselben Preis, wuerde der zweite Schreibvorgang die
     Zeile nicht mehr finden statt den ersten Gewinn zu ueberschreiben. */
  const confirmed: string[] = [];
  for (const entry of picked) {
    const { data, error } = await supabase
      .from("lottery_entries")
      .update({ winner: true, drawn_at: drawnAt, prize_id: prizeId })
      .eq("id", entry.id)
      .eq("winner", false)
      .select("id");

    if (error) {
      return { ok: false, status: 502, error: "Die Ziehung konnte nicht gespeichert werden." };
    }
    if (data?.length) confirmed.push(entry.id);
  }

  if (confirmed.length === 0) {
    return { ok: false, status: 409, error: "Die gezogene Anmeldung wurde inzwischen anderweitig vergeben. Bitte erneut ziehen." };
  }

  const after = await readEntries(supabase);
  if (!after.rows) {
    return { ok: false, status: 502, error: "Die Ziehung ist gespeichert, konnte aber nicht gelesen werden." };
  }

  return { ok: true, winners: after.rows.filter((row) => confirmed.includes(row.id)).map(toWinnerView) };
}

/**
 * Eine Ziehung zuruecknehmen (Issue #45).
 *
 * Der Anlass ist immer derselbe: Es wurde jemand gezogen, der nicht gewinnen
 * durfte - jemand aus dem Team etwa. Deshalb wird die Anmeldung nicht nur
 * zurueckgesetzt, sondern ausgeschlossen. Ohne das kaeme sie beim naechsten
 * Zug sofort wieder heraus, und jede weitere Ziehung waere Gluecksache.
 *
 * Ausgeschlossen wird die Person, nicht das einzelne Los: Wer nicht gewinnen
 * darf, darf mit keiner seiner Einreichungen gewinnen.
 */
export async function withdrawWin(supabase: SupabaseClient, entryId: string) {
  const { data: entry, error } = await supabase
    .from("lottery_entries")
    .select("id, email, prize_id, winner")
    .eq("id", entryId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 502, error: "Die Anmeldung konnte nicht gelesen werden." };
  if (!entry) return { ok: false as const, status: 404, error: "Diese Anmeldung gibt es nicht." };
  if (!entry.winner) return { ok: false as const, status: 409, error: "Diese Anmeldung hat nichts gewonnen." };

  const prizeId = entry.prize_id as string | null;
  const address = normalizeEmail(entry.email as string);

  /* Die betroffenen Lose werden gesucht und dann ueber ihre Kennungen
     geaendert, nicht ueber einen Adressvergleich in der Abfrage: `ilike`
     behandelt `%` und `_` als Platzhalter, und `_` steht in vielen echten
     E-Mail-Adressen. Ein Ausschluss, der die falsche Person trifft, waere
     schlimmer als ein Aufruf mehr. */
  const ids: string[] = [];
  for (let page = 0; page < MAX_ENTRY_PAGES; page += 1) {
    const start = page * ENTRY_PAGE_SIZE;
    const { data, error: pageError } = await supabase
      .from("lottery_entries")
      .select("id, email")
      .order("created_at")
      .range(start, start + ENTRY_PAGE_SIZE - 1);

    if (pageError) {
      return { ok: false as const, status: 502, error: "Die Anmeldungen konnten nicht gelesen werden." };
    }

    const batch = data ?? [];
    for (const row of batch) {
      if (normalizeEmail(row.email as string) === address) ids.push(row.id as string);
    }
    if (batch.length < ENTRY_PAGE_SIZE) break;
  }

  const { error: updateError } = await supabase
    .from("lottery_entries")
    .update({ winner: false, drawn_at: null, prize_id: null, excluded_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    return { ok: false as const, status: 502, error: "Die Ziehung konnte nicht zurueckgenommen werden." };
  }

  return { ok: true as const, prizeId };
}
