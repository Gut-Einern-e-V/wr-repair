import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos } from "@/lib/brand-photos";
import { cityEventsUrl, repairCafeCities, repairCafeDirectories } from "@/lib/repair-cafes";

export const metadata = {
  title: "Repair Café finden",
  description: "Wo es in Nordrhein-Westfalen Hilfe beim Reparieren gibt: Termine der Reparatur-Initiativen, Repair Cafés in den großen Städten und die Termine im Rekordmonat.",
};

export default function RepairCafesPage() {
  return <main className="page-shell content-page">
    <SiteHeader />

    <section className="content-hero" aria-labelledby="cafes-title">
      <p className="brand-kicker">Hilfe beim Reparieren</p>
      <h1 className="sticker-head is-mint" id="cafes-title"><span className="sticker">Du brauchst</span><span className="sticker">Werkzeug und</span><span className="sticker">Mitstreitende</span></h1>
      <p>In Repair Cafés und offenen Werkstätten sitzen Menschen, die schon hunderte Dinge wieder zum Laufen gebracht haben. Werkzeug ist da, Kaffee auch, und die Hilfe kostet nichts. Repariert wird gemeinsam &ndash; nicht für dich, sondern mit dir.</p>
    </section>

    <section className="content-section" aria-labelledby="directories-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Zwei Verzeichnisse</p>
          <h2 id="directories-title">Hier stehen die aktuellen Termine.</h2>
          <p className="section-lead">Wir führen keine eigene Terminliste: Die beiden Netzwerke pflegen ihre Termine selbst, deshalb verlinken wir direkt dorthin. So steht hier nie ein Termin, der schon vorbei ist.</p>
        </div>
      </div>
      <div className="cafe-directories">
        {repairCafeDirectories.map((directory) => (
          <article key={directory.id}>
            <h3>{directory.name}</h3>
            <p>{directory.detail}</p>
            <a className="text-button" href={directory.href} target="_blank" rel="noreferrer">{directory.linkLabel} <span aria-hidden="true">&#8599;</span></a>
          </article>
        ))}
      </div>
    </section>

    <section className="content-section" aria-labelledby="cities-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Direkt in deine Stadt</p>
          <h2 id="cities-title">Termine in den großen Städten.</h2>
          <p className="section-lead">Jeder Link öffnet die Terminsuche des Netzwerks Reparatur-Initiativen für diese Stadt. Deine Stadt fehlt? Dort lässt sich auch nach Postleitzahl suchen.</p>
        </div>
      </div>
      <ul className="cafe-city-grid">
        {repairCafeCities.map((city) => (
          <li key={city}>
            <a href={cityEventsUrl(city)} target="_blank" rel="noreferrer">
              <strong>{city}</strong>
              <span>Termine ansehen <i aria-hidden="true">&#8599;</i></span>
            </a>
          </li>
        ))}
      </ul>
    </section>

    <section className="content-section" aria-labelledby="dates-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Im Rekordmonat</p>
          <h2 id="dates-title">Zwei Termine lohnen sich besonders.</h2>
        </div>
      </div>
      <ol className="cafe-highlights">
        <li>
          <p className="cafe-highlight-date"><time dateTime="2026-10-17">Samstag, 17. Oktober 2026</time></p>
          <h3>International Repair Day</h3>
          <p>Der internationale Aktionstag der Reparaturbewegung, immer am dritten Samstag im Oktober. Viele Initiativen öffnen an diesem Tag zusätzlich oder länger.</p>
        </li>
        <li>
          <p className="cafe-highlight-date"><time dateTime="2026-10-31">Samstag, 31. Oktober 2026</time></p>
          <h3>Repair &amp; Share Festival, Wuppertal</h3>
          <p>Das Finale des Rekordmonats: ein ganzer Tag Reparatur und Secondhand. Hier soll die letzte große Portion Reparaturen zusammenkommen.</p>
          <a className="text-button" href="https://www.fab-bergisch.org/reparatur-weltrekord-in-nrw" target="_blank" rel="noreferrer">Infos zum Festival <span aria-hidden="true">&#8599;</span></a>
        </li>
      </ol>
    </section>

    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.bicycle.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      <p>Reparatur geglückt? Dann zählt sie für den Rekord.</p>
      <Link className="button button-secondary" href="/mitmachen">Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
    </section>

    <SiteFooter />
  </main>;
}
