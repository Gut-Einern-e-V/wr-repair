/* Bestleistungen, an denen sich der Reparaturrekord NRW misst.
   Jede Zahl braucht eine oeffentlich nachpruefbare Quelle: Die Werte
   aendern sich mit jeder neuen Kampagne und muessen dann hier nachgezogen werden. */

export type RepairRecord = {
  value: string;
  label: string;
  detail: string;
  source: { label: string; href: string };
};

export const repairRecords: RepairRecord[] = [
  {
    value: "268",
    label: "Reparaturen an einem Tag und Ort",
    detail: "2019 in Exeter (Großbritannien) aufgestellt – die Bestmarke für eine einzelne Veranstaltung.",
    source: {
      label: "The BIG FIX, Recycle Devon",
      href: "https://www.recycledevon.org/thebigfix",
    },
  },
  {
    value: "3.177",
    label: "Reparaturen in einem Monat landesweit",
    detail: "2024 während der landesweiten Kampagne The BIG FIX in Großbritannien gezählt.",
    source: {
      label: "The BIG FIX, Recycle Devon",
      href: "https://www.recycledevon.org/thebigfix",
    },
  },
  {
    value: "2.532",
    label: "Reparaturen bei The BIG FIX 2025",
    detail: "215 Repair Cafés meldeten 2.532 Reparaturen und damit rund 66.000 kg eingespartes CO₂e. Das ist unser Ziel.",
    source: {
      label: "The BIG FIX 2025 Report, Recycle Devon",
      href: "https://www.recycledevon.org/thebigfix",
    },
  },
];

export type FaqEntry = { question: string; answer: string };

export const faqEntries: FaqEntry[] = [
  {
    question: "Wer darf mitmachen?",
    answer: "Alle, die in Nordrhein-Westfalen etwas repariert haben – privat, im Repair Café, in der Schule, im Verein oder in der Werkstatt. Fachkenntnisse brauchst du dafür nicht.",
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
    answer: "Ja – stolze Reparateur*innen mit ihrem Werk sind genau das, was wir zeigen wollen. Gesichter verpixeln wir dafür nicht. Deshalb gilt: Wer erkennbar ist, muss einverstanden sein, bei Kindern entscheiden die Erziehungsberechtigten. Soll ein Foto später wieder verschwinden, schreib uns – wir löschen es, und die Reparatur zählt trotzdem weiter.",
  },
  {
    question: "Geht es um einen Guinness-Weltrekord?",
    answer: "Nein. Uns geht es nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen und als echte Alternative zum Neukauf zu stärken.",
  },
];
