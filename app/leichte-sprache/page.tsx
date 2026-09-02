import { Fragment } from "react";
import Link from "next/link";
import { getAppSettings } from "@/lib/app-settings";
import { QuickSubmission } from "@/app/mitmachen/quick-submission";

export const metadata = {
  title: "Leichte Sprache",
  description:
    "Der Reparaturrekord NRW in Leichter Sprache: Worum es geht, wie du mitmachst, wo du Hilfe beim Reparieren findest und an wen du dich wendest, wenn etwas nicht funktioniert.",
};

/* Die Zielzahl ist im Backend einstellbar (Issue #74) und steht auch hier. */
export const revalidate = 300;

/**
 * Seite in Leichter Sprache (Issue #47).
 *
 * Warum es diese Seite ueberhaupt gibt: Das Projekt wird vom Land NRW und aus
 * EFRE-Mitteln gefoerdert. BITV 2.0 § 4 verlangt fuer solche Angebote
 * Erklaerungen in Leichter Sprache zu drei Dingen - was auf der Seite steht,
 * wie man sich zurechtfindet, und an wen man sich bei einer Barriere wendet.
 * Alle drei stehen unten.
 *
 * Die Regeln kommen aus DIN SPEC 33429: ein Gedanke pro Satz, jeder Satz in
 * einer eigenen Zeile, kein Genitiv, kein Konjunktiv, keine Passivsaetze, grosse
 * Schrift, linksbuendig. Deshalb steht hier auch fuer jeden Satz ein eigenes
 * `<p>` - `<br>` waere kuerzer, aber ein Screenreader macht daraus keine Pause.
 *
 * Eigener Kopf und eigener Fuss statt `SiteHeader`: Die Seite soll nichts
 * zeigen, was ablenkt. `data-reveal="off"` am `<main>` haelt die
 * Einblend-Animation von dieser Seite fern (siehe components/scroll-reveal.tsx).
 *
 * Das Formular ist bewusst dasselbe Bauteil wie auf /mitmachen. Aenderungen am
 * Einreichungsablauf erscheinen damit automatisch auch hier - eine Kopie waere
 * nach der ersten Aenderung falsch.
 */
