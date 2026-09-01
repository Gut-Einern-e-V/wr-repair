import { describe, expect, it } from "vitest";
import { getStories, getStoryTeasers } from "./stories";

describe("Reparaturgeschichten", () => {
  it("ueberspringt die Redaktionsanleitung im Inhaltsordner", async () => {
    const slugs = (await getStories()).map((story) => story.slug);
    expect(slugs).not.toContain("README");
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("liefert jede Geschichte mit vollstaendigen Kopfdaten", async () => {
    for (const story of await getStories()) {
      expect(story.title.trim()).not.toBe("");
      expect(story.summary.trim()).not.toBe("");
      expect(story.category.trim()).not.toBe("");
      expect(story.readingTime.trim()).not.toBe("");
      expect(story.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(story.blocks.length).toBeGreaterThan(0);
    }
  });

  it("sortiert die neueste Geschichte nach vorne", async () => {
    const dates = (await getStories()).map((story) => story.date);
    expect([...dates].sort((left, right) => right.localeCompare(left))).toEqual(dates);
  });

  it("loest Bilder samt Massen und Nachweis auf", async () => {
    /* Mindestens eine Geschichte bringt ein eigenes Bild mit; alle Bilder
       muessen aufgeloest sein, sonst haette der Aufruf geworfen (Issue #60). */
    const stories = await getStories();
    const images = stories.flatMap((story) => [
      ...(story.image ? [story.image] : []),
      ...story.blocks.flatMap((block) => (block.type === "image" ? [block.image] : [])),
    ]);

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.src.startsWith("/")).toBe(true);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      // Ohne Bildbeschreibung waere das Bild fuer Screenreader nicht erfassbar.
      expect(image.alt.trim()).not.toBe("");
    }
  });

  it("haelt das Aufmacherbild im Teaser, die Textbloecke nicht", async () => {
    const teasers = await getStoryTeasers();
    const stories = await getStories();
    for (const teaser of teasers) {
      expect(teaser.image).toEqual(stories.find((story) => story.slug === teaser.slug)?.image);
    }
  });

  it("laesst die Textbloecke aus den Teasern weg", async () => {
    const teasers = await getStoryTeasers();
    expect(teasers).toHaveLength((await getStories()).length);
    for (const teaser of teasers) {
      expect(teaser).not.toHaveProperty("blocks");
    }
  });
});
