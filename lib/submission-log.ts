import type { SupabaseClient } from "@supabase/supabase-js";
import { ipRegionTag } from "./origin-check";

/**
 * Protokoll fehlgeschlagener und unvollstaendiger Einreichungen (Issue #64).
 *
 * Nach dem ersten User-Test liess sich nicht mehr feststellen, woran die
 * Einreichungen gescheitert waren: Die Route hat jeden Fehler in eine deutsche
 * Meldung fuer den Browser uebersetzt und danach vergessen. Diese Datei ist die
 * Gegenmassnahme - jeder verschluckte Fehler wird einmal in die
 * Serverprotokolle und einmal in `submission_failures` geschrieben, damit im
 * Admin-Backend nachlesbar ist, welcher Dienst gestreikt hat.
 *
 * Zwei Regeln, die hier nicht verhandelbar sind:
 *
 * - Nichts Personenbezogenes. Kein Inhalt, keine Mail, keine IP - nur Stufe,
 *   Grund und die grobe Gegend der Verbindung, dieselbe Angabe wie in
 *   `blocked_submissions`.
 * - Diese Funktion wirft nie. Ein kaputtes Protokoll darf keine Einreichung
 *   kosten; das waere genau der Fehler, den es aufzeichnen soll.
 */

/** Stelle im Ablauf, an der es klemmte. */
export type FailureStage = "gate" | "captcha" | "insert" | "image" | "lottery" | "notify" | "blocked";

export type SubmissionFailure = {
  stage: FailureStage;
  /** Kurzform fuer die Auswertung, z. B. "captcha_unavailable". */
  reason: string;
  /** Meldung des Dienstes. Wird gekuerzt, weil Stacktraces hier nichts nuetzen. */
  detail?: unknown;
  /** Gesetzt, wenn die Einreichung trotzdem zustande kam. */
  repairId?: string | null;
};

const MAX_DETAIL_LENGTH = 500;

function detailText(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  const text = detail instanceof Error ? detail.message : typeof detail === "string" ? detail : JSON.stringify(detail);
  return text ? text.slice(0, MAX_DETAIL_LENGTH) : null;
}

export async function logSubmissionFailure(
  supabase: SupabaseClient | null,
  request: Request,
  failure: SubmissionFailure,
) {
  const detail = detailText(failure.detail);

  // Immer zuerst in die Serverprotokolle: Die laufen auch dann, wenn die
  // Datenbank selbst der Grund fuer den Eintrag ist.
  console.error(
    `[submission] ${failure.stage}/${failure.reason}`,
    JSON.stringify({ repairId: failure.repairId ?? null, ipRegion: ipRegionTag(request), detail }),
  );

  if (!supabase) return;

  try {
    await supabase.from("submission_failures").insert({
      stage: failure.stage,
      reason: failure.reason,
      detail,
      ip_region: ipRegionTag(request),
      repair_id: failure.repairId ?? null,
    });
  } catch {
    // Bewusst still, siehe Modulkopf.
  }
}
