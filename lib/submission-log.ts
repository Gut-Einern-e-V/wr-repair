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
 * - Ins *Fehlerprotokoll* nichts Personenbezogenes. Kein Inhalt, keine Mail,
 *   keine IP - nur Stufe, Grund und die grobe Gegend der Verbindung, dieselbe
 *   Angabe wie in `blocked_submissions`.
 * - Keine dieser Funktionen wirft. Ein kaputtes Protokoll darf keine
 *   Einreichung kosten; das waere genau der Fehler, den es aufzeichnen soll.
 *
 * Daneben steht seit Issue #107 {@link logAbandonedSubmission}, und die haelt
 * sehr wohl Inhalte fest - aber in einer eigenen Tabelle, mit eigener Frist
 * und ohne Foto, Name und Mail. Die Begruendung dafuer steht in der Migration
 * 202609170002 und im Datenschutzkonzept; wer hier etwas ergaenzt, aendert
 * beides mit.
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

/**
 * Wie logSubmissionFailure - der Name bleibt aus der Zeit, in der diese
 * Funktion je Serverless-Instanz nur den ersten Vorfall aufschrieb.
 *
 * Der Verzicht war gegen eine volllaufende Tabelle gedacht und als Schutz
 * richtig, als Zaehlung aber wertlos: Drei Zeilen im Admin-Backend konnten
 * fuer drei Faelle stehen oder fuer dreihundert, und genau das war die Frage
 * aus Issue #107. Seit der Migration 202609170002 zaehlt die Datenbank selbst
 * - eine Zeile je Grund, mit `hits` daran -, und die Begrenzung hier ist
 * damit ueberfluessig geworden.
 */
export async function logSubmissionFailureOnce(
  supabase: SupabaseClient | null,
  request: Request,
  failure: SubmissionFailure,
) {
  await logSubmissionFailure(supabase, request, failure);
}

export async function logSubmissionFailure(
  supabase: SupabaseClient | null,
  request: Request,
  failure: SubmissionFailure,
) {
  const detail = detailText(failure.detail);
  const ipRegion = ipRegionTag(request);

  // Immer zuerst in die Serverprotokolle: Die laufen auch dann, wenn die
  // Datenbank selbst der Grund fuer den Eintrag ist.
  console.error(
    `[submission] ${failure.stage}/${failure.reason}`,
    JSON.stringify({ repairId: failure.repairId ?? null, ipRegion, detail }),
  );

  if (!supabase) return;

  try {
    /* Ein Vorfall *mit* Reparatur gehoert zu genau einer Einreichung und
       bleibt eine eigene Zeile. Alles andere beschreibt ein Muster und wird
       gezaehlt. */
    if (failure.repairId) {
      await supabase.from("submission_failures").insert({
        stage: failure.stage,
        reason: failure.reason,
        detail,
        ip_region: ipRegion,
        repair_id: failure.repairId,
      });
      return;
    }

    const { error } = await supabase.rpc("record_submission_failure", {
      p_stage: failure.stage,
      p_reason: failure.reason,
      p_detail: detail,
      p_ip_region: ipRegion,
    });

    /* Solange die Migration 202609170002 noch nicht ausgerollt ist, gibt es
       die Funktion nicht. Dann lieber eine Zeile ohne Zaehler als gar kein
       Protokoll - der Eintrag ist der Sinn der Uebung. */
    if (error) {
      await supabase.from("submission_failures").insert({
        stage: failure.stage,
        reason: failure.reason,
        detail,
        ip_region: ipRegion,
        repair_id: null,
      });
    }
  } catch {
    // Bewusst still, siehe Modulkopf.
  }
}

/**
 * Was bis zum Abbruch im Formular stand (Issue #107).
 *
 * Eine verlorene Einreichung war bis hierher wirklich verloren: Die Angaben
 * blieben allein im Browser stehen, und wer den Tab schloss, hatte sie weg.
 * Diese Funktion hebt sie auf - ohne Foto, ohne Name und Mail der Verlosung,
 * ohne IP-Adresse, siehe die Begruendung in der Migration.
 *
 * Wie logSubmissionFailure: wirft nie.
 */
export type AbandonedSubmission = {
  stage: FailureStage;
  reason: string;
  detail?: unknown;
  /** Schluessel des Sendevorgangs. Fasst alle Versuche zu einer Zeile zusammen. */
  clientKey: string | null;
  kreis?: string | null;
  originSource?: string | null;
  category?: string | null;
  brandModel?: string | null;
  durationMinutes?: number | null;
  itemValueEuros?: number | null;
  performedBy?: string | null;
  story?: string | null;
  hasImage: boolean;
  wantsLottery: boolean;
};

export async function logAbandonedSubmission(
  supabase: SupabaseClient | null,
  request: Request,
  entry: AbandonedSubmission,
) {
  if (!supabase) return;

  try {
    await supabase.rpc("record_abandoned_submission", {
      p_client_key: entry.clientKey,
      p_stage: entry.stage,
      p_reason: entry.reason,
      p_detail: detailText(entry.detail),
      p_ip_region: ipRegionTag(request),
      p_kreis: entry.kreis ?? null,
      p_origin_source: entry.originSource ?? null,
      p_category: entry.category ?? null,
      p_brand_model: entry.brandModel ?? null,
      p_duration_minutes: entry.durationMinutes ?? null,
      p_item_value_euros: entry.itemValueEuros ?? null,
      p_performed_by: entry.performedBy ?? null,
      p_story: entry.story ?? null,
      p_has_image: entry.hasImage,
      p_wants_lottery: entry.wantsLottery,
    });
  } catch {
    // Bewusst still, siehe Modulkopf. Ohne die Migration 202609170002 gibt es
    // die Funktion noch nicht; das Fehlerprotokoll steht davon unberuehrt.
  }
}
