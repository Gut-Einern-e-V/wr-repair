import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getStories } from "@/lib/stories";

export const metadata = { title: "Reparaturgeschichten | Reparaturrekord NRW" };

export default async function StoriesPage() {
  const stories = await getStories();
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="stories-title"><p className="eyebrow">Reparaturgeschichten</p><h1 id="stories-title">Was bleibt,<br /><span>wenn wir es reparieren.</span></h1><p>Diese Geschichten liegen als Markdown im Repository. Neue Beitraege brauchen keinen Datenbankzugang und werden beim naechsten Build als eigene Seite veroeffentlicht.</p></section>
    <section className="content-section" aria-label="Alle Reparaturgeschichten"><div className="story-list">
      {stories.map((story, index) => <article className="story-list-item" key={story.slug}>
        <p className="section-index">0{index + 1} / {story.category}</p><h2>{story.title}</h2><p>{story.summary}</p>
        <div className="story-meta"><time dateTime={story.date}>{new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(`${story.date}T12:00:00`))}</time><span>{story.readingTime}</span></div>
        <Link className="text-button" href={`/stories/${story.slug}`}>Geschichte lesen <span aria-hidden="true">&#8594;</span></Link>
      </article>)}
    </div></section>
    <SiteFooter />
  </main>;
}