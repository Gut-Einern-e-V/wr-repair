import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CONTACT_EMAIL, mailto } from "@/lib/organisation";
import { FESTIVAL_DATE_TEXT, FestivalFacts, FestivalNav, FestivalPending, FestivalVenues } from "../festival-chrome";

export const metadata = {
  title: "Anreise zum Festival",
  description:
    "Wie ihr am 31. Oktober 2026 zum Repair & Share Festival nach Utopiastadt und in die Wiesenwerke in Wuppertal kommt: mit Bahn und Bus über den Hauptbahnhof, mit dem Rad über die Nordbahntrasse – und warum wir vom Auto abraten.",
};

/* Eigene Seite und nicht nur ein Absatz (Issue #33).
   Die Bitte, mit Bus, Bahn oder Rad zu kommen, ist im Issue ausdruecklich
   genannt und keine Nebensache: Am Gelaende gibt es kaum Parkplaetze, und ein
   Fest ueber den sorgsamen Umgang mit Ressourcen kann schlecht einen Tag lang
   Parksuchverkehr durch den Stadtteil schicken. Eine eigene Seite kann diese
   Bitte begruenden, statt sie nur auszusprechen.

   Linien und Haltestellen sind nachgeschlagen und nicht geschaetzt: Die
   Zuglinien stehen so in den VRR-Linienplaenen fuer 2026, die Bushaltestellen
   samt Entfernung kommen aus den WSW-Fahrplaenen und den Linienrelationen in
   OpenStreetMap. Wichtig dabei: Von den Linien, die vom Hauptbahnhof nach
   Norden fahren, haelt nur die 620 am Mirker Bahnhof - 607, 625, 635 und 645
   biegen an der Schleswiger Strasse ab, gut 200 Meter davor. Beides ist
   brauchbar, aber es ist nicht dasselbe, und wer es verwechselt, laeuft im
   Zweifel den Berg hoch.

   Fahrzeiten stehen mit "rund" und "gut" da, nicht auf die Minute: Der
   Fahrplan fuer Ende 2026 ist noch nicht veroeffentlicht. Deshalb der Hinweis
   auf die Fahrplanauskunft - eine Zahl, die im Oktober 2026 nicht mehr stimmt,
   ist schlimmer als eine ungefaehre. */
