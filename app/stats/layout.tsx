/* Die Seite selbst ist eine Client-Komponente und kann keine Metadaten
   exportieren. Ohne dieses Layout trug `/stats` Titel und Beschreibung der
   Startseite - zwei Seiten mit demselben Titel im Index. */
export const metadata = {
  title: "Live-Stand",
  description: "Wie viele Reparaturen Nordrhein-Westfalen schon gezählt hat: Zählerstand und Karte des Reparatur-Weltrekords, nach dem Aktionsmonat der Rückblick mit allen Zahlen.",
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
