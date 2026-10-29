"use client";

import { useState } from "react";
import { FESTIVAL_DATE_ISO } from "./festival-chrome";
import { toMinutes, useFestivalClock, type FestivalClock } from "./festival-clock";
import type { FestivalSlot, FestivalVenueName } from "./programm";

type ScheduleFilter = "alle" | FestivalVenueName | "kinder";

const filters: readonly [ScheduleFilter, string][] = [
  ["alle", "Alles"],
  ["Utopiastadt", "Utopiastadt"],
  ["Wiesenwerke", "Wiesenwerke"],
  ["Nordbahntrasse", "Trasse"],
  ["kinder", "Für Kinder"],
];

function slotKey(slot: FestivalSlot) {
  return `${slot.start}-${slot.title}-${slot.venue}`;
}

function isRunning(slot: FestivalSlot, minutes: number) {
  return toMinutes(slot.start) <= minutes && minutes < toMinutes(slot.end);
}

/**
 * "Jetzt & gleich" ganz oben auf der Seite.
 *
 * Vor dem Festival zaehlt der Kasten die Tage, am Festivaltag zeigt er, was
 * gerade laeuft und was als Naechstes beginnt, danach bedankt er sich. Wer auf
 * dem Gelaende aufs Telefon schaut, will genau das wissen - nicht den ganzen
 * Tagesplan.
 */
export function FestivalNow({ schedule }: { schedule: readonly FestivalSlot[] }) {
  const clock = useFestivalClock();
  return <aside className="festival-now" aria-live="polite" aria-label="Jetzt beim Festival">
    <NowContent clock={clock} schedule={schedule} />
  </aside>;
}

function NowContent({ clock, schedule }: { clock: FestivalClock | null; schedule: readonly FestivalSlot[] }) {
  if (!clock || clock.phase === "before") {
    const label = !clock ? "Samstag, 11 bis 17 Uhr" : clock.daysLeft === 1 ? "Morgen geht’s los" : `Noch ${clock.daysLeft} Tage`;
    return <>
      <p className="festival-now-label">{label}</p>
      <p className="festival-now-lead">Zum Auftakt:</p>
      <NowList slots={schedule.filter((slot) => slot.start === schedule[0].start && slot.venue === "Utopiastadt")} />
    </>;
  }

  if (clock.phase === "after" || clock.minutes >= toMinutes("17:00")) {
    return <>
      <p className="festival-now-label">Danke fürs Kommen!</p>
      <p className="festival-now-lead">Das Festival ist vorbei. Wie viele Reparaturen es geworden sind, steht in der Bilanz.</p>
      <p className="festival-now-links"><a href="/stats">Zur Bilanz <span aria-hidden="true">&#8594;</span></a></p>
    </>;
  }

  const running = schedule.filter((slot) => isRunning(slot, clock.minutes));
  const next = schedule.filter((slot) => toMinutes(slot.start) > clock.minutes).slice(0, 2);
  return <>
    <p className="festival-now-label"><span className="festival-live-dot" aria-hidden="true" />{clock.minutes < toMinutes("11:00") ? "Heute ab 11 Uhr" : "Jetzt beim Festival"}</p>
    {running.length ? <>
      <p className="festival-now-lead">Läuft gerade:</p>
      <NowList slots={running.slice(0, 3)} />
      {running.length > 3 ? <p className="festival-now-links"><a href="#zeitplan">und {running.length - 3} weitere im Zeitplan <span aria-hidden="true">&#8595;</span></a></p> : null}
    </> : <p className="festival-now-lead">Gerade kein Bühnenprogramm – ReparaturCafé XXL und Rallye laufen den ganzen Tag.</p>}
    {next.length ? <>
      <p className="festival-now-lead">Gleich:</p>
      <NowList slots={next} />
    </> : null}
  </>;
}

function NowList({ slots }: { slots: readonly FestivalSlot[] }) {
  return <ul className="festival-now-list">
    {slots.map((slot) => (
      <li key={slotKey(slot)}>
        <time dateTime={`${FESTIVAL_DATE_ISO}T${slot.start}`}>{slot.start}</time>
        <span><strong>{slot.title}</strong><small>{slot.venue} · {slot.room}</small></span>
      </li>
    ))}
  </ul>;
}

/**
 * Der Zeitplan als kompakte Liste mit Filtern.
 *
 * Jede Zeile zeigt Uhrzeit, Titel und Ort; wer mitmacht und worum es geht,
 * steht beim Aufklappen. Am Festivaltag ist markiert, was gerade laeuft, und
 * was vorbei ist, tritt zurueck.
 */
export function FestivalSchedule({ schedule }: { schedule: readonly FestivalSlot[] }) {
  const clock = useFestivalClock();
  const [filter, setFilter] = useState<ScheduleFilter>("alle");
  const [showPast, setShowPast] = useState(false);
  const today = clock?.phase === "day";
  const isPast = (slot: FestivalSlot) => today && toMinutes(slot.end) <= clock.minutes;
  const matching = schedule.filter((slot) => filter === "alle" || (filter === "kinder" ? slot.forKids : slot.venue === filter));
  // Am Festivaltag tritt Vorbeigegangenes zurueck: Wer aufs Telefon schaut,
  // soll zuerst sehen, was noch kommt.
  const pastCount = matching.filter(isPast).length;
  const visible = showPast ? matching : matching.filter((slot) => !isPast(slot));

  return <>
    <div className="festival-filter" role="group" aria-label="Zeitplan filtern">
      {filters.map(([value, label]) => (
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
      ))}
    </div>
    <div className="festival-filter-summary">
      <p className="festival-filter-count" aria-live="polite">{visible.length} {visible.length === 1 ? "Programmpunkt" : "Programmpunkte"}{pastCount && !showPast ? `, ${pastCount} schon vorbei` : ""}</p>
      {pastCount ? <button type="button" className="text-button" onClick={() => setShowPast(!showPast)}>{showPast ? "Vorbei ausblenden" : "Vorbei anzeigen"}</button> : null}
    </div>
    <ol className="festival-schedule">
      {visible.map((slot) => {
        const running = today && isRunning(slot, clock.minutes);
        const past = isPast(slot);
        return <li key={slotKey(slot)} className={running ? "is-running" : past ? "is-past" : undefined}>
          <details>
            <summary>
              <span className="festival-schedule-time"><time dateTime={`${FESTIVAL_DATE_ISO}T${slot.start}`}>{slot.start}</time><span className="festival-schedule-end">&ndash;<time dateTime={`${FESTIVAL_DATE_ISO}T${slot.end}`}>{slot.end}</time></span></span>
              <span className="festival-schedule-title">
                {running ? <span className="festival-tag" data-kind="live">Läuft</span> : null}
                {slot.forKids ? <span className="festival-tag" data-kind="kinder">Kinder</span> : null}
                <strong>{slot.title}</strong>
              </span>
              <span className="festival-schedule-place" data-venue={slot.venue}>{slot.venue}<small>{slot.room}</small></span>
              <i aria-hidden="true">+</i>
            </summary>
            <div className="festival-schedule-more">
              <p className="festival-schedule-span">{slot.start}–{slot.end} Uhr · {slot.venue}, {slot.room}</p>
              {slot.by ? <p className="festival-schedule-by">{slot.by}</p> : null}
              <p>{slot.text}</p>
            </div>
          </details>
        </li>;
      })}
    </ol>
  </>;
}
