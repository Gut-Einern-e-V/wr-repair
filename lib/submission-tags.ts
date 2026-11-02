/**
 * Tags, mit denen die Einreichungsroute und die Nacherfassung eine Einreichung
 * fuer die Moderation markieren (Issue #167).
 *
 * Wie der Testlauf-Tag (Issue #102) im vorhandenen `tags`-Feld und nicht in
 * einer neuen Spalte: Das Feld steht in der Moderation und laesst sich dort
 * bearbeiten, und ein Insert auf eine noch nicht ausgerollte Spalte wiese jede
 * Einreichung ab.
 */

/** Friendly Captcha meldete `response_duplicate`: dasselbe Loesungswort zum zweiten Mal. */
export const DUPLICATE_SUSPECT_TAG = "doppeleinreichung?";

/** Friendly Captcha hat das Loesungswort aus einem anderen Grund abgelehnt. */
export const CAPTCHA_REJECTED_TAG = "captcha-abgelehnt";

/** Von Hand aus den abgebrochenen Einreichungen in die Moderation geholt. */
export const RECOVERED_TAG = "nachgetragen";

/**
 * Tags fuer eine Absage von Friendly Captcha, nach ihrem Fehlercode.
 *
 * `response_duplicate` heiszt: Das Wort war gueltig, ist aber schon einmal
 * eingeloest worden. Dahinter steckt meist ein zweiter Sendevorgang derselben
 * Reparatur - deshalb ein eigener Tag statt des allgemeinen.
 */
export function captchaRejectionTags(detail: string | null | undefined) {
  return detail?.includes("response_duplicate") ? [DUPLICATE_SUSPECT_TAG] : [CAPTCHA_REJECTED_TAG];
}

export type SubmissionWarning = { tag: string; title: string; text: string };

const warnings: SubmissionWarning[] = [
  {
    tag: DUPLICATE_SUSPECT_TAG,
    title: "VORSICHT DOPPELEINREICHUNG?",
    text: "Der Spam-Schutz hat dieses Lösungswort schon einmal gesehen. Meist ist dieselbe Reparatur ein zweites Mal abgeschickt worden – bitte mit den ähnlichen Einreichungen vergleichen.",
  },
  {
    tag: CAPTCHA_REJECTED_TAG,
    title: "VORSICHT: Spam-Schutz hat abgelehnt",
    text: "Friendly Captcha hat das Lösungswort nicht bestätigt. Angenommen wurde die Einreichung trotzdem, damit keine echte Reparatur verlorengeht – bitte auf Spam und Doppelungen prüfen.",
  },
  {
    tag: RECOVERED_TAG,
    title: "Nachgetragen",
    text: "Diese Einreichung war unterwegs abgebrochen und wurde aus dem Systemstatus in die Moderation geholt. Ein Foto, Name und Mail fürs Gewinnspiel gibt es dazu nicht.",
  },
];

/** Die Hinweise, die zu den Tags einer Einreichung gehoeren - in fester Reihenfolge. */
export function submissionWarnings(tags: readonly string[]) {
  return warnings.filter((warning) => tags.includes(warning.tag));
}
