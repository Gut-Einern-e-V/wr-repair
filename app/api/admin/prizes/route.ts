import { requireSuperadmin } from "@/lib/admin-auth";
import { readPrizes } from "@/lib/lottery-store";
import { publicPrizeLogoUrl } from "@/lib/prize-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Die Preise des Gewinnspiels pflegen (Issue #45).
 *
 * Sie werden gestiftet und stehen oft erst kurz vor dem Start fest - deshalb
 * eine Verwaltung im Backend und keine Liste im Quelltext. Nur Superadmins:
 * Ein Preis ist eine oeffentliche Zusage, und wer sie geben darf, ist dieselbe
 * kleine Gruppe, die auch die Ziehung ausloest.
 */

const logoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const maxLogoBytes = 1024 * 1024;
const sponsorKinds = new Set(["organisation", "person"]);

function validWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

type PrizeFields = {
  title: string;
  description: string | null;
  sponsor_name: string | null;
  sponsor_kind: string;
  sponsor_website: string | null;
  quantity: number;
  is_main: boolean;
  sort_order: number;
};

/**
 * Die Angaben aus dem Formular pruefen.
 *
 * FormData statt JSON, weil das Logo mitkommt - dieselbe Form wie bei den
 * Partnerlogos. Alles ausser dem Titel ist freiwillig: Ein Preis, dessen
 * Stifter noch nicht genannt werden moechte, muss sich trotzdem eintragen
 * lassen.
 */
function readFields(form: FormData): { fields: PrizeFields } | { error: string } {
  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 160) {
    return { error: "Der Titel des Preises darf nicht leer sein und hoechstens 160 Zeichen haben." };
  }

  const description = String(form.get("description") ?? "").trim();
  if (description.length > 600) {
    return { error: "Die Beschreibung darf hoechstens 600 Zeichen haben." };
  }

  const sponsorName = String(form.get("sponsorName") ?? "").trim();
  if (sponsorName.length > 160) {
    return { error: "Der Name der stiftenden Stelle darf hoechstens 160 Zeichen haben." };
  }

  const sponsorKind = String(form.get("sponsorKind") ?? "organisation").trim();
  if (!sponsorKinds.has(sponsorKind)) {
    return { error: "Gestiftet wird entweder von einer Organisation oder von einer Person." };
  }

  const sponsorWebsite = String(form.get("sponsorWebsite") ?? "").trim();
  if (sponsorWebsite && !validWebsite(sponsorWebsite)) {
    return { error: "Die Website der stiftenden Stelle muss mit http:// oder https:// beginnen." };
  }

  const quantity = Number.parseInt(String(form.get("quantity") ?? "1"), 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { error: "Die Anzahl muss eine ganze Zahl zwischen 1 und 999 sein." };
  }

  const sortOrder = Number.parseInt(String(form.get("sortOrder") ?? "0"), 10);
  if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 10_000) {
    return { error: "Die Reihenfolge muss eine ganze Zahl sein." };
  }

  return {
    fields: {
      title,
      description: description || null,
      sponsor_name: sponsorName || null,
      sponsor_kind: sponsorKind,
      sponsor_website: sponsorWebsite || null,
      quantity,
      is_main: String(form.get("isMain") ?? "") === "true",
      sort_order: sortOrder,
    },
  };
}

async function storeLogo(supabase: ReturnType<typeof createSupabaseAdminClient>, prizeId: string, logo: File) {
  if (!logoTypes.has(logo.type) || logo.size === 0 || logo.size > maxLogoBytes) {
    return { path: null, error: "Das Logo muss ein PNG, WebP, JPG oder SVG bis 1 MB sein." };
  }

  const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${prizeId}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("prize-logos").upload(path, logo, { contentType: logo.type, upsert: false });
  if (error) return { path: null, error: "Das Logo konnte nicht gespeichert werden." };
  return { path, error: null };
}

