import Link from "next/link";
import NextImage from "next/image";
import { storyPhoto } from "@/lib/brand-photos";
import type { StoryTeaser } from "@/lib/stories";

/* Das Mosaik hat immer mindestens so viele Kacheln, wie ein vollstaendiges
   Raster braucht. Offene Kacheln bleiben sichtbar, damit man sieht, dass sich
   die Uebersicht ueber den Aktionszeitraum weiter fuellt. */
const MOSAIC_SLOTS = 6;

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" });

export type StoryMosaicProps = {
  stories: StoryTeaser[];
  limit?: number;
};

export function StoryMosaic({ stories, limit = MOSAIC_SLOTS }: StoryMosaicProps) {
  const visible = stories.slice(0, limit);
  const openSlots = Math.max(0, limit - visible.length);

  return <div className="story-mosaic-wrap">
    <div className="story-mosaic">
      {visible.map((story, index) => {
        const photo = storyPhoto(index);
        return <Link className="story-tile" href={`/stories/${story.slug}`} key={story.slug}>
          <NextImage src={photo.src} alt="" fill sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw" />
          <span className="story-tile-tag">{story.category}</span>
          <div className="story-tile-body">
            <p className="story-tile-meta">
              <time dateTime={story.date}>{dateFormat.format(new Date(`${story.date}T12:00:00`))}</time> &middot; {story.readingTime}
            </p>
            <h3>{story.title}</h3>
            <p className="story-tile-summary">{story.summary}</p>
            <span className="story-tile-more">Geschichte lesen <i aria-hidden="true">&#8594;</i></span>
          </div>
        </Link>;
      })}
      {Array.from({ length: openSlots }, (_, index) => (
        <div className="story-tile is-open" key={`open-${index}`}>
          <span aria-hidden="true">+</span>
          <p>Hier entsteht das nächste Kapitel.</p>
        </div>
      ))}
    </div>
    <p className="story-mosaic-progress">
      {visible.length === 0
        ? "Die ersten Geschichten erscheinen bald."
        : `${visible.length} von ${Math.max(limit, visible.length)} Kacheln gefüllt – das Mosaik wächst mit jeder Geschichte.`}
    </p>
  </div>;
}
