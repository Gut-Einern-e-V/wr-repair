"use client";

import { useEffect, useRef, useState } from "react";
import { areaId, roomId, type FestivalArea, type FestivalOffer, type FestivalOfferKind, type FestivalRoom, type FestivalVenueName } from "./programm";

type VenueFilter = "alle" | FestivalVenueName;
type KindFilter = "alle" | FestivalOfferKind | "kinder";

const kindFilters: readonly [KindFilter, string][] = [
  ["alle", "Alles"],
  ["rallye", "Rallye"],
  ["workshop", "Workshops"],
  ["kinder", "Für Kinder"],
];

const offerLabels: Record<FestivalOfferKind, string> = { rallye: "Rallye", workshop: "Workshop" };

function matches(offer: FestivalOffer, kind: KindFilter) {
  return kind === "alle" || (kind === "kinder" ? offer.forKids : offer.kind === kind);
}

/** Was von einem Raum unter dem Filter stehen bleibt; `null`, wenn nichts. */
function filterRoom(room: FestivalRoom, kind: KindFilter): FestivalRoom | null {
  if (kind === "alle") return room;
  const providers = room.providers
    .map((provider) => ({ ...provider, offers: provider.offers?.filter((offer) => matches(offer, kind)) }))
    .filter((provider) => provider.offers?.length);
  return providers.length ? { ...room, providers } : null;
}

function countOffers(room: FestivalRoom) {
  const offers = room.providers.flatMap((provider) => provider.offers ?? []);
  return { rallye: offers.filter((offer) => offer.kind === "rallye").length, workshop: offers.filter((offer) => offer.kind === "workshop").length };
}

/**
 * Alle Stationen, Ort fuer Ort und Raum fuer Raum wie auf den Aushaengen.
 *
 * Die Raeume sind zugeklappt: Aufgeklappt war die Liste auf dem Telefon rund
 * 13 Bildschirme lang. Im Kopf jedes Raums steht, wie viele Stationen darin
 * warten, damit sich das Aufklappen lohnt. Sobald ein Filter greift, gehen die
 * passenden Raeume von selbst auf.
 *
 * Links von aussen (`#ort-...` aus dem Lageplan, `#raum-...` von den
 * Werkstaetten) waehlen den Ort und klappen den Raum auf.
 */
