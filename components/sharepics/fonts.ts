/**
 * Nunito fuer die Sharepics, dieselbe Schrift wie auf der Website.
 *
 * Satori bringt nur eine einzige Standardschrift im normalen Schnitt mit; die
 * grossen Zahlen der Sharepics sehen damit duenn und fremd aus. `next/font`
 * hilft hier nicht - es liefert CSS fuer den Browser, keine Bytes fuer
 * Satori. Die Dateien kommen deshalb zur Laufzeit von Google Fonts, einmal je
 * Serverinstanz.
 *
 * Ohne Browserkennung antwortet die CSS-Schnittstelle mit TrueType-Dateien -
 * genau dem Format, das Satori lesen kann (WOFF2 kann es nicht).
 *
 * Schlaegt das Laden fehl, entsteht das Bild mit der Standardschrift. Ein
 * weniger schoenes Bild ist besser als keines.
 */

type SatoriFont = { name: string; data: ArrayBuffer; weight: 700 | 800 | 900; style: "normal" };

const WEIGHTS = [700, 800, 900] as const;

let cached: Promise<SatoriFont[]> | null = null;

async function loadWeight(weight: (typeof WEIGHTS)[number]): Promise<SatoriFont> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Nunito:wght@${weight}`).then((response) => {
    if (!response.ok) throw new Error(`Google Fonts antwortet mit ${response.status}`);
    return response.text();
  });
  const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error("Keine TrueType-Datei in der Antwort");
  const data = await fetch(url).then((response) => response.arrayBuffer());
  return { name: "Nunito", data, weight, style: "normal" };
}

export function sharepicFonts(): Promise<SatoriFont[]> {
  cached ??= Promise.all(WEIGHTS.map(loadWeight)).catch((error) => {
    console.error("Sharepics: Nunito konnte nicht geladen werden.", error);
    /* Beim naechsten Bild neu versuchen, statt den Fehler festzuhalten. */
    cached = null;
    return [];
  });
  return cached;
}
