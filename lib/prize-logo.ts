/**
 * Oeffentliche Adresse eines Sponsorenlogos (Issue #45).
 *
 * Eigene Datei, damit sowohl der Server (Routen, Seiten) als auch die
 * Verwaltung dieselbe Regel nutzen, ohne dass eine von ihnen den ganzen
 * Verlosungsspeicher mitzieht.
 */
export function publicPrizeLogoUrl(logoPath: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!logoPath || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/prize-logos/${logoPath}`;
}
