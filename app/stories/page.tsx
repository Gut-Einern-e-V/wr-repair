import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { storyPhoto } from "@/lib/brand-photos";
import { getStories } from "@/lib/stories";

export const metadata = { title: "Reparaturgeschichten | Reparaturrekord NRW" };

export default async function StoriesPage() {
  const stories = await getStories();
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="stories-title">
      <p className="brand-kicker">Den ganzen Oktober lang reparieren &hellip;</p>
      <h1 className="sticker-head is-mint" id="stories-title"><span className="sticker">Was bleibt,</span><span className="sticker">wenn wir es</span><span className="sticker">reparieren</span></h1>
      <p>Diese Geschichten liegen als Markdown im Repository. Neue Beitraege brauchen keinen Datenbankzugang und werden beim naechsten Build als eigene Seite veroeffentlicht.</p>
    </section>
    <section className="content-section" aria-label="Alle Reparaturgeschichten"><div className="story-grid">
      {stories.map((story, index) => {
        const photo = storyPhoto(index);
        return <article className="story-card" key={story.slug}>
          <div className="story-art">
            <NextImage src={photo.src} alt={photo.alt} width={640} height={440} sizes="(max-width: 720px) 100vw, 33vw" />
            <span>{story.category}</span>
          </div>
          <p><time dateTime={story.date}>{new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(`${story.date}T12:00:00`))}</time> · {story.readingTime}</p>
          <h2>{story.title}</h2>
          <p className="story-summary">{story.summary}</p>
          <Link className="text-button" href={`/stories/${story.slug}`}>Geschichte lesen <span aria-hidden="true">&#8594;</span></Link>
        </article>;
      })}
    </div></section>
    <SiteFooter />
  </main>;
}
