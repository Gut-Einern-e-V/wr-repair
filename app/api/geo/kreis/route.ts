import { anonymizeRequestOrigin, isCoarsePoint } from "@/lib/geo-anonymize";
import { kreisForPoint } from "@/lib/nrw-map";
import { getAppSettings } from "@/lib/app-settings";
import { publicRateLimit } from "@/lib/rate-limit";

/**
 * Loest einen bereits anonymisierten Punkt (Foto-EXIF oder Standortabfrage)
 * oder - ohne Parameter - die IP-Herkunft in einen Kreisnamen auf.
 *
 * Rein informativ fuers Formular: zeigt dem einreichenden Menschen, welcher
 * Kreis erkannt wurde bzw. welcher aus der IP vorgeschlagen wuerde, bevor
 * ueberhaupt etwas eingereicht ist. Die eigentliche Einreichung validiert die
 * Herkunft ohnehin unabhaengig davon erneut (siehe app/api/repairs/route.ts).
 * Die Kreis-Polygone bleiben dadurch serverseitig - das oeffentliche Formular
 * muss sie nicht laden (siehe lib/nrw-kreise-list.ts).
 */
/**
 * Anfragen je Minute und IP-Adresse im Normalbetrieb.
 *
 * Grosszuegig, weil sich das Limit auf die IP-Adresse bezieht und bei einer
 * Veranstaltung alle Geraete hinter derselben stecken. Mit den alten 30 pro
 * Minute fiel der Kreis-Vorschlag im Formular schon bei einem Dutzend Menschen
 * im gleichen WLAN aus (Issue #64). Die Auskunft rechnet nur ein Polygon nach
 * und liest nichts, was schuetzenswert waere.
 */
const GEO_LIMIT_PER_MINUTE = 300;

export async function GET(request: Request) {
  /* Im Schonmodus gilt die engere Grenze aus dem Backend (Issue #80). Diese
     Route liegt im Einreichungsweg - wer sie drosselt, drosselt den
     Kreis-Vorschlag im Formular, nicht die Einreichung selbst. */
  const { publicThrottle } = await getAppSettings();
  const limit = publicRateLimit(request, "geo-kreis", publicThrottle, GEO_LIMIT_PER_MINUTE);
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Standortabfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const params = new URL(request.url).searchParams;
  const rawLat = Number.parseFloat(params.get("lat") ?? "");
  const rawLon = Number.parseFloat(params.get("lon") ?? "");

  // Der Punkt wird hier nicht erneut anonymisiert: Der Browser hat das bereits
  // getan, und ein zweiter Versatz wuerde ihn ein weiteres Mal verschieben -
  // dann nennte diese Auskunft womoeglich einen anderen Kreis als den, der
  // spaeter an der Einreichung steht.
  const point = isCoarsePoint(rawLat, rawLon)
    ? { lat: rawLat, lon: rawLon }
    : anonymizeRequestOrigin(request);

  if (!point) {
    return Response.json({ kreis: null, lat: null, lon: null });
  }

  return Response.json({ kreis: kreisForPoint(point), lat: point.lat, lon: point.lon });
}
