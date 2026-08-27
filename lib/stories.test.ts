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

  it("laesst die Textbloecke aus den Teasern weg", async () => {
    const teasers = await getStoryTeasers();
    expect(teasers).toHaveLength((await getStories()).length);
    for (const teaser of teasers) {
      expect(teaser).not.toHaveProperty("blocks");
    }
  });
});
