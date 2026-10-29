import { areaId } from "./programm";

type MapSpot = { kind: "info" | "buehne" | "essen" | "werkstatt" | "start"; label: string };

/* Was man auf dem Gelaende sucht, je Ort. Von West nach Ost wie auf der
   Karte: die Wiesenwerke liegen die Trasse hinunter westlich der Utopiastadt. */
const places: readonly { venue: "Wiesenwerke" | "Nordbahntrasse" | "Utopiastadt"; note: string; spots: readonly MapSpot[] }[] = [
  {
    venue: "Wiesenwerke",
    note: "Wiesenstraße 118",
    spots: [
      { kind: "werkstatt", label: "ReparaturCafé XXL: Elektro, Fahrrad, Textil, Holz" },
      { kind: "buehne", label: "Bühne im TalTonTheater" },
      { kind: "info", label: "Infostand am Bauwagen und im Bahnhof Blo" },
      { kind: "essen", label: "Veganes Essen im Bahnhof Blo" },
    ],
  },
  {
    venue: "Nordbahntrasse",
    note: "rund 700 m · 10 Minuten zu Fuß",
    spots: [
      { kind: "start", label: "Treffpunkt der Führungen vor Utopiastadt" },
      { kind: "essen", label: "Street-Kitchen, Kaffee & Kuchen" },
      { kind: "info", label: "Rikscha-Shuttle für müde Beine" },
    ],
  },
  {
    venue: "Utopiastadt",
    note: "Mirker Straße 48",
    spots: [
      { kind: "info", label: "Infostand im Wartesaal 1" },
      { kind: "buehne", label: "Eröffnung & Vorträge im Wartesaal 1" },
      { kind: "werkstatt", label: "Secondhand & kreative Workshops" },
    ],
  },
];

const spotLabels: Record<MapSpot["kind"], string> = { info: "Info", buehne: "Bühne", essen: "Essen", werkstatt: "Mitmachen", start: "Treffpunkt" };

/**
 * Lageplan als Skizze: zwei Orte, dazwischen die Trasse.
 *
 * Bewusst HTML und keine Karte: Es geht um "wo ist was", nicht um Strassen.
 * Eine Karte mit Strassen gibt es auf /festival/anreise. Jeder Ort fuehrt zu
 * seinen Stationen weiter unten.
 */
export function FestivalMap() {
  return <ol className="festival-map">
    {places.map((place) => (
      <li key={place.venue} data-venue={place.venue}>
        <a className="festival-map-place" href={`#${areaId(place.venue)}`}>
          <span className="festival-map-name">{place.venue}</span>
          <small>{place.note}</small>
          <ul>
            {place.spots.map((spot) => (
              <li key={spot.label}><span className="festival-map-spot" data-kind={spot.kind}>{spotLabels[spot.kind]}</span>{spot.label}</li>
            ))}
          </ul>
          <span className="festival-map-more">Stationen ansehen <span aria-hidden="true">&#8595;</span></span>
        </a>
      </li>
    ))}
  </ol>;
}
