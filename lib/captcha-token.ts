/**
 * Das versteckte Feld von Friendly Captcha lesen (Issue #107).
 *
 * Das Widget legt in `frc-captcha-response` nicht nur das Loesungswort ab,
 * sondern auch seinen Zustand: ".UNSTARTED", waehrend es wartet, ".SOLVING",
 * waehrend es rechnet, ".EXPIRED", wenn das Ergebnis zu alt geworden ist,
 * ".ERROR", wenn es gescheitert ist. Das Feld ist damit nie leer, und "steht
 * da etwas drin?" war deshalb keine Pruefung.
 *
 * Genau daran sind Einreichungen verlorengegangen: Wer abschickte, waehrend
 * das Widget noch rechnete, hat ".SOLVING" mitgeschickt. Friendly Captcha
 * antwortete dem Server mit `response_invalid`, der Server sagte ab, und im
 * Protokoll stand ein Befund, der aussah wie Spam - obwohl es das Gegenteil
 * war: jemand, der zu schnell fertig war.
 *
 * Die Unterscheidung selbst ist einfach und laut Friendly Captcha dauerhaft:
 * Jeder Zustand beginnt mit einem Punkt, ein Loesungswort nie.
 */

/** Ob im Feld ein Loesungswort steht - und nicht bloss ein Zustand. */
export function isCaptchaSolution(value: string) {
  return value.length > 0 && !value.startsWith(".");
}

/**
 * Zustaende, aus denen das Widget von allein nicht mehr herausfindet.
 *
 * Sie brauchen ein `reset()`, sonst wartet das Formular vergeblich. Die
 * uebrigen (".UNSTARTED", ".REQUESTING", ".SOLVING", ".VERIFYING") gehen von
 * selbst weiter; dort genuegt Geduld.
 */
export function needsCaptchaReset(value: string) {
  return value.startsWith(".ERROR")
    || value === ".EXPIRED"
    || value === ".DESTROYED"
    || value === ".UNCONNECTED";
}
