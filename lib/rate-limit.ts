/**
 * Zaehlwerk fuer Anfragen je IP-Adresse.
 *
 * Bewusst im Arbeitsspeicher und damit je Serverinstanz: Ein verlaesslich
 * geteilter Zaehler braeuchte einen Datenbank-Roundtrip auf jeder Anfrage, und
 * fuer die Leseroute waere das teurer als das, was er verhindern soll. Fuer die
 * Einreichung gibt es genau deshalb den geteilten Zaehler in der Datenbank
 * (siehe `submission_gate` in lib/submission-gate.ts) - dort zaehlt jeder
 * einzelne Versuch.
 *
 * Praktisch heisst das: Die Grenze wirkt gegen einen Client, der eine Route
 * schnell hintereinander abfragt, ist aber keine harte Obergrenze fuer die
 * ganze Bereitstellung.
 */

import { isAllowlisted } from "./ip-allowlist";

type RateLimit = {
  limit: number;
  windowMs: number;
};

/**
 * Drosselung der oeffentlichen Leseroute, im Backend schaltbar (Issue #80).
 *
 * `enabled: false` ist der Normalbetrieb: Dann gelten die grosszuegigen
 * Vorgaben der Routen. Eingeschaltet gilt die engere der beiden Zahlen - eine
 * Drosselung, die eine Route lockerer macht als sie sein wollte, waere keine.
 */
export type PublicThrottle = {
  enabled: boolean;
  perMinute: number;
  /**
   * Adressen und CIDR-Praefixe, die von jeder Grenze ausgenommen sind - auch
   * von der Vorgabe der Route, nicht nur vom Schonmodus (siehe
   * lib/ip-allowlist.ts). Fuer feste Anzeigen: den Rechner am Beamer, das
   * Infodisplay im Foyer.
   */
  allowlist: string[];
};

/**
 * Standardwert der Drosselung, falls im Backend keine Zahl hinterlegt ist.
 *
 * 60 Anfragen je Minute und IP-Adresse: Das Buehnen-Dashboard fragt vier Deltas
 * je Minute ab, ein Infodisplay eine Antwort alle fuenf Minuten. Selbst ein
 * Veranstaltungs-WLAN mit einem Dutzend Zuschauern bleibt darunter, waehrend
 * eine Abfrage im Sekundentakt sofort anschlaegt.
 */
export const DEFAULT_THROTTLE_PER_MINUTE = 60;

/** Fenster der Drosselung. Eine Minute, wie alle Angaben "pro Minute". */
const THROTTLE_WINDOW_MS = 60 * 1_000;

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MAX_ENTRIES = 10_000;
const entries = new Map<string, { count: number; resetAt: number }>();

/**
 * Die Adresse, unter der gezaehlt wird.
 *
 * Exportiert, damit die Freigabeliste dieselbe Adresse prueft, auf die der
 * Zaehler schlaegt, und damit das Backend genau die Adresse anzeigen kann, die
 * eine Freigabe treffen wuerde. Liefen die auseinander, gaebe der Knopf "meine
 * Adresse eintragen" eine andere Verbindung frei als die gedrosselte.
 *
 * `"unknown"`, wenn kein Weiterleitungs-Header da ist (lokal, manche Netze).
 * Der Zaehler fasst diese Anfragen zusammen; die Freigabeliste passt darauf
 * bewusst nie (siehe lib/ip-allowlist.ts).
 *
 * Nimmt eine Kopfzeilensammlung statt einer Anfrage, weil eine Server-
 * Komponente keine Anfrage hat, sondern `headers()` aus `next/headers` - und
 * dort dieselbe Rechnung gebraucht wird.
 */
export function clientIpFromHeaders(headers: { get(name: string): string | null }) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export function getClientIp(request: Request) {
  return clientIpFromHeaders(request.headers);
}

function clearExpiredEntries(now: number) {
  for (const [key, value] of entries) {
    if (value.resetAt <= now) {
      entries.delete(key);
    }
  }
}

export function rateLimit(request: Request, namespace: string, { limit, windowMs }: RateLimit): RateLimitResult {
  const now = Date.now();
  if (entries.size >= MAX_ENTRIES) {
    clearExpiredEntries(now);
  }

  const key = `${namespace}:${getClientIp(request)}`;
  const existing = entries.get(key);
  if (!existing || existing.resetAt <= now) {
    if (entries.size >= MAX_ENTRIES) {
      return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
    }

    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)) };
}


/**
 * Grenze einer oeffentlichen Leseroute unter Beruecksichtigung der Drosselung.
 *
 * `routeLimit` ist die Vorgabe der Route selbst - die Zahl, die im
 * Normalbetrieb gilt und dokumentiert ist. Ist die Drosselung eingeschaltet,
 * gilt die kleinere der beiden Zahlen.
 */
export function publicLimit(throttle: PublicThrottle, routeLimit: number): number {
  if (!throttle.enabled) return Math.max(1, routeLimit);
  return Math.max(1, Math.min(routeLimit, throttle.perMinute));
}

/**
 * Limitpruefung einer oeffentlichen Leseroute in einem Aufruf.
 *
 * Fasst {@link publicLimit} und {@link rateLimit} zusammen, damit jede Route
 * dieselbe Rechnung macht - und damit eine neue Route nicht versehentlich ohne
 * Drosselung dasteht.
 */
export function publicRateLimit(
  request: Request,
  namespace: string,
  throttle: PublicThrottle,
  routeLimit: number,
): RateLimitResult {
  /* Freigegebene Adressen zaehlen gar nicht mit - der Rechner am Beamer soll
     nie anschlagen, und ein Zaehler, der nur nicht greift, waere trotzdem
     Speicher je Instanz. Die Pruefung steht vor dem Zaehlwerk, damit eine
     freigegebene Anzeige auch dann durchkommt, wenn die Tabelle voll ist. */
  if (isAllowlisted(getClientIp(request), throttle.allowlist)) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return rateLimit(request, namespace, { limit: publicLimit(throttle, routeLimit), windowMs: THROTTLE_WINDOW_MS });
}
