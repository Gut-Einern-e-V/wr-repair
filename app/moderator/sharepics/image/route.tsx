import { renderSharepic } from "@/components/sharepics/render";
import { requireModerator } from "@/lib/admin-auth";
import { getSiteUrl } from "@/lib/share";
import { parseSharepicRequest } from "@/lib/sharepics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ein Sharepic als PNG im Story-Format (siehe lib/sharepics.ts).
 *
 * Nur fuer die Moderation: Die Route setzt auch eine frei waehlbare
 * Ueberschrift und Beispielzahlen in die Markengestaltung. Offen erreichbar
 * waere das ein Generator fuer echt aussehende Grafiken mit beliebigem Text.
 * Fuer alle gibt es app/sharepics/image, ohne diese Freiheiten.
 */

function readableSiteUrl(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return getSiteUrl(host ? `${protocol}://${host}` : "").replace(/^https?:\/\//, "");
}

export async function GET(request: Request) {
  const auth = await requireModerator();
  if (!auth.authorized) {
    return new Response(auth.error, { status: auth.status, headers: { "Cache-Control": "no-store" } });
  }

  return renderSharepic(parseSharepicRequest(new URL(request.url).searchParams), {
    domain: readableSiteUrl(request),
    cacheControl: "private, no-store",
  });
}
