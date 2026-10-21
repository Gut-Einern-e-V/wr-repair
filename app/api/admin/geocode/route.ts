import { requireAdmin } from "@/lib/admin-auth";
import { coarsenCoordinates } from "@/lib/geo-anonymize";
import { kreisForPoint } from "@/lib/nrw-map";

/**
 * Adresse in Koordinaten umrechnen, fuer die Strichlisten (Issue #158).
 *
 * Nominatim von OpenStreetMap ist kostenlos, verlangt aber eine erkennbare
 * Anwendung im User-Agent und hoechstens eine Anfrage pro Sekunde
 * (https://operations.osmfoundation.org/policies/nominatim/). Beides haelt
 * diese Route ein: Sie steht nur dem Team offen und wird nur auf Knopfdruck
 * gerufen. Die Adresse ist die eines Repair-Cafes - ein oeffentlicher Ort,
 * keine Person.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Reparaturrekord-NRW/1.0 (https://github.com/Gut-Einern-e-V/wr-repair)";

let lastRequestAt = 0;

export async function GET(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 300) return Response.json({ error: "Bitte eine Adresse angeben." }, { status: 400 });

  if (Date.now() - lastRequestAt < 1_000) {
    return Response.json({ error: "Bitte eine Sekunde warten und erneut suchen." }, { status: 429, headers: { "Retry-After": "1" } });
  }
  lastRequestAt = Date.now();

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "de" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return Response.json({ error: `Die Adresssuche antwortet nicht (HTTP ${response.status}). Koordinaten bitte von Hand eintragen.` }, { status: 502 });

    const results = await response.json() as { lat: string; lon: string; display_name: string }[];
    const hit = results[0];
    const point = hit ? coarsenCoordinates(Number(hit.lat), Number(hit.lon)) : null;
    if (!hit || !point) return Response.json({ error: "Keine passende Adresse gefunden." }, { status: 404 });

    return Response.json({ lat: point.lat, lon: point.lon, label: hit.display_name, kreis: kreisForPoint(point) });
  } catch {
    return Response.json({ error: "Die Adresssuche ist nicht erreichbar. Koordinaten bitte von Hand eintragen." }, { status: 502 });
  }
}
