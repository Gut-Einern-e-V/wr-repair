import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos, storyCover } from "@/lib/brand-photos";
import { getCampaignClosed } from "@/lib/campaign-closed";
import { getStoryTeasers } from "@/lib/stories";

/* Veroeffentlichte Highlights kommen aus der Datenbank. Die Freigabe setzt die
   Seite sofort neu auf; das hier ist nur das Sicherheitsnetz. */
export const revalidate = 600;

export const metadata = {
  title: "Reparaturgeschichten",
  description: "Reparaturen aus Nordrhein-Westfalen, ausführlich erzählt: was kaputt war, wie es wieder funktioniert und was dabei hängen geblieben ist.",
};

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

export default async function StoriesPage() {
  const [stories, closed] = await Promise.all([getStoryTeasers(), getCampaignClosed()]);

  return <main className="page-shell content-page">
    <SiteHeader />
    <section id="inhalt" className="content-hero" aria-labelledby="stories-title">
      <p className="brand-kicker">{closed ? <>Den ganzen Oktober lang repariert &hellip;</> : <>Den ganzen Oktober lang reparieren &hellip;</>}</p>
      <h1 className="sticker-head is-mint" id="stories-title"><span className="sticker">Was bleibt,</span><span className="sticker">wenn wir es</span><span className="sticker">reparieren</span></h1>
      <p>Manche Reparaturen erzählen wir ausführlich: was kaputt war, wer sich darangesetzt hat und was am Ende wieder funktioniert. {closed ? "Diese Geschichten sind während des Weltrekordversuchs entstanden." : "Während des Weltrekordversuchs kommen laufend neue Geschichten dazu."}</p>
    </section>
    <section className="content-section" aria-label="Alle Reparaturgeschichten"><div className="story-grid">
      {stories.map((story, index) => {
        const photo = storyCover(story, index);
        return <article className="story-card" key={story.slug}>
          <div className="story-art">
            <NextImage src={photo.src} alt={photo.alt} fill sizes="(max-width: 720px) 100vw, 33vw" />
            <span>{story.category}</span>
          </div>
          <p><time dateTime={story.date}>{dateFormat.format(new Date(`${story.date}T12:00:00`))}</time> &middot; {story.readingTime}</p>
          <h2>{story.title}</h2>
          <p className="story-summary">{story.summary}</p>
          <Link className="text-button" href={`/stories/${story.slug}`}>Geschichte lesen <span aria-hidden="true">&#8594;</span></Link>
        </article>;
      })}
    </div></section>
    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.secondLife.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      {/* Nach der Aktion fuehrt der Abbinder dorthin, wo weiter repariert
          wird - eintragen laesst sich dann nichts mehr. */}
      {closed
        ? <>
            <p>Bei dir ist auch etwas kaputt? In Repair Cafés hilft man dir weiter.</p>
            <Link className="button button-secondary" href="/repair-cafes">Repair Café finden <span aria-hidden="true">&#8594;</span></Link>
          </>
        : <>
            <p>Du hast auch etwas gerettet? Jede Reparatur zählt für den Rekord.</p>
            <Link className="button button-secondary" href="/mitmachen">Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
          </>}
    </section>
    <SiteFooter />
  </main>;
}
