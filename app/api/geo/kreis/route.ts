import { anonymizeRequestOrigin, isAnonymizedPoint } from "@/lib/geo-anonymize";
import { kreisForPoint } from "@/lib/nrw-map";
import { rateLimit } from "@/lib/rate-limit";

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
export async function GET(request: Request) {
  const limit = rateLimit(request, "geo-kreis", { limit: 30, windowMs: 60 * 1_000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Standortabfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const params = new URL(request.url).searchParams;
  const rawLat = Number.parseFloat(params.get("lat") ?? "");
  const rawLon = Number.parseFloat(params.get("lon") ?? "");

  const point = isAnonymizedPoint(rawLat, rawLon)
    ? { lat: rawLat, lon: rawLon }
    : anonymizeRequestOrigin(request);

  if (!point) {
    return Response.json({ kreis: null, lat: null, lon: null });
  }

  return Response.json({ kreis: kreisForPoint(point), lat: point.lat, lon: point.lon });
}
