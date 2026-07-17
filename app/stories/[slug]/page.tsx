import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getStories, getStory } from "@/lib/stories";

type StoryPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getStories()).map((story) => ({ slug: story.slug }));
}

export default async function StoryPage({ params }: StoryPageProps) {
  const story = await getStory((await params).slug);
  if (!story) notFound();
  return <main className="page-shell content-page">
    <SiteHeader />
    <article className="article-shell">
      <Link className="back-link" href="/stories">&#8592; Alle Geschichten</Link><p className="eyebrow">{story.category} / {story.readingTime}</p><h1>{story.title}</h1><p className="article-lead">{story.summary}</p>
      <time className="article-date" dateTime={story.date}>{new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(`${story.date}T12:00:00`))}</time>
      <div className="article-body">{story.blocks.map((block, index) => {
        if (block.type === "heading") return <h2 key={index}>{block.content}</h2>;
        if (block.type === "list") return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        return <p key={index}>{block.content}</p>;
      })}</div>
    </article>
    <SiteFooter />
  </main>;
}