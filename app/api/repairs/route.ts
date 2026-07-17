import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyNorthrhineWestphalia } from "@/lib/geo";
import { rateLimit } from "@/lib/rate-limit";
import { getConfiguredSubmissionWindow } from "@/lib/campaign-settings";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 200 * 1024;

const categoryValues = new Set([
  "electrical_appliances",
  "household_appliances",
  "computers_and_communication",
  "bicycles",
  "furniture",
  "textiles_and_clothing",
  "tools",
  "toys_and_leisure",
  "other",
]);

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

export async function POST(request: Request) {
  if ((await getConfiguredSubmissionWindow()).status !== "open") {
    return errorResponse("Einreichungen sind derzeit nicht geoeffnet.", 403);
  }

  const geoCheck = verifyNorthrhineWestphalia(request);
  if (!geoCheck.allowed) {
    return errorResponse(
      geoCheck.reason === "outside-nrw"
        ? "Einreichungen sind nur aus Nordrhein-Westfalen moeglich."
        : "Dein Standort konnte nicht eindeutig Nordrhein-Westfalen zugeordnet werden. Bitte deaktiviere VPN oder Proxy und versuche es erneut.",
      403,
    );
  }

  const limit = rateLimit(request, "repair-submission", { limit: 3, windowMs: 15 * 60 * 1_000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Einreichungsversuche. Bitte versuche es spaeter erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const formData = await request.formData();
  const category = formData.get("category");
  const description = formData.get("description");
  const consent = formData.get("consent");
  const image = formData.get("image");
  const captchaToken = formData.get("frc-captcha-response");
  const repairSucceeded = formData.get("repair_succeeded") !== "false";
  const answers = Object.fromEntries(
    [...formData.entries()]
      .flatMap(([key, value]) => (
        key.startsWith("answer_") && typeof value === "string" && value.trim()
          ? [[key.slice("answer_".length), value.trim()]]
          : []
      )),
  );

  if (typeof category !== "string" || !categoryValues.has(category)) {
    return errorResponse("Bitte waehle eine gueltige Kategorie.", 400);
  }

  if (typeof description !== "string" || !description.trim() || description.length > 2_000) {
    return errorResponse("Bitte beschreibe deine Reparatur in maximal 2.000 Zeichen.", 400);
  }

  if (consent !== "true") {
    return errorResponse("Die Zustimmung zur Veroeffentlichung ist erforderlich.", 400);
  }

  if (!(image instanceof File) || image.size === 0) {
    return errorResponse("Bitte waehle ein Bild aus.", 400);
  }

  if (!(image.type in imageExtensions)) {
    return errorResponse("Erlaubt sind JPG, PNG und WebP.", 400);
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return errorResponse("Das Bild darf maximal 200 KB gross sein.", 400);
  }

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

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return errorResponse("Der Einreichungsdienst ist noch nicht konfiguriert.", 503);
  }

  const repairId = crypto.randomUUID();
  const imagePath = `pending/${repairId}.${imageExtensions[image.type]}`;
  const { error: uploadError } = await supabase.storage
    .from("repair-images")
    .upload(imagePath, image, { contentType: image.type, upsert: false });

  if (uploadError) {
    return errorResponse("Das Bild konnte nicht gespeichert werden. Bitte versuche es erneut.", 502);
  }

  const { error: insertError } = await supabase.from("repairs").insert({
    id: repairId,
    category,
    description: description.trim(),
    answers,
    repair_succeeded: repairSucceeded,
    image_path: imagePath,
    consent_publication: true,
    location_region: geoCheck.region,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from("repair-images").remove([imagePath]);
    return errorResponse("Die Einreichung konnte nicht gespeichert werden. Bitte versuche es erneut.", 502);
  }

  return Response.json({ id: repairId, status: "pending" }, { status: 201 });
}