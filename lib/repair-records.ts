/* Bestleistungen, an denen sich der Reparaturrekord NRW misst.
   Jede Zahl braucht eine oeffentlich nachpruefbare Quelle: Die Werte
   aendern sich mit jeder neuen Kampagne und muessen dann hier nachgezogen werden.

   Das eigene Ziel steht bewusst *nicht* darunter: Es ist im Admin-Backend
   einstellbar (siehe lib/app-settings.ts) und wuerde hier zwangslaeufig
   veralten - genau das war Issue #74. Die Kachel dafuer baut `goalRecord()`
   aus dem eingestellten Wert. */

export type RepairRecord = {
  value: string;
  label: string;
  detail: string;
  /** Fehlt bei der eigenen Zielkachel: Sie belegt keine fremde Bestleistung. */
  source?: { label: string; href: string };
};

/** Die Monatsbestmarke von The BIG FIX 2024 - die Zahl, auf die der Stoerer
    auf der Startseite zielt (Issue #162). */
export const MONTH_RECORD = 3_177;

/** Die Bestmarke an einem Tag und Ort - Exeter 2019 (Issue #75). */
export const DAY_PLACE_RECORD = 268;

const bigFix = {
  label: "The BIG FIX, Recycle Devon",
  href: "https://www.recycledevon.org/thebigfix",
};

export const repairRecords: RepairRecord[] = [
  {
    value: DAY_PLACE_RECORD.toLocaleString("de-DE"),
    label: "Reparaturen an einem Tag und Ort",
    detail: "2019 in Exeter (Großbritannien) aufgestellt – die Bestmarke für eine einzelne Veranstaltung. Auf dem Live-Stand läuft deshalb der Kreis mit dem höchsten Tagesstand dagegen an, nicht ganz NRW.",
    source: bigFix,
  },
  {
    value: MONTH_RECORD.toLocaleString("de-DE"),
    label: "Reparaturen in einem Monat landesweit",
    detail: "2024 während der landesweiten Kampagne The BIG FIX in Großbritannien gezählt.",
    source: bigFix,
  },
  {
    value: "2.532",
    label: "Reparaturen bei The BIG FIX 2025",
    detail: "215 Repair Cafés meldeten 2.532 Reparaturen und damit rund 66.000 kg eingespartes CO₂e.",
    source: {
      label: "The BIG FIX 2025 Report, Recycle Devon",
      href: "https://www.recycledevon.org/thebigfix",
    },
  },
];

/**
 * Die eigene Zielkachel neben den fremden Bestmarken (Issue #74).
 *
 * Frueher stand hier eine feste Zahl mit dem Satz "Das ist unser Ziel" - und
 * damit eine andere als die, die der Zaehler darueber nannte, sobald jemand das
 * Ziel im Backend aenderte. Die Zahl kommt deshalb aus derselben Quelle wie
 * ueberall sonst: den Kampagneneinstellungen.
 *
 * `null` heisst: Das Ziel ist noch nicht bekannt (die Statistik laedt oder ist
 * gerade nicht erreichbar). Dann bleibt die Kachel weg, statt eine geratene
 * Zahl als Ziel auszugeben.
 */
export function goalRecord(goal: number | null): RepairRecord | null {
  if (!goal || goal <= 0) return null;

  return {
    value: goal.toLocaleString("de-DE"),
    label: "Reparaturen sind unser Ziel für NRW",
    detail: "Die Zahl, die wir uns für diesen Rekordmonat vorgenommen haben. Der Live-Stand zeigt, wie weit wir sind.",
  };
}

/**
 * Wie viele gelungene Reparaturen noch fehlen, bis NRW die Monatsbestmarke
 * uebertrifft (Issue #162). Gleichziehen reicht nicht, deshalb eine mehr als
 * die Marke.
 *
 * `null`, solange der Stand nicht bekannt ist oder die Marke schon fiel: Dann
 * gibt es nichts mehr herunterzuzaehlen.
 */
export function repairsToBeatRecord(total: number | null): number | null {
  if (total === null) return null;
  const missing = MONTH_RECORD + 1 - total;
  return missing > 0 ? missing : null;
}

/**
 * Wie viele Reparaturen NRW ueber eine Bestmarke hinaus geschafft hat.
 *
 * Nach dem Zeitraum misst sich das Ergebnis an den Rekorden, nicht am eigenen
 * Ziel: Ein verfehltes Ziel neben einem geknackten Weltrekord liest sich wie
 * eine Niederlage, obwohl es keine ist. `null` heisst: Die Marke steht noch
 * (oder der Stand ist nicht bekannt).
 */
export function recordMargin(total: number | null | undefined, record: number): number | null {
  if (total === null || total === undefined || total <= record) return null;
  return total - record;
}

export type FaqEntry = { question: string; answer: string; link?: { href: string; label: string } };