export default async function EasyLanguagePage() {
  const { recordGoal } = await getAppSettings();

  return <main className="easy-shell" data-reveal="off">
    <a className="skip-link" href="#inhalt">Zum Inhalt springen</a>
    <header className="easy-header">
      <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
      <Link className="easy-switch" href="/">Zur normalen Seite</Link>
    </header>

    <article className="easy-page" id="inhalt">
      <p className="easy-eyebrow">Leichte Sprache</p>
      <h1>Herzlich willkommen<br />beim <W>Reparatur·rekord</W> NRW</h1>

      <section aria-labelledby="easy-about">
        <h2 id="easy-about">Darum geht es hier</h2>
        <p>Diese <W>Internet·seite</W> ist vom <W>Reparatur·rekord</W> NRW.</p>
        <p>NRW ist die Abkürzung für Nordrhein-Westfalen.</p>
        <p>Nordrhein-Westfalen ist ein <W>Bundes·land</W> in Deutschland.</p>
        <p>Wir sammeln Reparaturen.</p>
        <p className="easy-define">Eine Reparatur ist:<br />Etwas ist kaputt.<br />Jemand macht es wieder heil.</p>
        <p>Ein Beispiel:</p>
        <p>Ein Stuhl wackelt.</p>
        <p>Jemand zieht die Schrauben fest.</p>
        <p>Jetzt wackelt der Stuhl nicht mehr.</p>
        <p>Das ist eine Reparatur.</p>
      </section>

      <section aria-labelledby="easy-why">
        <h2 id="easy-why">Warum machen wir das?</h2>
        <p>Wir wollen einen <W>Welt·rekord</W> aufstellen.</p>
        <p className="easy-define">Ein <W>Welt·rekord</W> ist:<br />Die beste Leistung auf der ganzen Welt.</p>
        <p>Unser Ziel sind {recordGoal.toLocaleString("de-DE")} Reparaturen.</p>
        <p>Das ist eine sehr große Zahl.</p>
        <p>Alle Reparaturen zusammen zählen.</p>
        <p>Auch deine Reparatur zählt.</p>
        <p>Warum ist uns das wichtig?</p>
        <p>Viele Sachen landen im Müll.</p>
        <p>Dabei sind die Sachen nur ein bisschen kaputt.</p>
        <p>Das ist schlecht für die Natur.</p>
        <p>Reparieren ist besser.</p>
        <p>Reparieren spart Geld.</p>
        <p>Und Reparieren macht Spaß.</p>
        <p>Viele Menschen reparieren schon.</p>
        <p>Aber niemand sieht das.</p>
        <p>Mit dem Rekord wird es sichtbar.</p>
      </section>

      <section aria-labelledby="easy-steps">
        <h2 id="easy-steps">So machst du mit</h2>
        <ol className="easy-steps">
          <li>Du reparierst etwas.</li>
          <li>Du machst ein Foto von der Reparatur.</li>
          <li>Du füllst das Formular aus.<br />Das Formular ist weiter unten.</li>
          <li>Du schickst das Formular ab.</li>
        </ol>
        <p>Danach schauen wir uns deine Reparatur an.</p>
        <p>Das dauert ein paar Tage.</p>
        <p>Dann zählt deine Reparatur zum Rekord.</p>
        <p>Mitmachen kostet nichts.</p>
        <p>Du kannst so oft mitmachen, wie du willst.</p>
        <p>Wichtig:</p>
        <p>Du musst in Nordrhein-Westfalen reparieren.</p>
        <p>Im Formular kannst du auch beim <W>Gewinn·spiel</W> mitmachen.</p>
        <p>Dann kannst du etwas gewinnen.</p>
      </section>

      <section aria-labelledby="easy-form">
        <h2 id="easy-form">Hier trägst du deine Reparatur ein</h2>
        <p className="easy-warning">Achtung:<br />Das Formular ist nicht in Leichter Sprache.</p>
        <p>Brauchst du Hilfe beim Ausfüllen?</p>
        <p>Dann schreib uns eine E-Mail.</p>
        <p>Unsere E-Mail-Adresse ist:<br /><a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a></p>
        <div className="easy-form">
          <QuickSubmission />
        </div>
      </section>

      <section aria-labelledby="easy-help">
        <h2 id="easy-help">Du brauchst Hilfe beim Reparieren?</h2>
        <p>Vielleicht weißt du nicht, wie das geht.</p>
        <p>Das ist nicht schlimm.</p>
        <p>Es gibt <W>Repair·Cafés</W>.</p>
        <p className="easy-define">Ein <W>Repair·Café</W> ist:<br />Ein <W>Treff·punkt</W> zum Reparieren.<br />Dort helfen dir Menschen.<br />Und du darfst Werkzeug benutzen.</p>
        <p>Du bringst deine kaputte Sache mit.</p>
        <p>Ihr repariert sie zusammen.</p>
        <p>Das kostet nichts.</p>
        <p><Link className="easy-link" href="/repair-cafes">Ein <W>Repair·Café</W> in deiner Nähe finden</Link></p>
      </section>

      <section aria-labelledby="easy-navigation">
        <h2 id="easy-navigation">So findest du dich zurecht</h2>
        <p>Ganz oben auf jeder Seite ist ein Menü.</p>
        <p>Im Menü stehen alle Seiten.</p>
        <p>Auf dem Handy ist das Menü hinter 3 Strichen.</p>
        <p>Diese Seiten gibt es:</p>
        <ul className="easy-pages">
          <li><Link href="/">Start·seite</Link><br />Hier steht das Wichtigste über den Rekord.</li>
          <li><Link href="/stats">Live-Stand</Link><br />Hier siehst du: So viele Reparaturen sind schon gezählt.</li>
          <li><Link href="/mitmachen">Einreichen</Link><br />Hier trägst du deine Reparatur ein.</li>
          <li><Link href="/stories">Geschichten</Link><br />Hier erzählen Menschen von ihrer Reparatur.</li>
          <li><Link href="/repair-cafes">Repair Cafés</Link><br />Hier findest du Hilfe beim Reparieren.</li>
          <li><Link href="/about">Projekt</Link><br />Hier steht, wer wir sind.</li>
        </ul>
      </section>

      <section aria-labelledby="easy-barrier">
        <h2 id="easy-barrier">Etwas funktioniert nicht?</h2>
        <p>Vielleicht kannst du etwas nicht lesen.</p>
        <p>Oder ein Knopf funktioniert nicht.</p>
        <p>Dann schreib uns bitte.</p>
        <p>Unsere E-Mail-Adresse ist:<br /><a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a></p>
        <p>Schreib uns bitte diese 3 Sachen:</p>
        <ul className="easy-pages">
          <li>Auf welcher Seite war das Problem?</li>
          <li>Welches Gerät benutzt du?<br />Zum Beispiel: Handy oder Computer.</li>
          <li>Was hat nicht funktioniert?</li>
        </ul>
        <p>Wir kümmern uns darum.</p>
        <p><Link className="easy-link" href="/accessibility">Mehr steht in der Erklärung zur <W>Barriere·freiheit</W></Link></p>
      </section>

      <section aria-labelledby="easy-back">
        <h2 id="easy-back">Zurück zur normalen Seite</h2>
        <p>Diese Seite ist in Leichter Sprache.</p>
        <p>Es gibt die Seite auch in normaler Sprache.</p>
        <p><Link className="easy-link" href="/">Zur normalen <W>Start·seite</W></Link></p>
      </section>
    </article>

    <footer className="easy-footer">
      <p>Ein Projekt von der FAB Region <W>Bergisches·Städtedreieck</W>.</p>
      <div><Link href="/privacy">Datenschutz</Link><Link href="/imprint">Impressum</Link><Link href="/accessibility">Barrierefreiheit</Link></div>
    </footer>
  </main>;
}

/**
 * Langes Wort mit Trennpunkt (Mediopunkt), wie es DIN SPEC 33429 vorsieht.
 *
 * Der Punkt hilft beim Lesen und stoert beim Hoeren: Manche Screenreader
 * sprechen ihn mit oder zerlegen das Wort in zwei. Deshalb steht er in einem
 * eigenen `aria-hidden`-Element - auf dem Bildschirm steht "Welt·rekord",
 * vorgelesen wird "Weltrekord".
 */
function W({ children }: { children: string }) {
  return <>{children.split("·").map((part, index) => <Fragment key={index}>
    {index > 0 && <span className="easy-dot" aria-hidden="true">·</span>}
    {part}
  </Fragment>)}</>;
}
