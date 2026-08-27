import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { publicLogoUrl, readSettingsRow } from "@/lib/app-settings";
import { SITE_LOGO_TAG } from "@/lib/site-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const logoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const maxLogoBytes = 1024 * 1024;

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const formData = await request.formData();
  const logo = formData.get("logo");

  if (!(logo instanceof File) || !logoTypes.has(logo.type) || logo.size === 0 || logo.size > maxLogoBytes) {
    return Response.json({ error: "Bitte waehle ein PNG, WebP, JPG oder SVG bis 1 MB." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const previous = (await readSettingsRow())?.logo_path ?? null;
  const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
  // A fresh name per upload so caches and CDNs pick the new logo up immediately.
  const logoPath = `logo-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(logoPath, logo, { contentType: logo.type, upsert: false });

  if (uploadError) {
    return Response.json({ error: "Das Logo konnte nicht hochgeladen werden. Wurde die Migration ausgefuehrt?" }, { status: 502 });
  }

  const { error } = await supabase.from("campaign_settings").upsert({
    id: true,
    logo_path: logoPath,
    updated_by: authorization.currentAdmin.user.id,
  });

  if (error) {
    await supabase.storage.from("site-assets").remove([logoPath]);
    return Response.json({ error: "Das Logo konnte nicht gespeichert werden." }, { status: 502 });
  }

  if (previous && previous !== logoPath) {
    await supabase.storage.from("site-assets").remove([previous]);
  }

  revalidateTag(SITE_LOGO_TAG, "max");
  return Response.json({ ok: true, logoUrl: publicLogoUrl(logoPath) }, { status: 201 });
}

/** Removes the uploaded logo; the site falls back to the built-in word mark. */
export async function DELETE() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const supabase = createSupabaseAdminClient();
  const previous = (await readSettingsRow())?.logo_path ?? null;

  const { error } = await supabase.from("campaign_settings").upsert({
    id: true,
    logo_path: null,
    updated_by: authorization.currentAdmin.user.id,
  });

  if (error) {
    return Response.json({ error: "Das Logo konnte nicht entfernt werden." }, { status: 502 });
  }

  if (previous) {
    await supabase.storage.from("site-assets").remove([previous]);
  }

  revalidateTag(SITE_LOGO_TAG, "max");
  return Response.json({ ok: true, logoUrl: null });
}
