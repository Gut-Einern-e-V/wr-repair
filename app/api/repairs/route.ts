import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { notifyModerators } from "@/lib/push";
import { verifyRegion, isWithinRegion } from "@/lib/geo";
import { type RegionConfig } from "@/lib/region-config";
import { extractExif } from "@/lib/exif";
import { anonymizeRequestOrigin, isAnonymizedPoint } from "@/lib/geo-anonymize";
import { rateLimit } from "@/lib/rate-limit";
import { getAppSettings } from "@/lib/app-settings";
import { repairCategoryValues } from "@/lib/repair-catalog";
import { kreisForPoint } from "@/lib/nrw-map";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 200 * 1024;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const validPerformedBy = new Set(["alone", "with_support", "by_someone"]);

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function verifyCaptcha(token: string) {
  const apiKey = process.env.FRIENDLY_CAPTCHA_API_KEY;
  const sitekey = process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY;
  if (!apiKey || !sitekey) {
    return { valid: false, configured: false };
  }

  try {
    const response = await fetch("https://global.frcapi.com/api/v2/captcha/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ response: token, sitekey }),
      cache: "no-store",
    });
    const result = await response.json() as { success?: boolean };
    return { valid: response.ok && result.success === true, configured: true };
  } catch {
    return { valid: false, configured: true };
  }
}

/**
 * Ermittelt die anonymisierte Herkunft einer Einreichung.
 *
 * Bevorzugt wird der Wert, den der Browser aus dem Original-EXIF gerastert
 * hat; er ist naeher am tatsaechlichen Reparaturort als die IP. Weil er aber
 * aus dem Client kommt, wird er nicht uebernommen, sondern verifiziert: Das
 * Raster ist idempotent, ein exakter Zellpunkt bleibt beim erneuten Schnappen
 * unveraendert. Genauere oder frei erfundene Koordinaten fallen damit durch.
 *
 * Ohne brauchbaren Client-Wert dient der Vercel-Geo-Header als Rueckfall. Er
 * ist ohnehin nur stadtgenau und wird durch dasselbe Raster geschickt.
 */
function resolveAnonymizedOrigin(request: Request, formData: FormData, region: RegionConfig) {
  // Ohne konfigurierte Bounds gibt es keine Regionspruefung; dann darf die
  // Herkunft nicht still wegfallen, weil isWithinRegion() in dem Fall immer
  // false liefert.
  const hasBounds = region.bounds !== null;
  const inRegion = (lat: number, lon: number) => !hasBounds || isWithinRegion(lat, lon, region);

  const rawLat = Number.parseFloat(String(formData.get("origin_lat") ?? ""));
  const rawLon = Number.parseFloat(String(formData.get("origin_lon") ?? ""));

  if (isAnonymizedPoint(rawLat, rawLon) && inRegion(rawLat, rawLon)) {
    return { lat: rawLat, lon: rawLon };
  }

  const fromIp = anonymizeRequestOrigin(request);
  if (fromIp && inRegion(fromIp.lat, fromIp.lon)) {
    return fromIp;
  }

  return null;
}