/** Die Fragen nach dem Ende der Aktion: Rueckblick statt Anleitung. */
export const closedFaqEntries: FaqEntry[] = [
  {
    question: "Welche Rekorde hat NRW geknackt?",
    answer: `Zwei: Im Oktober 2026 wurden in Nordrhein-Westfalen mehr Reparaturen in einem Monat gezählt als die bisherige Bestmarke von ${MONTH_RECORD.toLocaleString("de-DE")} aus Großbritannien. Und am Festivaltag in Wuppertal kamen an einem Ort mehr als die bisherigen ${DAY_PLACE_RECORD.toLocaleString("de-DE")} Reparaturen an einem Tag zusammen.`,
    link: { href: "/stats", label: "Zum Ergebnis" },
  },
  {
    question: "Kann ich noch eine Reparatur eintragen?",
    answer: "Nein, der Einreichungszeitraum ist beendet. Reparieren lohnt sich natürlich weiterhin – Hilfe gibt es in Repair Cafés und offenen Werkstätten in ganz NRW.",
    link: { href: "/repair-cafes", label: "Repair Café finden" },
  },
  {
    question: "Was wurde gezählt?",
    answer: "Jeder Gegenstand, der wieder benutzbar geworden ist – selbst repariert, im Repair Café oder vom Fachbetrieb. Ein Moderationsteam hat jede Einreichung geprüft; erst nach der Freigabe hat sie gezählt.",
  },
  {
    question: "Wann ist die Ziehung des Gewinnspiels?",
    answer: "Die Ziehung steht noch aus. Wer gewonnen hat, wird per E-Mail benachrichtigt.",
    link: { href: "/gewinnspiel", label: "Zum Gewinnspiel" },
  },
  {
    question: "Was passiert mit meinem Foto und meinen Daten?",
    answer: "Fotos bleiben nur veröffentlicht, wenn du zugestimmt hast. Orte zeigen wir nie punktgenau auf einer Karte. Soll ein Foto verschwinden, schreib uns – wir löschen es, und die Reparatur zählt trotzdem weiter. Details stehen in der Datenschutzerklärung.",
  },
  {
    question: "Ist das ein Guinness-Weltrekord?",
    answer: "Nein. Uns ging es nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen und als echte Alternative zum Neukauf zu stärken.",
  },
];

export const faqEntries: FaqEntry[] = [
  {
    question: "Wer darf mitmachen?",
    answer: "Alle, die in Nordrhein-Westfalen etwas repariert haben – privat, im Repair Café, in der Schule, im Verein oder in der Werkstatt. Fachkenntnisse brauchst du dafür nicht.",
  },
  {
    question: "Zählt auch eine Reparatur vom Fachbetrieb?",
    answer: "Ja. Wenn der Fahrradladen, die Handywerkstatt oder die Schuhmacherei etwas für dich repariert hat, zählt das genauso. Trag die Reparatur selbst ein – am besten mit einem Foto vom reparierten Stück.",
  },
  {
    question: "Ich habe einen Reparaturbetrieb – wie mache ich mit?",
    answer: "Stellt einen Aufsteller mit QR-Code an die Theke und weist eure Kundschaft bei der Abholung darauf hin. Eintragen tut die Kundschaft selbst. Kostet nichts, braucht keine Anmeldung.",
    link: { href: "/reparaturbetriebe", label: "Alles für Betriebe" },
  },
  {
    question: "Was zählt als Reparatur?",
    answer: "Jeder Gegenstand, der wieder benutzbar geworden ist, statt im Müll zu landen. Vom genähten Reißverschluss über das geflickte Fahrrad bis zum wiederbelebten Toaster.",
  },
  {
    question: "Zählt jede Reparatur nur einmal?",
    answer: "Ja. Reiche jede Reparatur einzeln ein. Mehrere Reparaturen an einem Tag kannst du nacheinander eintragen – bitte jede mit eigenem Foto.",
  },
  {
    question: "Warum wird meine Einreichung geprüft?",
    answer: "Damit die Zahl belastbar bleibt, schaut ein Moderationsteam jede Einreichung an. Erst nach der Freigabe zählt dein Beitrag mit und erscheint in der Galerie.",
  },
  {
    question: "Was passiert mit meinem Foto und meinen Daten?",
    answer: "Fotos werden nur veröffentlicht, wenn du zustimmst. Orte zeigen wir nie punktgenau auf einer Karte. Details stehen in der Datenschutzerklärung.",
  },
  {
    question: "Dürfen Personen auf dem Foto zu sehen sein?",
    answer: "Ja – Menschen, die stolz neben ihrem Werk stehen, sind genau das, was wir zeigen wollen. Gesichter verpixeln wir dafür nicht. Deshalb gilt: Wer erkennbar ist, muss einverstanden sein, bei Kindern entscheiden die Erziehungsberechtigten. Soll ein Foto später wieder verschwinden, schreib uns – wir löschen es, und die Reparatur zählt trotzdem weiter.",
  },
  {
    question: "Geht es um einen Guinness-Weltrekord?",
    answer: "Nein. Uns geht es nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen und als echte Alternative zum Neukauf zu stärken.",
  },
];
