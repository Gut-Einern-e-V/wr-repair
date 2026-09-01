/**
 * Die Phase des Rekordversuchs, im Browser fortgeschrieben (Issue #66).
 *
 * Der Server sagt beim Laden, ob der Zeitraum laeuft. Danach steht diese
 * Auskunft still: Ein Browser, der beim Ablauf der Frist offen ist, hat bis
 * hierher weiter "laeuft" geglaubt und die Uhr auf 00:00:00 stehen lassen -
 * eine Seite, die sagt "noch null Sekunden", statt zu sagen, dass es vorbei
 * ist.
 *
 * Deshalb wird die Phase aus den beiden Zeitpunkten und der Uhr des Browsers
 * abgeleitet statt aus dem Feld der Antwort. Die Zeitpunkte selbst kommen
 * weiter vom Server; nur *wo* wir gerade darin stehen, entscheidet der Browser
 * mit seiner eigenen Uhr - die auf ein paar Sekunden genau genug ist, um eine
 * Ueberschrift zu waehlen. Ueber die Einreichung entscheidet sie nicht: Das
 * tut die Route beim Absenden.
 */

export type CampaignPhase = "before" | "open" | "after" | "invalid";

export type CampaignDates = {
  startAt: string | null;
  endAt: string | null;
};

export function campaignPhaseAt(campaign: CampaignDates, nowMs: number): CampaignPhase {
  const start = campaign.startAt ? Date.parse(campaign.startAt) : Number.NaN;
  const end = campaign.endAt ? Date.parse(campaign.endAt) : Number.NaN;

  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) return "invalid";
  // Vor dem ersten Uhrentakt (nowMs === 0) bleibt es beim unbekannten Stand,
  // damit Server und erster Browser-Durchlauf dasselbe zeigen.
  if (nowMs <= 0) return "invalid";

  if (nowMs < start) return "before";
  if (nowMs > end) return "after";
  return "open";
}

/**
 * Der naechste Zeitpunkt, an dem die Phase wechselt - oder null, wenn keiner
 * mehr kommt. Damit stellt sich die Anzeige selbst um, ohne im Sekundentakt zu
 * pruefen, ob es schon so weit ist.
 */
export function nextPhaseChange(campaign: CampaignDates, nowMs: number): number | null {
  const start = campaign.startAt ? Date.parse(campaign.startAt) : Number.NaN;
  const end = campaign.endAt ? Date.parse(campaign.endAt) : Number.NaN;

  if (!Number.isNaN(start) && nowMs < start) return start;
  if (!Number.isNaN(end) && nowMs < end) return end;
  return null;
}
