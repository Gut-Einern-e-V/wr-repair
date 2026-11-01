import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { fitLogo, type LogoType } from "@/lib/fit-logo";
import { PARTNERS_TAG } from "@/lib/partners";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const logoTypes = new Set<string>(["image/png", "image/jpeg", "image/webp", "image/svg+xml"] satisfies LogoType[]);
const maxLogoBytes = 1024 * 1024;

function validWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("partners").select("id, name, website_url, logo_path, sort_order").order("sort_order").order("created_at");
  if (error) return Response.json({ error: "Partner konnten nicht geladen werden. Wurde die Migration ausgeführt?" }, { status: 502 });

  /* Mit Logo, damit die Liste im Backend dieselbe Reihenfolge zeigt wie die
     Seite - beim Sortieren erkennt man ein Logo schneller als einen Namen
     (Issue #98). */
  return Response.json({
    partners: (data ?? []).map((partner) => ({
      ...partner,
      logoUrl: partner.logo_path
        ? supabase.storage.from("partner-logos").getPublicUrl(partner.logo_path).data.publicUrl
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const formData = await request.formData();
  const name = formData.get("name");
  const websiteUrl = formData.get("websiteUrl");
  const logo = formData.get("logo");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || typeof websiteUrl !== "string" || !validWebsite(websiteUrl) || !(logo instanceof File) || !logoTypes.has(logo.type) || logo.size === 0 || logo.size > maxLogoBytes) {
    return Response.json({ error: "Name, Link und ein transparentes PNG, WebP, JPG oder SVG bis 1 MB sind erforderlich." }, { status: 400 });
  }

  /* Zu grosse Raster-Logos werden verkleinert (lib/fit-logo.ts, Issue #174). */
  const logoData = await fitLogo(Buffer.from(await logo.arrayBuffer()), logo.type as LogoType);
  if (!logoData) return Response.json({ error: "Das Logo lässt sich nicht lesen. Bitte als PNG, WebP, JPG oder SVG neu exportieren." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const partnerId = crypto.randomUUID();
  const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
  const logoPath = `${partnerId}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("partner-logos").upload(logoPath, logoData, {
    contentType: logo.type,
    upsert: false,
    /* Ein Jahr: Jeder Upload bekommt eine neue UUID als Namen, unter einem
       Namen aendert sich die Datei also nie. Das Logo steht in jedem Footer. */
    cacheControl: "31536000",
  });
  if (uploadError) return Response.json({ error: "Das Logo konnte nicht gespeichert werden." }, { status: 502 });

  /* Ein neues Logo stellt sich hinten an (Issue #118). Mit der Voreinstellung
     0 landete es vor allen, die schon einmal sortiert und dabei ab 0
     durchnummeriert worden waren - also meist an zweiter Stelle. */
  const { data: last } = await supabase.from("partners").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const highest = Number(last?.sort_order ?? -1);
  const sortOrder = Number.isFinite(highest) ? highest + 1 : 0;

  const { error } = await supabase.from("partners").insert({ id: partnerId, name: name.trim(), website_url: websiteUrl, logo_path: logoPath, sort_order: sortOrder });
  if (error) {
    await supabase.storage.from("partner-logos").remove([logoPath]);
    return Response.json({ error: "Der Partner konnte nicht gespeichert werden." }, { status: 502 });
  }
  revalidateTag(PARTNERS_TAG, "max");
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Partner fehlt." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { data: partner } = await supabase.from("partners").select("logo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return Response.json({ error: "Der Partner konnte nicht entfernt werden." }, { status: 502 });
  if (partner?.logo_path) await supabase.storage.from("partner-logos").remove([partner.logo_path]);
  revalidateTag(PARTNERS_TAG, "max");
  return Response.json({ ok: true });
}
