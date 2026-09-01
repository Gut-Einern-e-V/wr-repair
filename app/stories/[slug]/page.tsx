import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { StoryStructuredData } from "@/components/structured-data";
import { getStories, getStory } from "@/lib/stories";

type StoryPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getStories()).map((story) => ({ slug: story.slug }));
}

/* Ohne eigene Metadaten trug jede Geschichte den Titel der Startseite - in
   Suchergebnissen und geteilten Links waren sie damit nicht auseinanderzu-
   halten (Issue #67). */
export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const story = await getStory((await params).slug);
  if (!story) return {};

  return {
    title: story.title,
    description: story.summary,
    openGraph: {
      type: "article",
      title: story.title,
      description: story.summary,
      url: `/stories/${story.slug}`,
      publishedTime: story.date,
      section: story.category,
    },
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const story = await getStory((await params).slug);
  if (!story) notFound();
  return <main className="page-shell content-page">
    <StoryStructuredData story={story} />
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