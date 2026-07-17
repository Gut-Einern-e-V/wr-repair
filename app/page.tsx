"use client";

import { FormEvent, useState } from "react";

const categories = [
  "Elektrogeraete",
  "Haushaltsgeraete",
  "Computer & Kommunikation",
  "Fahrraeder",
  "Moebel",
  "Textilien & Kleidung",
  "Werkzeuge",
  "Spielzeug & Freizeit",
  "Sonstiges",
];

const stories = [
  { category: "Elektrogeraete", title: "Die Kaffeemaschine brueht wieder.", tag: "Repair-Cafe Wuppertal" },
  { category: "Fahrraeder", title: "Aus acht Jahren Stillstand wird eine neue Tour.", tag: "DIY in Remscheid" },
  { category: "Textilien & Kleidung", title: "Ein Lieblingsmantel bleibt in der Familie.", tag: "Schule Solingen" },
];

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function submitRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Reparaturrekord NRW Startseite">
          <span className="brand-mark">R</span>
          <span>Reparaturrekord<br />NRW</span>
        </a>
        <nav aria-label="Hauptnavigation">
          <a href="#geschichten">Geschichten</a>
          <a href="#ueber-uns">Projekt</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
        <a className="header-link" href="#counter">Live-Stand</a>
      </header>

      <section id="top" className="hero-grid" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">FAB Region Bergisches Land · Oktober 2026</p>
          <h1 id="hero-title">Reparieren.<br /><span>Zaehlen.</span><br />Rekord machen.</h1>
          <p className="hero-intro">
            Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein und mache aus einem Gegenstand eine Geschichte.
          </p>
          <button className="button button-primary" type="button" onClick={() => setIsFormOpen(true)}>
            Reparatur einreichen <span aria-hidden="true">&#8594;</span>
          </button>
        </div>

        <div className="counter-panel" id="counter">
          <p className="counter-label">Freigegebene Reparaturen</p>
          <p className="counter-number" aria-label="1287 freigegebene Reparaturen">1.287</p>
          <div className="counter-meta">
            <span>Unser Ziel: 10.000</span>
            <span>12,9 %</span>
          </div>
          <div className="progress-track" aria-hidden="true"><span /></div>
          <p className="counter-note">Jede Reparatur zaehlt. Auch wenn sie nicht gelungen ist.</p>
        </div>

        <aside className="hero-stamp" aria-label="Weltrekordversuch NRW">
          <span>Weltrekord<br />versuch</span>
          <strong>NRW<br />2026</strong>
        </aside>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="section-index">01 / Mitmachen</p>
          <h2 id="how-title">Ein Foto. Ein paar Fragen. Ein Zeichen fuer Reparatur.</h2>
        </div>
        <ol className="steps">
          <li><span>01</span><p>Foto deiner Reparatur aufnehmen.</p></li>
          <li><span>02</span><p>Gerat und Reparatur kurz beschreiben.</p></li>
          <li><span>03</span><p>Nach Pruefung wird dein Beitrag gezaehlt.</p></li>
        </ol>
      </section>

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <p className="section-index">02 / Alles bleibt</p>
            <h2 id="category-title">Was hast du wieder in Bewegung gebracht?</h2>
          </div>
          <button className="text-button" type="button" onClick={() => setIsFormOpen(true)}>Jetzt einreichen <span aria-hidden="true">&#8594;</span></button>
        </div>
        <div className="category-grid">
          {categories.map((item, index) => (
            <button className={`category-card category-${index + 1}`} type="button" key={item} onClick={() => { setCategory(item); setIsFormOpen(true); }}>
              <span>0{index + 1}</span>
              <strong>{item}</strong>
              <i aria-hidden="true">&#8599;</i>
            </button>
          ))}
        </div>
      </section>

      <section className="stories-section" id="geschichten" aria-labelledby="stories-title">
        <div className="section-heading">
          <div>
            <p className="section-index">03 / Reparaturgeschichten</p>
            <h2 id="stories-title">Gegenstaende mit zweitem Kapitel.</h2>
          </div>
          <a className="text-button" href="#kontakt">Alle Geschichten <span aria-hidden="true">&#8594;</span></a>
        </div>
        <div className="story-grid">
          {stories.map((story, index) => (
            <article className={`story-card story-${index + 1}`} key={story.title}>
              <div className="story-art" aria-hidden="true"><span>{index === 0 ? "KM" : index === 1 ? "RAD" : "TXT"}</span></div>
              <p>{story.tag}</p>
              <h3>{story.title}</h3>
              <a href="#kontakt" aria-label={`${story.title} lesen`}>Lesen <span aria-hidden="true">&#8594;</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="project-banner" id="ueber-uns">
        <p>Reparatur ist keine Ausnahme.<br />Sie ist Infrastruktur.</p>
        <a className="button button-secondary" href="#kontakt">Ueber das Projekt <span aria-hidden="true">&#8594;</span></a>
      </section>

      <footer id="kontakt" className="site-footer">
        <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
        <div><a href="#kontakt">Datenschutz</a><a href="#kontakt">Impressum</a><a href="#kontakt">Barrierefreiheit</a></div>
        <p>Gefordert durch<br />EFRE · NRW · Europa</p>
      </footer>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsFormOpen(false)}>
          <section className="submission-panel" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button" type="button" aria-label="Formular schliessen" onClick={() => setIsFormOpen(false)}>&times;</button>
            {isSubmitted ? (
              <div className="success-state">
                <p className="section-index">Eingereicht</p>
                <h2>Danke. Deine Reparatur wartet auf die Pruefung.</h2>
                <p>Nach der Moderation zaehlt sie zum Rekord.</p>
                <button className="button button-primary" type="button" onClick={() => { setIsSubmitted(false); setIsFormOpen(false); }}>Fertig</button>
              </div>
            ) : (
              <form onSubmit={submitRepair}>
                <p className="section-index">Deine Reparatur / Schritt 1 von 3</p>
                <h2 id="submission-title">Was wurde repariert?</h2>
                <label>Geraetekategorie
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label>Was war kaputt und was hast du getan?
                  <textarea required rows={4} placeholder="Zum Beispiel: Kabel getauscht, Schalter gereinigt ..." />
                </label>
                <label className="upload-field">Foto hinzufuegen <input type="file" accept="image/*" required /><small>JPG, PNG oder HEIC · maximal 5 MB</small></label>
                <label className="consent"><input type="checkbox" required /> <span>Ich bin einverstanden, dass mein Bild nach der Pruefung veroeffentlicht wird.</span></label>
                <button className="button button-primary" type="submit">Zur Pruefung einreichen <span aria-hidden="true">&#8594;</span></button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
