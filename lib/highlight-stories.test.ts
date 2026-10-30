import { describe, expect, it } from "vitest";
import { highlightSlug, readingTime, toHighlightStory } from "./highlight-stories";
import type { HighlightRow } from "./story-highlights";

const row: HighlightRow = {
  repair_id: "2a1725d7-1399-4185-91be-c29b36d7f436",
  status: "published",
  title: "Ein steiniger Weg zum nächsten Espresso",
  teaser: "Ein Stein im Mahlwerk.",
  body: "Erster Absatz\nmit Umbruch.\n\nZweiter Absatz.",
  note: "",
  sort_order: 10,
  public_image_path: "2a1725d7-1399-4185-91be-c29b36d7f436.jpg",
  public_image_width: 1200,
  public_image_height: 900,
  published_at: "2026-10-31T10:00:00Z",
  updated_at: "2026-10-31T10:00:00Z",
};

describe("Highlight-Geschichten", () => {
  it("baut einen lesbaren, eindeutigen Pfad", () => {
    expect(highlightSlug(row.title, row.repair_id)).toBe("ein-steiniger-weg-zum-naechsten-espresso-2a1725d7");
    expect(highlightSlug("!!!", row.repair_id)).toBe("reparatur-2a1725d7");
  });

  it("schaetzt die Lesezeit auf mindestens eine Minute", () => {
    expect(readingTime("kurz")).toBe("1 min");
    expect(readingTime("wort ".repeat(600))).toBe("3 min");
  });

  it("macht aus dem Highlight eine Geschichte mit Absaetzen und oeffentlichem Bild", () => {
    const story = toHighlightStory(row, { category: "household_appliances", image_alt_text: null, entry_time: null }, (path) => `https://cdn/${path}`);
    expect(story.date).toBe("2026-10-31");
    expect(story.category).toBe("Haushaltsgeräte");
    expect(story.blocks).toEqual([
      { type: "paragraph", content: "Erster Absatz mit Umbruch." },
      { type: "paragraph", content: "Zweiter Absatz." },
    ]);
    expect(story.image?.src).toBe("https://cdn/2a1725d7-1399-4185-91be-c29b36d7f436.jpg");
  });

  it("faellt ohne oeffentliches Foto auf die Markenbildwelt zurueck", () => {
    expect(toHighlightStory({ ...row, public_image_path: null }, { category: "toys", image_alt_text: null, entry_time: "2026-10-01T00:00:00Z" }, (path) => path).image).toBeNull();
  });
});
