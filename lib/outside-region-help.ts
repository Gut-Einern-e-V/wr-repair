/**
 * Die Absage fuer Einreichungen von ausserhalb des Gebiets.
 *
 * Eine Absage ist der schlechteste Moment, um jemanden mit einer Fehlermeldung
 * abzuspeisen: Da steht ein Mensch, der gerade etwas repariert hat und das
 * auch noch eintragen wollte. Deshalb sagt diese Antwort zuerst danke, erklaert
 * dann die Regel und verweist zuletzt auf die Reparatur-Initiativen in der
 * eigenen Gegend - so genau, wie die Verbindung es hergibt.
 *
 * Der Link ist bewusst kein fester Verweis auf die NRW-Terminliste. Wer in
 * Muenchen sitzt, hat von NRW-Terminen nichts.
 */

import { NETWORK_EVENTS, WORLD_MAP, cityEventsUrl } from "./repair-cafes";

export type OutsideRegionHelp = {
  headline: string;
  message: string;
  hint: string;
  linkLabel: string;
  href: string;
};

/**
 * Stadt aus dem Vercel-Geo-Header. Der Wert ist prozentkodiert, damit auch
 * Umlaute durch den Header passen; ein kaputter Wert darf die Absage nicht
 * zum Absturz bringen.
 */
export function ipCity(request: Request): string | null {
  const raw = request.headers.get("x-vercel-ip-city");
  if (!raw) return null;
  try {
    const city = decodeURIComponent(raw).trim();
    return city || null;
  } catch {
    return raw.trim() || null;
  }
}

/**
 * Baut die Absage samt passendem Verweis.
 *
 * Drei Stufen, je nachdem was ueber die Verbindung bekannt ist:
 * Stadt in Deutschland -> Terminsuche fuer genau diese Stadt,
 * Deutschland ohne Stadt -> Terminsuche des Netzwerks,
 * ausserhalb Deutschlands -> Weltkarte der Repair-Café-Bewegung.
 *
 * `provinceId` waere die naheliegende mittlere Stufe, wird aber bewusst nicht
 * geraten: Von den Bundesland-IDs des Netzwerks ist nur `10` fuer NRW geprueft
 * (siehe lib/repair-cafes.ts). Die Freitextsuche deckt Orte und Postleitzahlen
 * ohnehin ab.
 */
export function outsideRegionHelp(request: Request, regionLabel: string): OutsideRegionHelp {
  const country = request.headers.get("x-vercel-ip-country");
  const city = ipCity(request);

  const headline = "Danke, dass du mitmachen willst!";
  const hint = `Du hast in ${regionLabel} repariert und bist nur gerade woanders? Dann wähle unten deinen Kreis aus oder lade ein Foto mit Ortsangabe hoch – dann zählt die Reparatur mit.`;

  if (country === "DE" && city) {
    return {
      headline,
      message: `Der Rekordversuch zählt nur Reparaturen aus ${regionLabel}, und deine Verbindung sieht nach ${city} aus. Auch dort gibt es Reparatur-Initiativen, die sich über dich freuen – vielleicht schlagt ihr uns ja demnächst.`,
      hint,
      linkLabel: `Reparatur-Initiativen in ${city} finden`,
      href: cityEventsUrl(city),
    };
  }

  if (country === "DE") {
    return {
      headline,
      message: `Der Rekordversuch zählt nur Reparaturen aus ${regionLabel}, und deine Verbindung kommt von außerhalb. In deiner Gegend gibt es aber Reparatur-Initiativen, die sich über dich freuen – vielleicht schlagt ihr uns ja demnächst.`,
      hint,
      linkLabel: "Reparatur-Initiative in deiner Nähe finden",
      href: NETWORK_EVENTS,
    };
  }

  return {
    headline,
    message: `Der Rekordversuch zählt nur Reparaturen aus ${regionLabel}, und deine Verbindung kommt von außerhalb. Repariert wird zum Glück überall – die Weltkarte der Repair-Café-Bewegung zeigt dir, wo es bei dir in der Nähe losgeht.`,
    hint,
    linkLabel: "Repair Café auf der Weltkarte suchen",
    href: WORLD_MAP,
  };
}
