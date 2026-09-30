import { renderSharepic } from "@/components/sharepics/render";
import { nrwKreiseList } from "@/lib/nrw-kreise-list";
import { getSiteUrl } from "@/lib/share";
import { parsePublicSharepicRequest, publicSharepicQuery } from "@/lib/sharepics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const kreise = nrwKreiseList.map((kreis) => kreis.name);

/**
 * Ein Sharepic fuer alle, ohne Anmeldung.
 *
 * Zeichnet nur, was ohnehin oeffentlich ist: die Live-Zahlen aus
 * `/api/stats` in den festen Motiven. Eigene Ueberschrift, Beispielzahlen und
 * freie Meilensteine gibt es nur in der Moderation
 * (siehe `parsePublicSharepicRequest`).
 *
 * Ein Bild zu zeichnen kostet den Server spuerbar Zeit. Deshalb haelt der
 * CDN-Cache jedes Bild fuenf Minuten, und jede andere Schreibweise der Adresse
 * wird auf die kanonische umgeleitet - sonst liesse sich der Cache mit einem
 * angehaengten Zufallswert umgehen. Die Zeile "Stand: ..." auf dem Bild sagt
 * weiterhin, wann es gezeichnet wurde.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sharepic = parsePublicSharepicRequest(url.searchParams, kreise);
  const canonical = publicSharepicQuery(sharepic);

  if (url.searchParams.toString() !== canonical) {
    return Response.redirect(new URL(`${url.pathname}?${canonical}`, url), 308);
  }

  return renderSharepic(sharepic, {
    /* Nie aus Host-Kopfzeilen: Das Bild liegt im geteilten Cache, eine
       untergeschobene Domain stuende dann bei allen darauf. */
    domain: getSiteUrl(url.origin).replace(/^https?:\/\//, ""),
    cacheControl: "public, s-maxage=300, stale-while-revalidate=600",
  });
}
