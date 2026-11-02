import { storyCover } from "@/lib/brand-photos";
import { getStoryTeasers } from "@/lib/stories";
import StatsView from "./stats-view";

/* Die Geschichten fuer den Rueckblick kommen wie auf /stories zum Teil aus der
   Datenbank (freigegebene Highlights). Neu aufsetzen wie dort. */
export const revalidate = 600;

/** So viele Geschichten zeigt der Rueckblick; der Rest steht unter /stories. */
const RECAP_STORIES = 3;

/**
 * Serverhuelle um die Ansicht: Die Phase entscheidet der Browser (siehe
 * stats-view.tsx), die Geschichten liegen aber auf dem Server. Sie kommen
 * deshalb fertig als Teaser mit, statt eine eigene Schnittstelle zu brauchen.
 */
export default async function StatsPage() {
  const teasers = await getStoryTeasers();
  const stories = teasers.slice(0, RECAP_STORIES).map((story, index) => {
    const cover = storyCover(story, index);
    return { slug: story.slug, title: story.title, summary: story.summary, category: story.category, image: { src: cover.src, alt: cover.alt } };
  });

  return <StatsView stories={stories} />;
}
