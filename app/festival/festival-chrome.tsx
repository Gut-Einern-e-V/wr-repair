import Link from "next/link";

/**
 * Gemeinsame Bausteine der Festivalseiten (Issue #33).
 *
 * Drei Seiten teilen sich Datum, Ort und die Unternavigation. Sie stehen hier
 * einmal, damit ein spaeter feststehender Zeitplan nicht an drei Stellen
 * nachgetragen werden muss - und damit die Angaben nicht auseinanderlaufen.
 */

/** Maschinenlesbar fuer `<time>`, ausgeschrieben fuer den Text. */
export const FESTIVAL_DATE_ISO = "2026-10-31";
export const FESTIVAL_DATE_TEXT = "Samstag, 31. Oktober 2026";

/** Der Ort, so genau wie er bisher feststeht. */
export const FESTIVAL_PLACE = "Utopiastadt und Wiesenwerke, Wuppertal";

/**
 * Die beiden Gelaende mit Adresse und Koordinate.
 *
 * Die Koordinaten sind aus OpenStreetMap: Utopiastadt sitzt im ehemaligen
 * Bahnhofsgebaeude Wuppertal-Mirke (Mirker Str. 48), die Wiesenwerke in der
 * fruehen Gold-Zack-Fabrik (Wiesenstr. 118). Zwischen beiden liegen rund 700
 * Meter Nordbahntrasse.
 */
export const festivalVenues = [
  {
    name: "Utopiastadt",
    street: "Mirker Straße 48",
    town: "42105 Wuppertal",
    note: "Das ehemalige Bahnhofsgebäude Wuppertal-Mirke, direkt an der Nordbahntrasse bei Kilometer 13,6.",
    lat: 51.26671,
    lon: 7.14491,
  },
  {
    name: "Wiesenwerke",
    street: "Wiesenstraße 118",
    town: "42105 Wuppertal",
    note: "Die frühere Gold-Zack-Fabrik, rund 700 Meter die Trasse hinunter – etwa zehn Minuten zu Fuß von der Utopiastadt.",
    lat: 51.26553,
    lon: 7.13807,
  },
] as const;

type FestivalVenue = (typeof festivalVenues)[number];

/**
 * Kartenlink, der auf dem Telefon die Karten-App oeffnet.
 *
 * `google.com/maps/search/?api=1&query=...` ist die von Google dokumentierte,
 * versionierte Form: Auf Android und iOS uebernimmt die installierte Karten-App
 * den Link, sonst oeffnet sich die Kartenansicht im Browser. Im `query` steht
 * die Adresse und nicht die Koordinate - so heisst der Punkt in der App auch
 * beim Weitergeben noch "Utopiastadt" und nicht "51.26671, 7.14491".
 *
 * Der Link laedt nichts nach. Zu Google geht erst etwas, wenn jemand ihn
 * antippt; deshalb braucht er keine Einwilligung. Wer das trotzdem nicht
 * moechte, findet daneben denselben Punkt in OpenStreetMap.
 */
function mapsUrl({ name, street, town }: FestivalVenue) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${street}, ${town}`)}`;
}

function openStreetMapUrl({ lat, lon }: FestivalVenue) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

/**
 * Die beiden Orte mit Adresse und Kartenlink.
 *
 * Die Adresse steht als Text da und nicht nur als Link: Sie muss sich abtippen,
 * vorlesen und in eine fremde Fahrplan-App eingeben lassen, auch ohne dass
 * jemand eine Karte oeffnet.
 */
export function FestivalVenues() {
  return <ul className="festival-venues">
    {festivalVenues.map((venue) => (
      <li key={venue.name}>
        <h3>{venue.name}</h3>
        <p className="festival-venue-address">{venue.street}<br />{venue.town}</p>
        <p>{venue.note}</p>
        <p className="link-row">
          <a className="text-button" href={mapsUrl(venue)} target="_blank" rel="noreferrer">
            In der Karte öffnen <span aria-hidden="true">&#8599;</span>
          </a>
          <a href={openStreetMapUrl(venue)} target="_blank" rel="noreferrer">In OpenStreetMap</a>
        </p>
      </li>
    ))}
  </ul>;
}

export const festivalPages = [
  ["/festival", "Übersicht"],
  ["/festival/anreise", "Anreise"],
  ["/festival/initiativen", "Für Initiativen"],
] as const;

/**
 * Unternavigation der Festivalseiten.
 *
 * `current` bekommt `aria-current="page"` statt eines Links: Ein Link auf die
 * Seite, auf der man schon steht, ist fuer die Tastaturbedienung eine
 * Sackgasse.
 */
export function FestivalNav({ current }: { current: string }) {
  return <nav className="festival-nav" aria-label="Festivalseiten">
    {festivalPages.map(([href, label]) => (
      href === current
        ? <span key={href} aria-current="page">{label}</span>
        : <Link key={href} href={href}>{label}</Link>
    ))}
  </nav>;
}

/**
 * Was noch nicht feststeht.
 *
 * Bewusst als eigener, sichtbar abgesetzter Kasten und nicht als Fliesstext:
 * Ein Festival, dessen Programm noch offen ist, darf keine Seite bekommen, auf
 * der Erfundenes und Feststehendes gleich aussehen. Wer hier liest, soll auf
 * einen Blick erkennen, worauf noch kein Verlass ist.
 */
export function FestivalPending({ children }: { children: React.ReactNode }) {
  return <p className="festival-pending"><strong>Steht noch nicht fest:</strong> {children}</p>;
}

/** Die drei Eckdaten, die auf jeder Festivalseite oben stehen. */
export function FestivalFacts() {
  return <dl className="festival-facts">
    <div><dt>Wann</dt><dd><time dateTime={FESTIVAL_DATE_ISO}>{FESTIVAL_DATE_TEXT}</time></dd></div>
    <div><dt>Wo</dt><dd>{FESTIVAL_PLACE}</dd></div>
    <div><dt>Anreise</dt><dd>Bitte mit Bus, Bahn oder Rad</dd></div>
  </dl>;
}
