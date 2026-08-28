/**
 * Herkunftspruefung einer Einreichung.
 *
 * Zwei Fragen werden hier beantwortet, und es lohnt sich, sie
 * auseinanderzuhalten:
 *
 * 1. Darf diese Einreichung ueberhaupt angenommen werden? Der Rekordversuch
 *    zaehlt Reparaturen aus einem Gebiet, und eine Einreichung von weit
 *    ausserhalb gehoert nicht in die Zaehlung.
 * 2. Wie belastbar ist die Ortsangabe? Das entscheidet nicht dieser Code,
 *    sondern die Moderation - hier wird nur zusammengetragen, was sie dafuer
 *    braucht.
 *
 * Bewusst *weich* geblockt wird nur, wenn die Herkunft eindeutig ausserhalb
 * liegt und nichts dagegen spricht. Fehlende Geo-Header (lokale Entwicklung,
 * Betrieb ausserhalb von Vercel) sind kein Beleg fuer "ausserhalb" und fuehren
 * nie zu einer Absage - sonst waere ein fehlkonfigurierter Proxy in der Lage,
 * die gesamte Aktion abzuschalten.
 *
 * Ebenso hebt eine ausdrueckliche Ortsangabe im Formular das IP-Urteil auf:
 * Wer im Bergischen repariert und den Eintrag abends aus dem Zug tippt, soll
 * nicht ausgesperrt werden. Der Widerspruch geht dann als origin_source und
 * origin_ip_region an die Moderation, die ihn sieht und entscheidet.
 */

import { anonymizeRequestOrigin, isAnonymizedPoint, type AnonymizedPoint } from "./geo-anonymize";
import { isWithinRegion, verifyRegion } from "./geo";
import { kreisForPoint } from "./nrw-map";
import type { RegionConfig } from "./region-config";

/** Woher die Ortsangabe stammt, absteigend nach Beweiskraft. */
export type OriginSource = "photo" | "gps" | "manual" | "ip";

const originSources = new Set<OriginSource>(["photo", "gps", "manual", "ip"]);

export type OriginDecision = {
  /** False heisst: freundlich absagen, nichts speichern. */
  allowed: boolean;
  /**
   * Die anonymisierte Zelle - aber nur, wenn sie im Gebiet liegt. Ein Punkt
   * ausserhalb wird verworfen statt gespeichert: `dashboard_stats()` liefert
   * jede Zelle an die Buehnenkarte aus, und ein Punkt neben der Landesgrenze
   * waere dort schlicht ein Fehler.
   */
  point: AnonymizedPoint | null;
  kreis: string | null;
  /** Wert fuer `repairs.location_region`. */
  regionLabel: string | null;
  /** Wert fuer `repairs.origin_source`. */
  source: OriginSource | null;
  /** Wert fuer `repairs.origin_ip_region`, z. B. "DE-BY". */
  ipRegion: string | null;
};

/**
 * Liegt der Punkt im konfigurierten Gebiet?
 *
 * "unknown" ist ein eigener Fall und keine Verlegenheitsantwort: Ohne
 * konfigurierte Geometrie darf eine Einreichung nicht stillschweigend ihre
 * Ortsangabe verlieren. Sie wird dann behandelt wie vor dieser Pruefung.
 */
export function locateInRegion(point: AnonymizedPoint, region: RegionConfig): "inside" | "outside" | "unknown" {
  // Die Polygone in lib/nrw-map.ts beschreiben genau ein Gebiet. Ist etwas
  // anderes konfiguriert, sind sie nicht zustaendig und das Koordinatenfenster
  // uebernimmt.
  if (region.ipCountry === "DE" && region.ipRegion === "NW") {
    return kreisForPoint(point) ? "inside" : "outside";
  }
  if (region.bounds) {
    return isWithinRegion(point.lat, point.lon, region) ? "inside" : "outside";
  }
  return "unknown";
}

/** Grobe Herkunft der Verbindung als "DE-BY", oder null ohne Geo-Header. */
export function ipRegionTag(request: Request): string | null {
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");
  if (!country) return null;
  return region ? `${country}-${region}` : country;
}

/**
 * Die vom Browser mitgeschickte Ortsangabe - erst uebernommen, nachdem sie
 * verifiziert wurde. `isAnonymizedPoint` prueft, ob der Wert wirklich auf
 * einem Rasterzellpunkt liegt; genauere oder erfundene Koordinaten fallen
 * durch. Die Quellenangabe selbst laesst sich nicht pruefen und gilt deshalb
 * in der Moderation als Angabe, nicht als Beleg.
 */