export async function POST(request: Request) {
  const settings = await getAppSettings();

  if (settings.submissionWindow.status !== "open") {
    return errorResponse("Einreichungen sind derzeit nicht geoeffnet.", 403);
  }

  const geoCheck = verifyRegion(request, settings.region);

  const limit = rateLimit(request, "repair-submission", { limit: 3, windowMs: 15 * 60 * 1_000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Einreichungsversuche. Bitte versuche es spaeter erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const formData = await request.formData();
  const category = formData.get("category");
  const brandModel = formData.get("brand_model");
  const durationMinutes = formData.get("duration_minutes");
  const itemValueEuros = formData.get("item_value_euros");
  const performedBy = formData.get("performed_by");
  const story = formData.get("story");
  const consent = formData.get("consent");
  let image = formData.get("image");
  const captchaToken = formData.get("frc-captcha-response");
  const repairSucceeded = formData.get("repair_succeeded") !== "false";

  const lotteryName = formData.get("lottery_name");
  const lotteryEmail = formData.get("lottery_email");
  const lotteryPrivacy = formData.get("lottery_privacy");
  const wantsLottery = typeof lotteryName === "string" && lotteryName.trim().length > 0
    && typeof lotteryEmail === "string" && lotteryEmail.trim().length > 0;

  if (typeof category !== "string" || !(repairCategoryValues as string[]).includes(category)) {
    return errorResponse("Bitte waehle eine gueltige Kategorie.", 400);
  }

  if (typeof performedBy !== "string" || !validPerformedBy.has(performedBy)) {
    return errorResponse("Bitte gib an, wer die Reparatur durchgefuehrt hat.", 400);
  }

  if (consent !== "true") {
    return errorResponse("Die Zustimmung zur Veroeffentlichung ist erforderlich.", 400);
  }

  if (wantsLottery && lotteryPrivacy !== "true") {
    return errorResponse("Bitte stimme der Datenschutzerklaerung fuer die Verlosung zu.", 400);
  }

  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (!(image.type in imageExtensions)) {
      return errorResponse("Erlaubt sind JPG, PNG und WebP.", 400);
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return errorResponse("Das Bild darf maximal 200 KB gross sein.", 400);
    }
  }

  if (process.env.NEXT_PUBLIC_CAPTCHA_ENABLED !== "false") {
    if (typeof captchaToken !== "string" || !captchaToken) {
      return errorResponse("Bitte bestaetige zuerst den Spam-Schutz.", 403);
    }

    const captcha = await verifyCaptcha(captchaToken);
    if (!captcha.configured) {
      return errorResponse("Der Spam-Schutz ist noch nicht konfiguriert.", 503);
    }

    if (!captcha.valid) {
      return errorResponse("Der Spam-Schutz konnte nicht bestaetigt werden. Bitte versuche es erneut.", 403);
    }
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return errorResponse("Der Einreichungsdienst ist noch nicht konfiguriert.", 503);
  }

  const repairId = crypto.randomUUID();

  // Determine location_region: IP geo first, then EXIF GPS as fallback.
  let locationRegion: string | null = geoCheck.allowed ? geoCheck.region : null;

  if (image instanceof File && image.size > 0) {
    imagePath = `pending/${repairId}.${imageExtensions[image.type]}`;

    // Extract EXIF GPS for region verification (not stored in DB).
    if (!geoCheck.allowed && image.type === "image/jpeg") {
      const buffer = await image.arrayBuffer();
      const exif = await extractExif(buffer);
      if (exif.latitude !== null && exif.longitude !== null && isWithinRegion(exif.latitude, exif.longitude, settings.region)) {
        locationRegion = settings.region.label;
      }
      // Re-create the file from the buffer so we can still upload the original bytes.
      image = new File([buffer], image.name, { type: image.type });
    }

    const { error: uploadError } = await supabase.storage
      .from("repair-images")
      .upload(imagePath, image, { contentType: image.type, upsert: false });

    if (uploadError) {
      return errorResponse("Das Bild konnte nicht gespeichert werden. Bitte versuche es erneut.", 502);
    }
  }

  const parsedDuration = durationMinutes ? parseInt(String(durationMinutes), 10) : null;
  const parsedValue = itemValueEuros ? parseFloat(String(itemValueEuros)) : null;
  const origin = resolveAnonymizedOrigin(request, formData, settings.region);
  // Einmalig aus der anonymisierten Zelle hergeleitet, statt bei jedem
  // Dashboard-Aufruf per Punkt-in-Polygon-Test neu zu berechnen.
  const kreis = origin ? kreisForPoint(origin) : null;

  const { error: insertError } = await supabase.from("repairs").insert({
    id: repairId,
    category,
    brand_model: typeof brandModel === "string" && brandModel.trim() ? brandModel.trim() : null,
    duration_minutes: parsedDuration && parsedDuration > 0 ? parsedDuration : null,
    item_value_euros: parsedValue !== null && !Number.isNaN(parsedValue) && parsedValue >= 0 ? parsedValue : null,
    performed_by: performedBy,
    story: typeof story === "string" && story.trim() ? story.trim() : null,
    repair_succeeded: repairSucceeded,
    image_path: imagePath,
    consent_publication: true,
    location_region: locationRegion,
    location_lat: origin?.lat ?? null,
    location_lon: origin?.lon ?? null,
    kreis,
    status: "pending",
  });

  if (insertError) {
    if (imagePath) {
      await supabase.storage.from("repair-images").remove([imagePath]);
    }
    return errorResponse("Die Einreichung konnte nicht gespeichert werden. Bitte versuche es erneut.", 502);
  }

  if (wantsLottery) {
    await supabase.from("lottery_entries").insert({
      repair_id: repairId,
      name: (lotteryName as string).trim(),
      email: (lotteryEmail as string).trim().toLowerCase(),
    });
  }

  /* Moderation benachrichtigen - nach der Antwort, nicht davor (Issue #43).
     `after` laeuft erst, wenn die Antwort raus ist: Wer eine Reparatur
     eintraegt, wartet nicht darauf, dass drei Push-Dienste antworten, und eine
     Einreichung scheitert nicht, weil einer davon streikt.

     Mitgeschickt wird die Zahl der offenen Einreichungen, nicht diese eine. Alle
     Nachrichten teilen im Service Worker denselben tag und ersetzen sich
     gegenseitig, daher steht in der einen sichtbaren Benachrichtigung immer der
     aktuelle Stand statt "1". */
  after(async () => {
    try {
      const { count } = await supabase
        .from("repairs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      await notifyModerators({
        title: "Neue Eintragung",
        count: count ?? 1,
        url: "/moderator",
      });
    } catch {
      // Bewusst still: Die Einreichung ist gespeichert, das ist der Vertrag mit
      // der eintragenden Person. Ein fehlgeschlagener Push aendert daran nichts.
    }
  });

  return Response.json({ id: repairId, status: "pending" }, { status: 201 });
}