export async function GET() {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const { rows, error } = await readPrizes(createSupabaseAdminClient());
  if (!rows) {
    return Response.json({ error: "Die Preise konnten nicht geladen werden. Wurde die Migration ausgefuehrt?", detail: error?.message }, { status: 502 });
  }

  return Response.json({ prizes: rows.map((prize) => ({ ...prize, logoUrl: publicPrizeLogoUrl(prize.logo_path) })) });
}

export async function POST(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const form = await request.formData();
  const parsed = readFields(form);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const prizeId = crypto.randomUUID();
  const logo = form.get("logo");
  let logoPath: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    const stored = await storeLogo(supabase, prizeId, logo);
    if (!stored.path) return Response.json({ error: stored.error }, { status: 400 });
    logoPath = stored.path;
  }

  const { error } = await supabase.from("lottery_prizes").insert({ id: prizeId, ...parsed.fields, logo_path: logoPath });
  if (error) {
    // Ohne Zeile hat das Logo keinen Besitzer mehr - es waere sonst eine Datei,
    // die niemand je wiederfindet.
    if (logoPath) await supabase.storage.from("prize-logos").remove([logoPath]);
    return Response.json({ error: "Der Preis konnte nicht gespeichert werden. Wurde die Migration ausgefuehrt?" }, { status: 502 });
  }

  return Response.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const form = await request.formData();
  const prizeId = String(form.get("id") ?? "");
  if (!prizeId) return Response.json({ error: "Es fehlt, welcher Preis gemeint ist." }, { status: 400 });

  const parsed = readFields(form);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("lottery_prizes")
    .select("id, logo_path")
    .eq("id", prizeId)
    .maybeSingle();

  if (readError) return Response.json({ error: "Der Preis konnte nicht gelesen werden." }, { status: 502 });
  if (!existing) return Response.json({ error: "Diesen Preis gibt es nicht (mehr)." }, { status: 404 });

  const logo = form.get("logo");
  let logoPath = existing.logo_path as string | null;
  let replaced: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    const stored = await storeLogo(supabase, prizeId, logo);
    if (!stored.path) return Response.json({ error: stored.error }, { status: 400 });
    replaced = logoPath;
    logoPath = stored.path;
  }

  const { error } = await supabase.from("lottery_prizes").update({ ...parsed.fields, logo_path: logoPath }).eq("id", prizeId);
  if (error) {
    if (replaced !== null && logoPath) await supabase.storage.from("prize-logos").remove([logoPath]);
    return Response.json({ error: "Der Preis konnte nicht gespeichert werden." }, { status: 502 });
  }

  // Erst wenn die neue Adresse in der Zeile steht, darf die alte Datei weg.
  if (replaced) await supabase.storage.from("prize-logos").remove([replaced]);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const prizeId = new URL(request.url).searchParams.get("id");
  if (!prizeId) return Response.json({ error: "Es fehlt, welcher Preis gemeint ist." }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  /* Ein Preis, auf den schon gezogen wurde, verschwindet nicht: Sonst stuende
     ein Gewinn ohne Gegenstand in der Liste, und niemand wuesste mehr, was
     dieser Person zugesagt wurde. Die Datenbank verhindert es ohnehin
     (`on delete restrict`) - hier steht der Satz dazu. */
  const { count, error: countError } = await supabase
    .from("lottery_entries")
    .select("id", { count: "exact", head: true })
    .eq("prize_id", prizeId);

  if (countError) return Response.json({ error: "Der Preis konnte nicht geprueft werden." }, { status: 502 });
  if ((count ?? 0) > 0) {
    return Response.json({ error: "Auf diesen Preis wurde bereits gezogen. Nimm zuerst die Ziehung zurueck." }, { status: 409 });
  }

  const { data: prize } = await supabase.from("lottery_prizes").select("logo_path").eq("id", prizeId).maybeSingle();
  const { error } = await supabase.from("lottery_prizes").delete().eq("id", prizeId);
  if (error) return Response.json({ error: "Der Preis konnte nicht entfernt werden." }, { status: 502 });

  if (prize?.logo_path) await supabase.storage.from("prize-logos").remove([prize.logo_path as string]);
  return Response.json({ ok: true });
}
