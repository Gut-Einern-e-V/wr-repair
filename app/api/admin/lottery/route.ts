import { requireSuperadmin } from "@/lib/admin-auth";
import { drawForPrize, readLotteryOverview, withdrawWin } from "@/lib/lottery-store";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Der Stand der Verlosung und die Ziehung selbst (Issue #45).
 *
 * Gezogen wird je Preis, nicht "irgendeine Person": Was jemand gewonnen hat,
 * muss in der Liste stehen, sonst laesst sich der Gewinn nicht zustellen.
 * Wieviel gezogen wird, sagt die Anzahl des Preises.
 *
 * Alles hier ist Superadmin-Sache. Eine Ziehung ist nicht rueckgaengig zu
 * machen, ohne dass jemand davon erfaehrt.
 */
export async function GET() {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const overview = await readLotteryOverview(createSupabaseAdminClient());
  if (!overview) {
    return Response.json({ error: "Der Stand der Verlosung konnte nicht geladen werden. Wurde die Migration ausgefuehrt?" }, { status: 502 });
  }

  return Response.json(overview);
}

export async function POST(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json() as { action?: unknown; prizeId?: unknown; entryId?: unknown; count?: unknown };
  const supabase = createSupabaseAdminClient();

  /* Fuer einen Preis ziehen. Ohne `count` werden alle offenen Exemplare
     dieses Preises auf einmal gezogen - fuer die kleinen Preise, die niemand
     einzeln auf einer Buehne verliest. Die Buehnenziehung schickt `count: 1`
     und zeigt jeden Zug fuer sich. */
  if (body.action === "draw") {
    if (typeof body.prizeId !== "string" || !body.prizeId) {
      return Response.json({ error: "Es fehlt, fuer welchen Preis gezogen werden soll." }, { status: 400 });
    }

    const wanted = body.count === undefined ? "all" as const : Number(body.count);
    if (wanted !== "all" && (!Number.isInteger(wanted) || wanted < 1 || wanted > 999)) {
      return Response.json({ error: "Die Anzahl der Zuege muss eine ganze Zahl ab 1 sein." }, { status: 400 });
    }

    const result = await drawForPrize(supabase, body.prizeId, wanted);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ winners: result.winners });
  }

  /* Neu ziehen: Die bisherige Ziehung wird zurueckgenommen, die Person
     ausgeschlossen und fuer denselben Preis noch einmal gezogen. Ein Schritt,
     weil zwei - erst zuruecknehmen, dann ziehen - dazwischen einen Preis ohne
     Gewinner*in stehen liessen, den jemand vergessen koennte. */
  if (body.action === "redraw") {
    if (typeof body.entryId !== "string" || !body.entryId) {
      return Response.json({ error: "Es fehlt, welche Ziehung zurueckgenommen werden soll." }, { status: 400 });
    }

    const withdrawn = await withdrawWin(supabase, body.entryId);
    if (!withdrawn.ok) {
      return Response.json({ error: withdrawn.error }, { status: withdrawn.status });
    }

    if (!withdrawn.prizeId) {
      return Response.json({ ok: true, winners: [] });
    }

    const result = await drawForPrize(supabase, withdrawn.prizeId, 1);
    if (!result.ok) {
      /* Die Ruecknahme steht schon. Das ist kein Fehlschlag des Ganzen: Der
         Preis ist wieder offen und kann spaeter gezogen werden, sobald es
         wieder Lose gibt. Die Meldung sagt genau das. */
      return Response.json({ ok: true, winners: [], notice: `Die Ziehung wurde zurueckgenommen. Neu gezogen wurde noch nicht: ${result.error}` });
    }

    return Response.json({ ok: true, winners: result.winners });
  }

  /* Zuruecknehmen ohne neuen Zug - wenn ein Gewinn ersatzlos entfaellt. */
  if (body.action === "withdraw") {
    if (typeof body.entryId !== "string" || !body.entryId) {
      return Response.json({ error: "Es fehlt, welche Ziehung zurueckgenommen werden soll." }, { status: 400 });
    }

    const withdrawn = await withdrawWin(supabase, body.entryId);
    if (!withdrawn.ok) {
      return Response.json({ error: withdrawn.error }, { status: withdrawn.status });
    }

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
