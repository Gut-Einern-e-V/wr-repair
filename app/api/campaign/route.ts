import { getAppSettings } from "@/lib/app-settings";
import { publicRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Zeitraum und Zielzahl der Aktion - die beiden Angaben, die jede oeffentliche
 * Seite braucht, bevor irgendeine Zahl gezaehlt ist.
 *
 * Das Ziel steht bewusst hier und nicht nur in `/api/stats` (Issue #74): Die
 * Statistik ist vor dem Start des Zeitraums geschlossen (403), das Ziel aber
 * schon vorher eine gueltige Auskunft - sonst muesste die Startseite in der
 * Wartezeit eine feste Zahl behaupten, und genau die lief mit der Zeit gegen
 * die im Backend eingestellte auseinander.
 *
 * Beide Werte kommen aus denselben Einstellungen wie die Zugangspruefung der
 * Einreichung; die Antwort widerspricht dem Formular damit nie.
 */
/**
 * Anfragen je Minute und IP-Adresse im Normalbetrieb.
 *
 * Die Antwort ist winzig und wird von jeder oeffentlichen Seite einmal beim
 * Laden geholt; sie darf im Alltag nicht anschlagen. Eine Grenze gibt es
 * trotzdem: Die Route ist `no-store`, laeuft also an jedem Cache vorbei und
 * kostet je Aufruf eine Datenbankabfrage (Issue #80).
 */
const CAMPAIGN_LIMIT_PER_MINUTE = 240;

export async function GET(request: Request) {
  const { submissionWindow: campaign, recordGoal, publicThrottle } = await getAppSettings();

  const limit = publicRateLimit(request, "campaign", publicThrottle, CAMPAIGN_LIMIT_PER_MINUTE);
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Abfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  return Response.json(
    {
      status: campaign.status,
      startAt: campaign.startAt?.toISOString() ?? null,
      endAt: campaign.endAt?.toISOString() ?? null,
      goal: recordGoal,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
