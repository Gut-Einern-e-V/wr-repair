/**
 * Willkommenspaket fuer neue Moderationskonten: die Anleitung als PDF und der
 * Text der Willkommensmail.
 *
 * Das PDF entsteht aus docs/moderation-onboarding/anleitung.html
 * (scripts/build-moderation-guide.sh) und liegt oeffentlich, weil neue
 * Moderator*innen es lesen, bevor sie sich zum ersten Mal anmelden. Es steht
 * nichts darin, was nicht ohnehin auf der Seite zu sehen ist.
 *
 * Die Mail geht nicht vom Server raus - das Projekt verschickt keine Mails.
 * Die Verwaltung oeffnet sie im eigenen Mailprogramm, damit sie von einer
 * bekannten Person kommt und Rueckfragen dort ankommen. Das Passwort steht
 * bewusst nicht darin: Es wird persoenlich weitergegeben.
 */

export const MODERATION_GUIDE_PATH = "/downloads/moderation-anleitung.pdf";

export type WelcomeMail = { subject: string; body: string };

export function buildWelcomeMail({ displayName, email, siteUrl }: { displayName?: string | null; email: string; siteUrl: string }): WelcomeMail {
  const base = siteUrl.replace(/\/+$/, "");
  const firstName = displayName?.trim().split(/\s+/)[0];

  return {
    subject: "Willkommen in der Moderation des Reparaturrekords NRW",
    body: [
      firstName ? `Hallo ${firstName},` : "Hallo,",
      "",
      "schön, dass du beim Reparaturrekord NRW mitmoderierst! Jede eingetragene Reparatur geht zuerst durch die Moderation – erst wenn du sie freigibst, zählt sie für den Rekord und erscheint auf der Seite.",
      "",
      "Dein Zugang:",
      `- Login: ${base}/login`,
      `- E-Mail: ${email}`,
      "- Passwort: bekommst du persönlich von mir, nicht per Mail. Es gilt nur für den ersten Login – danach wählst du ein eigenes.",
      "",
      "Bitte als Erstes auf jedem Gerät, das du nutzt, die Benachrichtigungen einschalten – dann meldet sich dein Handy, sobald etwas zu prüfen ist:",
      `1. ${base}/moderator öffnen und einloggen.`,
      "2. Auf dem iPhone/iPad: in Safari auf Teilen → „Zum Home-Bildschirm“, dann die neue App „Moderation“ öffnen (und dort ggf. noch einmal einloggen). Auf Android und am Computer reicht der Browser.",
      "3. Oben auf „Bei neuen Eintragungen benachrichtigen“ tippen und die Abfrage erlauben.",
      "",
      "Alles Weitere – Benachrichtigungen auf den einzelnen Geräten, Freigeben, Ablehnen, Grenzfälle – steht in der Anleitung:",
      `${base}${MODERATION_GUIDE_PATH}`,
      "",
      "Bei Fragen antworte einfach auf diese Mail.",
      "",
      "Danke fürs Mitmachen!",
    ].join("\n"),
  };
}

export function buildWelcomeMailto(mail: WelcomeMail, to: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
}