export function FestivalStations({ areas }: { areas: readonly FestivalArea[] }) {
  const [venue, setVenue] = useState<VenueFilter>("alle");
  const [kind, setKind] = useState<KindFilter>("alle");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const scrollTarget = useRef<string | null>(null);

  useEffect(() => {
    const followHash = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const area = areas.find((candidate) => areaId(candidate.venue) === hash);
      if (area) {
        setVenue(area.venue);
        return;
      }
      const owner = areas.find((candidate) => candidate.rooms.some((room) => roomId(room.name) === hash));
      if (!owner) return;
      setVenue("alle");
      setKind("alle");
      scrollTarget.current = hash;
      setOpen((current) => new Set(current).add(hash));
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [areas]);

  // Erst scrollen, wenn der Raum sichtbar und aufgeklappt ist - vorher stand
  // er womoeglich unter einem anderen Ortsfilter und die Seite sprang daneben.
  // `setOpen` oben legt immer ein neues Set an, damit dieser Durchlauf sicher
  // kommt.
  useEffect(() => {
    if (!scrollTarget.current) return;
    document.getElementById(scrollTarget.current)?.scrollIntoView({ block: "start" });
    scrollTarget.current = null;
  });

  const shown = areas
    .filter((area) => venue === "alle" || area.venue === venue)
    .map((area) => ({ ...area, rooms: area.rooms.map((room) => filterRoom(room, kind)).filter((room): room is FestivalRoom => room !== null) }))
    .filter((area) => area.rooms.length);
  const stationCount = shown.flatMap((area) => area.rooms).reduce((sum, room) => sum + countOffers(room).rallye + countOffers(room).workshop, 0);
  const allRooms = shown.flatMap((area) => area.rooms.map((room) => roomId(room.name)));
  const allOpen = kind !== "alle" || allRooms.every((id) => open.has(id));

  function toggleRoom(id: string, isOpen: boolean) {
    setOpen((current) => {
      if (current.has(id) === isOpen) return current;
      const next = new Set(current);
      if (isOpen) next.add(id); else next.delete(id);
      return next;
    });
  }

  return <>
    <div className="festival-filter-bar">
      <div className="festival-filter" role="group" aria-label="Ort wählen">
        {(["alle", ...areas.map((area) => area.venue)] as VenueFilter[]).map((value) => (
          <button key={value} type="button" aria-pressed={venue === value} data-venue={value} onClick={() => setVenue(value)}>{value === "alle" ? "Alle Orte" : value}</button>
        ))}
      </div>
      <div className="festival-filter" role="group" aria-label="Art der Station">
        {kindFilters.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>
        ))}
      </div>
    </div>
    <div className="festival-filter-summary">
      <p className="festival-filter-count" aria-live="polite">{stationCount} Mitmachstationen in {allRooms.length} {allRooms.length === 1 ? "Raum" : "Räumen"}</p>
      {kind === "alle" ? <button type="button" className="text-button" onClick={() => setOpen(allOpen ? new Set() : new Set(allRooms))}>{allOpen ? "Alle zuklappen" : "Alle aufklappen"}</button> : null}
    </div>

    {shown.map((area) => (
      <section key={area.venue} className="festival-area" id={areaId(area.venue)} aria-labelledby={`${areaId(area.venue)}-title`} data-venue={area.venue}>
        <h3 id={`${areaId(area.venue)}-title`}>{area.venue}</h3>
        <p className="festival-area-intro">{area.intro}</p>
        <div className="festival-rooms">
          {area.rooms.map((room) => {
            const id = roomId(room.name);
            const counts = countOffers(room);
            return <details key={room.name} id={id} className="festival-room" open={kind !== "alle" || open.has(id)} onToggle={(event) => kind === "alle" && toggleRoom(id, event.currentTarget.open)}>
              <summary>
                <span className="festival-room-name">{room.name}{room.where ? <small>{room.where}</small> : null}</span>
                <span className="festival-room-badges">
                  {room.info ? <span className="festival-tag" data-kind="info">Infostand</span> : null}
                  {counts.rallye ? <span className="festival-tag" data-kind="rallye">{counts.rallye} Rallye</span> : null}
                  {counts.workshop ? <span className="festival-tag" data-kind="workshop">{counts.workshop} Workshop</span> : null}
                </span>
                <i aria-hidden="true">+</i>
              </summary>
              <div className="festival-room-body">
                {room.intro && kind === "alle" ? <p className="festival-room-intro">{room.intro}</p> : null}
                {room.info && kind === "alle" ? <p className="festival-room-intro"><strong>Infostand:</strong> Startpunkt der Rallye. Hier beantwortet das Festivalteam eure Fragen, und hier gibt es den Rallye-Plan.</p> : null}
                {room.providers.length ? <ul className="festival-providers">
                  {room.providers.map((provider) => (
                    <li key={provider.name}>
                      <p className="festival-provider-name">{provider.name}</p>
                      {provider.about && kind === "alle" ? <p>{provider.about}</p> : null}
                      {provider.offers?.length ? <ul className="festival-offers">
                        {provider.offers.map((offer) => (
                          <li key={offer.title}>
                            <span className="festival-tag" data-kind={offer.kind}>{offerLabels[offer.kind]}</span>
                            {offer.forKids ? <span className="festival-tag" data-kind="kinder">Kinder</span> : null}
                            <strong>{offer.title}</strong>
                            <p>{offer.text}</p>
                          </li>
                        ))}
                      </ul> : null}
                    </li>
                  ))}
                </ul> : null}
              </div>
            </details>;
          })}
        </div>
      </section>
    ))}
  </>;
}
