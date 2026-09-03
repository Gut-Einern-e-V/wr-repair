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

import { anonymizeRequestOrigin, isCoarsePoint, type AnonymizedPoint } from "./geo-anonymize";
import { isWithinRegion, verifyRegion } from "./geo";
import { kreisForPoint } from "./nrw-map";
import type { RegionConfig } from "./region-config";

/** Woher die Ortsangabe stammt, absteigend nach Beweiskraft. */
export type OriginSource = "photo" | "gps" | "manual" | "ip";

const originSources = new Set<OriginSource>(["photo", "gps", "manual", "ip"]);

/**
 * Reihenfolge, in der die Signale gesammelt und angezeigt werden - absteigend
 * nach Beweiskraft, dieselbe Ordnung wie in {@link OriginSource}.
 */
const signalOrder: OriginSource[] = ["photo", "gps", "manual", "ip"];

/**
 * Ein einzelnes Herkunftssignal (Issue #87).
 *
 * Bis hierher gab es je Einreichung genau *eine* Ortsangabe: die mit der
 * hoechsten Beweiskraft, die im Gebiet lag. Fuer die Moderation war das zu
 * wenig. Wer ein Foto aus Bayern hochlaedt und im Formular "Wuppertal"
 * anklickt, sieht in der Konsole genau aus wie jemand aus Wuppertal - Karte
 * und Koordinaten zeigen den ausgewaehlten Kreis, und der Vercel-Header war
 * das einzige Gegenzeugnis.
 *
 * Jedes Signal ist bereits anonymisiert, bevor es hier ankommt: Foto und
 * Standortabfrage mit dem Zufallsversatz aus dem Browser, die Kreis-Auswahl
 * mit einer Streuung ueber den Kreis, die IP-Herkunft mit demselben Versatz
 * auf dem Server. Kein Signal ist genauer als die eine Angabe, die vorher
 * schon gespeichert wurde.
 */
export type OriginSignal = {
  source: OriginSource;
  lat: number;
  lon: number;
  /** Kreis, in dem der Punkt liegt. Null heisst: ausserhalb des Gebiets. */
  kreis: string | null;
};

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
  /**
   * Wert fuer `repairs.origin_signals` - alle erhobenen Herkunftssignale.
   *
   * Absichtlich leer, solange sich die Signale einig sind: Wenn Foto,
   * Standortabfrage, Kreis-Auswahl und Verbindung denselben Kreis nennen, ist
   * die Entscheidung klar, und die zusaetzlichen Punkte waeren nur mehr
   * gespeicherte Standortdaten ohne Erkenntnisgewinn (Issue #87). Erst der
   * Widerspruch ist die Information, und erst dann wird er aufgehoben.
   */
  signals: OriginSignal[];
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
 * geprueft wurde. `isCoarsePoint` laesst nur Werte durch, die auf ~110 m
 * gerundet sind; eine rohe GPS-Koordinate faellt damit durch.
 *
 * Diese Pruefung ist schwaecher als die frueher hier stehende: Solange auf ein
 * Raster geschnappt wurde, liess sich nachrechnen, ob ein Wert wirklich aus
 * der Anonymisierung stammt. Mit dem Zufallsversatz geht das nicht mehr (siehe
 * Modulkopf von lib/geo-anonymize.ts). Auch die Quellenangabe laesst sich
 * nicht pruefen und gilt in der Moderation als Angabe, nicht als Beleg.
 */
function readClaimedOrigin(formData: FormData): { point: AnonymizedPoint; source: OriginSource } | null {
  const lat = Number.parseFloat(String(formData.get("origin_lat") ?? ""));
  const lon = Number.parseFloat(String(formData.get("origin_lon") ?? ""));
  if (!isCoarsePoint(lat, lon)) return null;

  const raw = String(formData.get("origin_source") ?? "");
  const source = originSources.has(raw as OriginSource) ? (raw as OriginSource) : "manual";
  return { point: { lat, lon }, source };
}