function readClaimedOrigin(formData: FormData): { point: AnonymizedPoint; source: OriginSource } | null {
  const lat = Number.parseFloat(String(formData.get("origin_lat") ?? ""));
  const lon = Number.parseFloat(String(formData.get("origin_lon") ?? ""));
  if (!isAnonymizedPoint(lat, lon)) return null;

  const raw = String(formData.get("origin_source") ?? "");
  const source = originSources.has(raw as OriginSource) ? (raw as OriginSource) : "manual";
  return { point: { lat, lon }, source };
}

/**
 * Entscheidet ueber Annahme und Herkunft einer Einreichung.
 *
 * `exifPoint` ist die serverseitig aus dem Bild gelesene, bereits gerasterte
 * Koordinate. Sie wird nur gebraucht, wenn der Browser keine brauchbare
 * Angabe geschickt hat - dann ist sie die letzte Gelegenheit, eine echte
 * Reparatur aus dem Gebiet vor der Absage zu bewahren.
 */
export function decideOrigin(
  request: Request,
  formData: FormData,
  region: RegionConfig,
  exifPoint: AnonymizedPoint | null = null,
): OriginDecision {
  const ipRegion = ipRegionTag(request);
  const geoCheck = verifyRegion(request, region);
  const fromIp = anonymizeRequestOrigin(request);

  const claimed = readClaimedOrigin(formData);
  const candidates: { point: AnonymizedPoint; source: OriginSource }[] = [];
  if (claimed) candidates.push(claimed);
  if (exifPoint) candidates.push({ point: exifPoint, source: "photo" });
  if (fromIp) candidates.push({ point: fromIp, source: "ip" });

  const inside = candidates.find(({ point }) => locateInRegion(point, region) === "inside") ?? null;
  // Ohne konfigurierte Geometrie gibt es kein "inside"; dann gilt wie bisher
  // die erste brauchbare Angabe.
  const unchecked = candidates.find(({ point }) => locateInRegion(point, region) === "unknown") ?? null;
  const resolved = inside ?? unchecked;

  const allowed =
    !region.enabled ||
    geoCheck.allowed ||
    // Fehlende Header sind kein Beleg fuer "ausserhalb".
    geoCheck.reason === "unknown" ||
    // Eine Ortsangabe im Gebiet sticht das IP-Urteil.
    inside !== null;

  return {
    allowed,
    point: resolved?.point ?? null,
    kreis: resolved ? kreisForPoint(resolved.point) : null,
    // Die Herkunft gilt als bestaetigt, wenn die IP passt oder eine Ortsangabe
    // nachweislich im Gebiet liegt. Ohne beides bleibt die Spalte leer.
    regionLabel: geoCheck.allowed ? geoCheck.region : inside ? region.label : null,
    source: resolved?.source ?? null,
    ipRegion,
  };
}

/**
 * Widerspricht die Verbindung der angegebenen Herkunft?
 *
 * Kein Urteil, nur ein Hinweis fuer die Moderation: Die Einreichung wurde
 * angenommen, aber die Verbindung kam aus einer anderen Gegend als die
 * Ortsangabe behauptet.
 */
export function hasOriginMismatch(ipRegion: string | null, kreis: string | null, region: RegionConfig): boolean {
  if (!ipRegion || !kreis) return false;
  const expected = expectedIpRegionTag(region);
  return expected !== null && ipRegion !== expected;
}

/**
 * Welchen Verbindungs-Tag eine Einreichung aus dem Gebiet tragen muesste, oder
 * null, wenn gar nicht geprueft wird.
 *
 * Steht bewusst als eigene Funktion da: Dieselbe Antwort braucht auch
 * `claim_next_repair()` in der Datenbank, damit die Schnellpruefung genau die
 * Einreichungen ueberspringt, die die Konsole als "Verbindung woanders"
 * kennzeichnet (siehe supabase/migrations/202608280004_quick_review_clear_origin.sql).
 * Zwei getrennte Formeln waeren irgendwann auseinandergelaufen.
 */
export function expectedIpRegionTag(region: RegionConfig): string | null {
  if (!region.enabled) return null;
  return region.ipRegion ? `${region.ipCountry}-${region.ipRegion}` : region.ipCountry;
}
