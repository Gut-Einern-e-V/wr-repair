import Link from "next/link";
import NextImage from "next/image";
import { storyPhoto } from "@/lib/brand-photos";
import type { StoryTeaser } from "@/lib/stories";

/* Wie viele Kacheln die Startseite anreisst. Es werden nur vorhandene
   Geschichten gezeigt, keine Platzhalter. */
const MOSAIC_LIMIT = 5;

/* Ab drei Kacheln greift das Mosaik mit grosser Leitkachel: Sie belegt zwei
   Spalten und zwei Reihen, alle weiteren Kacheln je zwei Spalten. Bei ungerader
   Kachelzahl schliesst das Raster dadurch glatt ab. Darunter reicht eine Reihe
   gleich grosser Kacheln. */
const MOSAIC_MIN_TILES = 3;

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" });

export type StoryMosaicProps = {
  stories: StoryTeaser[];
  limit?: number;
};

export function StoryMosaic({ stories, limit = MOSAIC_LIMIT }: StoryMosaicProps) {
  const visible = stories.slice(0, limit);

  if (visible.length === 0) {
    return <p className="story-mosaic-empty">Die ersten Reparaturgeschichten erscheinen bald hier.</p>;
  }

  return <div className={`story-mosaic ${visible.length >= MOSAIC_MIN_TILES ? "is-mosaic" : "is-row"}`}>
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
  </div>;
}
