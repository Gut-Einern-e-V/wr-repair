import Link from "next/link";

type CampaignWindowNoticeProps = {
  status: "before" | "after" | "invalid" | "unknown";
  startAt: string | null;
};

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeStyle: "short" });

/* Die Uhr steht im gelben Hero-Kasten (<HeroCountdown />). Dieser Abschnitt
   erklaert stattdessen, worum es beim Rekordversuch geht, und fuehrt weiter zur
   Projektseite - zwei Countdowns auf einer Seite waren redundant. */
export function CampaignWindowNotice({ status, startAt }: CampaignWindowNoticeProps) {
  const startTime = startAt ? new Date(startAt).valueOf() : Number.NaN;
  const hasStart = status === "before" && !Number.isNaN(startTime);

  const heading = status === "after"
    ? "Der Einreichungszeitraum ist beendet."
    : hasStart
      ? "Der Rekord startet bald."
      : "Der Einreichungszeitraum wird vorbereitet.";

  return <section className="campaign-window" id="campaign-window" aria-labelledby="campaign-window-title">
    <p className="section-index">Weltrekordversuch NRW</p>
    <h2 id="campaign-window-title">{heading}</h2>
    <p>
      Die Idee ist einfach: Einen Monat lang zählt Nordrhein-Westfalen jede Reparatur, die einen Gegenstand im Alltag
      hält &ndash; geschraubt, genäht und geklebt wird in Repair Cafés, Werkstätten, Schulen, Vereinen und am
      Küchentisch. Wer mitmacht, fotografiert die Reparatur und beantwortet ein paar Fragen. Nach der Prüfung zählt
      der Beitrag für den Rekord.
    </p>
    <p>
      {status === "after"
        ? "Danke an alle Menschen, die Reparatur sichtbar gemacht haben. Die veröffentlichten Geschichten bleiben Teil des Projekts."
        : hasStart
          ? <>Einreichungen öffnen am <time dateTime={startAt ?? undefined}>{dateFormat.format(new Date(startTime))} Uhr</time>. Bis dahin lohnt ein Blick hinter das Projekt.</>
          : "Der genaue Zeitraum wird gerade eingerichtet. Bis dahin kannst du das Projekt, die beteiligten Organisationen und die ersten Reparaturgeschichten entdecken."}
    </p>
    <p className="campaign-window-links">
      <Link href="/about">Mehr über das Projekt <span aria-hidden="true">&#8594;</span></Link>
      <Link href="/stories">Geschichten lesen <span aria-hidden="true">&#8594;</span></Link>
      <Link href="/supporters">Unterstützung kennenlernen <span aria-hidden="true">&#8594;</span></Link>
    </p>
  </section>;
}
