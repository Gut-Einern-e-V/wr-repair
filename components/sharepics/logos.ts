import { readFile } from "node:fs/promises";
import path from "node:path";
import { fundingGroups, type FundingGroup } from "@/lib/funding";

/**
 * Die Foerderlogos fuer die Sharepics, klein und in Graustufen.
 *
 * Satori kann weder WebP (das Circular-Week-Logo) noch CSS-Filter. Die
 * Graustufenfassungen liegen deshalb fertig als PNG in ./logos, gerechnet aus
 * den Originalen in public/funding mit sharp:
 *
 *   sharp(src, { density: 600 }).resize({ height: 240 }).trim().grayscale().png()
 *
 * Gelesen wird ueber `process.cwd()`, wie es die Next-Doku fuer Bilddateien in
 * `ImageResponse` vorsieht - so landen sie beim Bauen mit in der Funktion.
 * Fehlt eine Datei, entsteht das Bild ohne Logoleiste statt gar nicht.
 */

const files: Record<string, { file: string; width: number; height: number }> = {
  "/funding/mulnv-nrw.svg": { file: "ministry.png", width: 1164, height: 240 },
  "/funding/cscp.svg": { file: "cscp.png", width: 435, height: 240 },
  "/funding/circular-week-2026.webp": { file: "circular-week.png", width: 327, height: 240 },
};

export type SharepicLogos = { key: string; group: FundingGroup["key"]; src: string; width: number; height: number }[];

let cached: Promise<SharepicLogos> | null = null;

async function load(): Promise<SharepicLogos> {
  const directory = path.join(process.cwd(), "components", "sharepics", "logos");
  return Promise.all(fundingGroups.flatMap((group) => group.logos.map(async (logo) => {
    const entry = files[logo.src];
    if (!entry) throw new Error(`Keine Graustufenfassung für ${logo.src}`);
    const data = await readFile(path.join(directory, entry.file), "base64");
    return { key: entry.file, group: group.key, src: `data:image/png;base64,${data}`, width: entry.width, height: entry.height };
  })));
}

export function sharepicLogos(): Promise<SharepicLogos> {
  cached ??= load().catch((error) => {
    console.error("Sharepics: Logos konnten nicht geladen werden.", error);
    cached = null;
    return [];
  });
  return cached;
}
