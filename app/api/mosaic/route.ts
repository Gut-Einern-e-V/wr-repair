import { getAppSettings } from "@/lib/app-settings";
import { MOSAIC_MAX_TILES, type MosaicPayload } from "@/lib/mosaic";
import { publicRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Gueltigkeit der signierten Bildadressen. Muss deutlich laenger sein als
 * {@link CACHE_SECONDS}: Sonst liefert der Zwischenspeicher am Ende seiner
 * Zeit Adressen aus, die schon abgelaufen sind, und die Wand bleibt leer.
 */
const SIGNED_URL_SECONDS = 3_600;

/** Wie lange dieselbe Antwort wiederverwendet wird - im Prozess und am Rand. */
const CACHE_SECONDS = 600;

/**
 * Anfragen je Minute und IP-Adresse. Grosszuegig, weil die teure Arbeit im
 * Zwischenspeicher liegt und ein Treffer nichts kostet.
 */
const MOSAIC_LIMIT_PER_MINUTE = 120;

/**
 * Fertige Antwort samt Ablauf. Ein Modulwert, kein Nutzerzustand: Alle
 * Besucher*innen sehen dieselbe Wand, und genau darum darf sie geteilt werden.
 *
 * Der Zwischenspeicher am Rand (`s-maxage`) reicht dafuer nicht allein - eine
 * frisch gestartete Instanz oder eine Vorschau ohne CDN wuerde sonst fuer
 * jeden Aufruf vierzig Adressen neu signieren.
 */
let cached: { payload: MosaicPayload; expiresAt: number } | null = null;

export async function GET(request: Request) {
  const { publicThrottle } = await getAppSettings();
  const limit = publicRateLimit(request, "mosaic", publicThrottle, MOSAIC_LIMIT_PER_MINUTE);
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Abfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (cached && cached.expiresAt > Date.now()) {
    return respond(cached.payload);
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Die Bilderwand ist noch nicht konfiguriert." }, { status: 503 });
  }

  const [{ count: total, error: totalError }, { count: withImage, error: withImageError }] = await Promise.all([
    supabase.from("repairs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("repairs").select("id", { count: "exact", head: true }).eq("status", "approved").not("image_path", "is", null),
  ]);

  if (totalError || withImageError) {
    return Response.json({ error: "Die Bilderwand konnte nicht geladen werden." }, { status: 502 });
  }

  const { data: repairs, error } = await supabase
    .from("repairs")
    .select("id, category, image_alt_text, image_path")
    .eq("status", "approved")
    .not("image_path", "is", null)
    .order("moderated_at", { ascending: false })
    .limit(MOSAIC_MAX_TILES);

  if (error) {
    return Response.json({ error: "Die Bilderwand konnte nicht geladen werden." }, { status: 502 });
  }

  const paths = (repairs ?? []).map((repair) => repair.image_path as string);
  const { data: signedUrls, error: urlError } = paths.length
    ? await supabase.storage.from("repair-images").createSignedUrls(paths, SIGNED_URL_SECONDS)
    : { data: [], error: null };

  if (urlError) {
    return Response.json({ error: "Die Bilder der Wand konnten nicht geladen werden." }, { status: 502 });
  }

  const urls = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
  const payload: MosaicPayload = {
    total: total ?? 0,
    withImage: withImage ?? 0,
    /* Eine Kachel ohne Adresse waere ein Loch im Raster - lieber eine Kachel
       weniger als ein kaputtes Bild. */
    tiles: (repairs ?? []).flatMap((repair) => {
      const imageUrl = urls.get(repair.image_path as string);
      if (!imageUrl) return [];
      return [{
        id: repair.id,
        category: repair.category,
        imageUrl,
        /* Ohne gepflegten Alternativtext bleibt das Attribut leer: Die Wand
           ist dann Schmuck, und "Foto einer Reparatur" vierzigmal
           vorgelesen hilft niemandem. */
        alt: repair.image_alt_text ?? "",
      }];
    }),
  };

  cached = { payload, expiresAt: Date.now() + CACHE_SECONDS * 1_000 };
  return respond(payload);
}

function respond(payload: MosaicPayload) {
  return Response.json(payload, {
    headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 3}` },
  });
}