/**
 * Die Herkunftssignale, die der Browser mitgeschickt hat.
 *
 * Format: ein JSON-Objekt `{"photo": {"lat": .., "lon": ..}, "gps": {...}}`.
 * Jeder Punkt wird einzeln geprueft - `isCoarsePoint` laesst nur Werte durch,
 * die auf ~110 m gerundet sind, genau wie bei der Hauptangabe. Was durchfaellt,
 * wird verworfen und nicht etwa die ganze Einreichung.
 *
 * Die Quellenangabe bleibt eine Angabe: Ein selbst gebauter Aufruf kann jeden
 * Punkt unter jedem Namen schicken. Fuer die Moderation ist das kein Problem,
 * solange es so benannt ist - sie liest Signale als Aussagen der Einreichung,
 * nicht als Messwerte. Die eine Ausnahme ist "ip": Diesen Punkt setzt
 * {@link decideOrigin} immer selbst aus den Vercel-Headern, ein mitgeschickter
 * wird ueberschrieben.
 */
function readClaimedSignals(formData: FormData): Map<OriginSource, AnonymizedPoint> {
  const signals = new Map<OriginSource, AnonymizedPoint>();

  const raw = formData.get("origin_signals");
  if (typeof raw !== "string" || !raw) return signals;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return signals;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return signals;

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!originSources.has(key as OriginSource)) continue;
    if (!value || typeof value !== "object") continue;
    const { lat, lon } = value as { lat?: unknown; lon?: unknown };
    if (!isCoarsePoint(lat, lon)) continue;
    signals.set(key as OriginSource, { lat: lat as number, lon: lon as number });
  }

  return signals;
}

/**
 * Widersprechen sich die Signale?
 *
 * Der Massstab ist der Kreis und nicht der Punkt: Zwei Signale aus derselben
 * Stadt liegen wegen des Zufallsversatzes nie exakt aufeinander, meinen aber
 * dasselbe. Ein Punkt ausserhalb des Gebiets hat keinen Kreis und zaehlt als
 * eigener Wert - genau der Fall aus Issue #87, in dem jemand von ausserhalb
 * einen Kreis innerhalb auswaehlt.
 */
export function signalsDisagree(signals: OriginSignal[], region: RegionConfig): boolean {
  if (signals.length < 2) return false;

  /* Ohne Kreis - also ausserhalb des Landes oder in einem Gebiet ohne
     Kreis-Polygone - tritt an seine Stelle das Urteil von locateInRegion. Der
     Praefix ist ein Zeichen, das in keinem Kreisnamen vorkommt: Sonst faende
     ein Kreis namens "outside" hier seinen Zwilling. */
  const seen = new Set(signals.map((signal) => signal.kreis ?? `\u0000${locateInRegion(signal, region)}`));
  return seen.size > 1;
}

/**
 * Entscheidet ueber Annahme und Herkunft einer Einreichung.
 *
 * `exifPoint` ist die serverseitig aus dem Bild gelesene, bereits
 * anonymisierte Koordinate. Sie wird nur gebraucht, wenn der Browser keine brauchbare
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

  /* Alle Signale zusammentragen, nicht nur das eine, das am Ende gewinnt
     (Issue #87). Reihenfolge der Quellen ist dabei egal - jede Quelle kommt
     genau einmal vor, und was der Browser als "ip" schickt, ersetzt der
     Serverwert: Die Verbindung ist das einzige Signal, das wir selbst messen
     koennen. Ebenso ersetzt eine serverseitig aus dem Bild gelesene
     Koordinate die vom Browser behauptete Fotoherkunft. */
  const claimedSignals = readClaimedSignals(formData);
  if (claimed && !claimedSignals.has(claimed.source)) claimedSignals.set(claimed.source, claimed.point);
  if (exifPoint) claimedSignals.set("photo", exifPoint);
  if (fromIp) claimedSignals.set("ip", fromIp);

  const signals: OriginSignal[] = signalOrder
    .filter((source) => claimedSignals.has(source))
    .map((source) => {
      const point = claimedSignals.get(source)!;
      return { source, lat: point.lat, lon: point.lon, kreis: kreisForPoint(point) };
    });

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
    // Nur bei Widerspruch, siehe OriginDecision.signals.
    signals: signalsDisagree(signals, region) ? signals : [],
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