export default function FestivalTravelPage() {
  return <main className="page-shell content-page">
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="travel-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival</p>
        <h1 id="travel-title">Am besten mit Bahn, Bus oder Rad.</h1>
        <p>Das Festivalgelände liegt mitten in Wuppertal, zehn Minuten mit dem Bus vom Hauptbahnhof. Hier stehen die Wege, die wir empfehlen.</p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="travel-facts-title">
      <FestivalNav current="/festival/anreise" />
      <div className="section-heading">
        <div>
          <p className="section-index">Der Termin</p>
          <h2 id="travel-facts-title">{FESTIVAL_DATE_TEXT}</h2>
        </div>
      </div>
      <FestivalFacts />
      <FestivalPending>Welcher Eingang am Festivaltag geöffnet ist, wie das Gelände zwischen beiden Orten organisiert wird und wo die Stellplätze für Räder stehen. Sobald das Gelände geplant ist, steht es hier.</FestivalPending>
    </section>

    <section className="content-section" aria-labelledby="travel-venues-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Die beiden Orte</p>
          <h2 id="travel-venues-title">Utopiastadt und Wiesenwerke liegen an derselben Trasse.</h2>
        </div>
      </div>
      <p className="section-lead">Beide Adressen zum Abtippen oder Antippen &ndash; auf dem Telefon öffnet der Kartenlink die Karten-App.</p>
      <FestivalVenues />
    </section>

    <section className="content-section" aria-labelledby="travel-train-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Mit der Bahn</p>
          <h2 id="travel-train-title">Erst zum Wuppertaler Hauptbahnhof.</h2>
        </div>
      </div>
      <p className="section-lead">Wuppertal liegt an der Strecke zwischen Köln und Dortmund und ist aus dem ganzen Rheinland und Ruhrgebiet ohne Umsteigen zu erreichen. Aus den vier großen Nachbarstädten fahren diese Linien direkt:</p>
      <dl className="travel-routes">
        <div>
          <dt>Aus Düsseldorf</dt>
          <dd><strong>RE 4</strong>, <strong>RE 13</strong> oder die <strong>S 8</strong> ab Düsseldorf Hbf. Mit dem Regionalexpress rund 20 Minuten, mit der S-Bahn etwas länger.</dd>
        </div>
        <div>
          <dt>Aus Köln</dt>
          <dd><strong>RE 7</strong> ab Köln Hbf über Solingen, gut 30 Minuten. Die <strong>RB 48</strong> fährt dieselbe Strecke, hält häufiger und braucht knapp eine Stunde.</dd>
        </div>
        <div>
          <dt>Aus Dortmund</dt>
          <dd><strong>RE 4</strong> ab Dortmund Hbf über Witten und Hagen, rund 40 Minuten.</dd>
        </div>
        <div>
          <dt>Aus Essen</dt>
          <dd><strong>S 9</strong> ab Essen Hbf über Velbert-Langenberg, knapp 50 Minuten &ndash; dafür ohne Umsteigen. Wer schneller da sein will, fährt über Düsseldorf und steigt dort um.</dd>
        </div>
      </dl>
      <p className="travel-note">Fahrzeiten sind Richtwerte: Der Fahrplan für Ende 2026 steht noch nicht fest. Sucht die Verbindung kurz vor dem Festival noch einmal in der <a href="https://www.vrr.de/de/fahrplanauskunft/" target="_blank" rel="noreferrer">VRR-Fahrplanauskunft</a> oder bei <a href="https://www.bahn.de/" target="_blank" rel="noreferrer">bahn.de</a>.</p>
    </section>

    <section className="content-section" aria-labelledby="travel-bus-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Mit dem Bus</p>
          <h2 id="travel-bus-title">Vom Hauptbahnhof sind es zehn Minuten.</h2>
        </div>
      </div>
      <p className="section-lead">Zu Fuß wären es vom Hauptbahnhof knapp zwei Kilometer &ndash; und die gehen bergauf. Nehmt lieber den Bus; alle Linien fahren am Bahnhofsvorplatz ab.</p>
      <dl className="travel-routes">
        <div>
          <dt>Linie 620</dt>
          <dd>Richtung Kuckelsberg, fünfte Haltestelle. Aussteigen an <strong>Mirker Bahnhof</strong> &ndash; das ist die Haltestelle direkt vor der Utopiastadt. Für die Wiesenwerke eine Haltestelle weiter fahren, bis <strong>Wüstenhofer Straße</strong>.</dd>
        </div>
        <div>
          <dt>Linien 607, 625, 635, 645</dt>
          <dd>Aussteigen an der <strong>Schleswiger Straße</strong>, eine Haltestelle vor dem Mirker Bahnhof. Von dort sind es rund 200 Meter zur Utopiastadt. Weiter als bis hierhin fahren diese Linien nicht in Richtung Mirke.</dd>
        </div>
      </dl>
      <p className="travel-note">Wer ein Deutschlandticket hat, fährt damit alle Züge und Busse auf dieser Seite. Sonst reicht ein TagesTicket für Hin- und Rückweg; für bis zu fünf Personen gibt es das auch als gemeinsames Ticket &ndash; günstiger, als fünfmal einzeln zu zahlen. Was es kostet, hängt von der Preisstufe ab.</p>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-bike-title">
      <div>
        <p className="section-index">Mit dem Rad</p>
        <h2 id="travel-bike-title">Über die Nordbahntrasse bis vor die Tür.</h2>
      </div>
      <div>
        <p>Die Nordbahntrasse führt fast ohne Steigung quer durch Wuppertal und direkt an beiden Orten vorbei: Die Utopiastadt sitzt im alten Bahnhofsgebäude an der Trasse, die Wiesenwerke liegen rund 700 Meter weiter. Für Wuppertaler Verhältnisse ist das die bequemste Art, mit dem Rad quer durch die Stadt zu kommen &ndash; und die schönste.</p>
        <p>Wer von außerhalb anreist: In den Regionalzügen ist die Fahrradmitnahme möglich, aber begrenzt &ndash; an einem Festivalsamstag lohnt es sich, früh zu fahren oder das Rad in Wuppertal zu leihen.</p>
        <p>Bringt ein Schloss mit: Abstellmöglichkeiten planen wir ein, bewacht sind sie nicht.</p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-car-title">
      <div>
        <p className="section-index">Mit dem Auto</p>
        <h2 id="travel-car-title">Bitte nur, wenn es nicht anders geht.</h2>
      </div>
      <div>
        <p>Rund um das Gelände gibt es kaum Parkplätze, und die Straßen im Viertel sind eng. Ein Tag lang Parksuchverkehr wäre für die Nachbarschaft eine Zumutung &ndash; und für ein Fest über den sorgsamen Umgang mit Dingen ein schiefes Bild.</p>
        <p>Wer auf das Auto angewiesen ist, etwa weil schwere Werkzeugkisten mitkommen oder weil Bus und Bahn nicht barrierefrei nutzbar sind, meldet sich bitte vorher bei uns. Für Anlieferung und für Menschen mit Mobilitätseinschränkungen finden wir eine Lösung.</p>
        <p className="link-row">
          <a className="text-button" href={mailto(CONTACT_EMAIL, "Repair & Share Festival - Anreise")}>Wegen der Anreise schreiben <span aria-hidden="true">&#8594;</span></a>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-access-title">
      <div>
        <p className="section-index">Barrierefreiheit</p>
        <h2 id="travel-access-title">Sagt uns, was ihr braucht.</h2>
      </div>
      <div>
        <p>Beide Gelände sind ehemalige Bahn- und Industrieflächen; nicht jeder Weg dort ist eben, und zwischen Utopiastadt und Wiesenwerken liegen rund 700 Meter. Was am Festivaltag barrierefrei erreichbar sein wird, steht noch nicht in allen Punkten fest.</p>
        <p>Schreibt uns, was ihr braucht &ndash; Begleitung, ein ruhiger Ort, ein Weg ohne Stufen, eine Mitfahrgelegenheit zwischen den beiden Orten. Je früher wir es wissen, desto eher lässt es sich einplanen.</p>
        <p className="link-row">
          <Link className="text-button" href="/accessibility">Barrierefreiheit auf dieser Website <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
