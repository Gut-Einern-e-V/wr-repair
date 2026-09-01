import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categoriesWithMotif, categoryMotifSrc, MOTIF_DIRECTORY } from "./category-motifs";
import { repairCategoryValues } from "./repair-catalog";

const motifDirectory = path.join(process.cwd(), "public", MOTIF_DIRECTORY);

async function motifFiles() {
  const entries = await readdir(motifDirectory).catch(() => [] as string[]);
  return entries.filter((name) => name.endsWith(".png")).map((name) => name.replace(/\.png$/, ""));
}

describe("Motive der Kategorien", () => {
  it("nennt nur Kategorien, die es wirklich gibt", () => {
    for (const category of categoriesWithMotif) {
      expect(repairCategoryValues).toContain(category);
    }
  });

  /* Beide Richtungen, weil Datei und Eintrag getrennt gepflegt werden: Ein
     Eintrag ohne Datei ergibt ein kaputtes Bild, eine Datei ohne Eintrag liegt
     ungenutzt im Repository. */
  it("hat zu jedem Eintrag eine Datei", async () => {
    const files = await motifFiles();
    for (const category of categoriesWithMotif) {
      expect(files, `public/${MOTIF_DIRECTORY}/${category}.png fehlt`).toContain(category);
    }
  });

  it("hat zu jeder Datei einen Eintrag", async () => {
    for (const file of await motifFiles()) {
      expect([...categoriesWithMotif], `${file} steht nicht in categoriesWithMotif`).toContain(file);
    }
  });

  it("faellt ohne Motiv auf null zurueck, damit das Zeichen einspringt", () => {
    expect(categoryMotifSrc("gibt-es-nicht")).toBeNull();
  });
});
