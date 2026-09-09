/**
 * Oeffentliche Adressen der Bilder an einem Preis (Issues #45 und #99).
 *
 * Eigene Datei, damit sowohl der Server (Routen, Seiten) als auch die
 * Verwaltung dieselbe Regel nutzen, ohne dass eine von ihnen den ganzen
 * Verlosungsspeicher mitzieht.
 *
 * Zwei Bilder, zwei Eimer: Das Logo gehoert der stiftenden Organisation und
 * ist meist ein SVG, das Foto zeigt den Gewinn selbst. Ein Preis kann beides
 * haben, eines von beiden oder keines.
 */
function publicUrl(bucket: string, path: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function publicPrizeLogoUrl(logoPath: string | null) {
  return publicUrl("prize-logos", logoPath);
}

export function publicPrizePhotoUrl(imagePath: string | null) {
  return publicUrl("prize-photos", imagePath);
}
