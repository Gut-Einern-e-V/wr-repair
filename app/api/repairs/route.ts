import { createSupabaseAdminClient } from "@/lib/supabase/server";

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

function isSubmissionWindowOpen() {
  const startAt = new Date(process.env.SUBMISSION_START_AT ?? "");
  const endAt = new Date(process.env.SUBMISSION_END_AT ?? "");

  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf()) || startAt >= endAt) {
    return false;
  }

  const now = new Date();
  return now >= startAt && now <= endAt;
}

export async function POST(request: Request) {
  if (!isSubmissionWindowOpen()) {
    return errorResponse("Einreichungen sind derzeit nicht geoeffnet.", 403);
  }

  const formData = await request.formData();
  const category = formData.get("category");
  const description = formData.get("description");
  const consent = formData.get("consent");
  const image = formData.get("image");
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
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from("repair-images").remove([imagePath]);
    return errorResponse("Die Einreichung konnte nicht gespeichert werden. Bitte versuche es erneut.", 502);
  }

  return Response.json({ id: repairId, status: "pending" }, { status: 201 });
}