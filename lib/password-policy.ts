/**
 * Passwoerter der Backend-Konten, ohne Mailversand.
 *
 * Das Projekt verschickt keine Mails. Deshalb gibt es kein "Passwort
 * vergessen" per Link: Eine Admin-Person setzt ein neues temporaeres Passwort
 * und gibt es persoenlich weiter. Ein temporaeres Passwort - beim Anlegen wie
 * beim Zuruecksetzen - lebt nur bis zum naechsten Login, danach muss die Person
 * ein eigenes waehlen.
 *
 * Die Markierung dafuer steht in den `app_metadata` des Supabase-Kontos. Die
 * kann nur der Server mit dem Service-Schluessel schreiben, nicht die Person
 * selbst - sonst liesse sich der Pflichtwechsel aus dem Browser abschalten.
 */

export const MIN_PASSWORD_LENGTH = 12;

/** Seite fuer den Passwortwechsel. Unter /moderator, damit sie im Rahmen der
    installierten Moderations-App bleibt (siehe lib/app-manifests.ts). */
export const PASSWORD_PAGE_PATH = "/moderator/passwort";

const MUST_CHANGE_KEY = "must_change_password";

export type AppMetadata = Record<string, unknown> | undefined | null;

export function mustChangePassword(user: { app_metadata?: AppMetadata } | null | undefined) {
  return user?.app_metadata?.[MUST_CHANGE_KEY] === true;
}

export function withMustChangePassword(appMetadata: AppMetadata, value: boolean): Record<string, unknown> {
  return { ...(appMetadata ?? {}), [MUST_CHANGE_KEY]: value };
}

export function passwordProblem(password: string, repeat?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
  if (password.length > 72) return "Das Passwort darf höchstens 72 Zeichen haben.";
  if (repeat !== undefined && password !== repeat) return "Die beiden Passwörter stimmen nicht überein.";
  return null;
}

/* Ohne leicht verwechselbare Zeichen (0/O, 1/l/I), weil das Passwort
   vorgelesen oder abgetippt wird. 4 Gruppen a 4 Zeichen aus 54 Zeichen sind
   rund 92 Bit - fuer ein Passwort, das nur bis zum naechsten Login gilt, mehr
   als genug. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword(random: (size: number) => Uint8Array = (size) => crypto.getRandomValues(new Uint8Array(size))) {
  const groups: string[] = [];
  let group = "";

  while (groups.length < 4) {
    for (const byte of random(16)) {
      // Verwerfen statt Modulo, damit kein Zeichen haeufiger vorkommt.
      if (byte >= Math.floor(256 / ALPHABET.length) * ALPHABET.length) continue;
      group += ALPHABET[byte % ALPHABET.length];
      if (group.length === 4) {
        groups.push(group);
        group = "";
        if (groups.length === 4) break;
      }
    }
  }

  return groups.join("-");
}

/** Nur interne Pfade als Ziel nach dem Wechsel, wie beim Login. */
export function safeNextPath(value: string | null | undefined) {
  return value && /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(value) && value !== PASSWORD_PAGE_PATH ? value : null;
}
