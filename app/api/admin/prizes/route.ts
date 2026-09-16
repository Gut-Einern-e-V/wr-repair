import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import { readPrizes } from "@/lib/lottery-store";
import { isPrizeListBinding, prizeQuantityRefusal, prizeRemovalRefusal } from "@/lib/prize-list";
import { publicPrizeLogoUrl, publicPrizePhotoUrl } from "@/lib/prize-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Die Preise des Gewinnspiels pflegen (Issues #45, #98, #99).
 *
 * Sie werden gestiftet und stehen oft erst kurz vor dem Start fest - deshalb
 * eine Verwaltung im Backend und keine Liste im Quelltext.
 *
 * Seit Issue #99 duerfen Admins das und nicht nur Superadmins: Ein Preis kommt
 * waehrend der Aktion herein, oft telefonisch, und muss gleich eingetragen
 * werden koennen. Die Ziehung bleibt Superadmin-Sache - sie ist der Teil, den
 * niemand zuruecknehmen kann, ohne dass es auffaellt.
 *
 * Die Reihenfolge steht nicht mehr in diesem Formular, sondern hinter zwei
 * Pfeilen je Preis (siehe order/route.ts). Ein neuer Preis stellt sich hinten
 * an: Wer einen eintraegt, will nicht, dass er die schon sortierte Liste
 * durcheinanderbringt.
 *
 * In eine Richtung ist die Pflege seit Issue #110 zu: Ab dem Start der
 * Teilnahme laesst sich ein Preis nicht mehr entfernen und seine Anzahl nicht
 * mehr verringern. Die Teilnahmebedingungen sagen das zu, und eine Zusage,
 * die nur auf der oeffentlichen Seite steht und im Backend von der Sorgfalt
 * der pflegenden Person abhaengt, ist im Zweifel keine. Hinzufuegen,
 * beschreiben, bebildern und die Anzahl erhoehen bleibt jederzeit moeglich -
 * das ist fuer Teilnehmende nie ein Nachteil.
 */

const logoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
/* Ein Foto ist ein Foto - ein SVG waere hier keines, und Fremdinhalt in einer
   Datei, die der Browser als Dokument ausfuehrt, hat auf einer oeffentlichen
   Seite nichts zu suchen. */
const photoTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImageBytes = 1024 * 1024;
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
};

/**
 * Die Angaben aus dem Formular pruefen.
 *
 * FormData statt JSON, weil Logo und Foto mitkommen - dieselbe Form wie bei
 * den Partnerlogos. Alles ausser dem Titel ist freiwillig: Ein Preis, dessen
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

  return {
    fields: {
      title,
      description: description || null,
      sponsor_name: sponsorName || null,
      sponsor_kind: sponsorKind,
      sponsor_website: sponsorWebsite || null,
      quantity,
      is_main: String(form.get("isMain") ?? "") === "true",
    },
  };
}

type Slot = { bucket: "prize-logos" | "prize-photos"; field: "logo" | "photo"; column: "logo_path" | "image_path"; types: Set<string>; label: string };

/* Logo und Foto laufen durch denselben Ablauf, nur in verschiedene Eimer.
   Zweimal derselbe Code waere zwei Stellen, an denen die Groessengrenze steht
   - und beim naechsten Mal stimmt eine von beiden nicht mehr. */
const slots: Slot[] = [
  { bucket: "prize-logos", field: "logo", column: "logo_path", types: logoTypes, label: "Das Logo muss ein PNG, WebP, JPG oder SVG bis 1 MB sein." },
  { bucket: "prize-photos", field: "photo", column: "image_path", types: photoTypes, label: "Das Foto muss ein PNG, WebP oder JPG bis 1 MB sein." },
];

async function storeImage(supabase: ReturnType<typeof createSupabaseAdminClient>, slot: Slot, prizeId: string, file: File) {
  if (!slot.types.has(file.type) || file.size === 0 || file.size > maxImageBytes) {
    return { path: null, error: slot.label };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${prizeId}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(slot.bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { path: null, error: `${slot.field === "logo" ? "Das Logo" : "Das Foto"} konnte nicht gespeichert werden.` };
  return { path, error: null };
}

/**
 * Wo der neue Preis in seiner Gruppe landet: hinten.
 *
 * Hauptpreise und kleine Preise sind zwei Listen (`is_main desc, sort_order`),
 * jede mit eigener Zaehlung.
 */
async function nextSortOrder(supabase: ReturnType<typeof createSupabaseAdminClient>, isMain: boolean) {
  const { data } = await supabase
    .from("lottery_prizes")
    .select("sort_order")
    .eq("is_main", isMain)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const highest = Number(data?.sort_order ?? -1);
  return Number.isFinite(highest) ? highest + 1 : 0;
}

/**
 * Bindet die veroeffentlichte Preisliste bereits?
 *
 * Der Zeitraum kommt aus den Einstellungen und nicht aus der Umgebung: Wer
 * ihn im Backend verschiebt, verschiebt damit auch den Tag, ab dem die Liste
 * steht - beides muss dieselbe Angabe sein.
 */
async function prizeListBinds() {
  const { submissionWindow } = await getAppSettings();
  return isPrizeListBinding(submissionWindow);
}

/* Die Gewinnspielseite liegt fuenf Minuten im Zwischenspeicher (siehe
   app/gewinnspiel/page.tsx). Wer einen Preis eintraegt, schaut aber sofort
   nach, ob er dort steht - und hielt den alten Stand fuer einen Fehler
   (Issue #99). */
function refreshPublicPage() {
  revalidatePath("/gewinnspiel");
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const { rows, error } = await readPrizes(createSupabaseAdminClient());
  if (!rows) {
    return Response.json({ error: "Die Preise konnten nicht geladen werden. Wurde die Migration ausgefuehrt?", detail: error?.message }, { status: 502 });
  }

  return Response.json({
    /* Damit das Formular den Zustand zeigen kann, statt ihn erst beim
       abgelehnten Klick zu verraten (Issue #110). */
    binding: await prizeListBinds(),
    prizes: rows.map((prize) => ({
      ...prize,
      logoUrl: publicPrizeLogoUrl(prize.logo_path),
      photoUrl: publicPrizePhotoUrl(prize.image_path),
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
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
  const paths: Partial<Record<Slot["column"], string | null>> = {};
  const uploaded: { bucket: Slot["bucket"]; path: string }[] = [];

  for (const slot of slots) {
    const file = form.get(slot.field);
    if (!(file instanceof File) || file.size === 0) continue;

    const stored = await storeImage(supabase, slot, prizeId, file);
    if (!stored.path) {
      // Was schon oben liegt, gehoert niemandem mehr, wenn die Zeile ausfaellt.
      for (const done of uploaded) await supabase.storage.from(done.bucket).remove([done.path]);
      return Response.json({ error: stored.error }, { status: 400 });
    }
    paths[slot.column] = stored.path;
    uploaded.push({ bucket: slot.bucket, path: stored.path });
  }

  const sortOrder = await nextSortOrder(supabase, parsed.fields.is_main);
  const { error } = await supabase.from("lottery_prizes").insert({ id: prizeId, ...parsed.fields, ...paths, sort_order: sortOrder });
  if (error) {
    for (const done of uploaded) await supabase.storage.from(done.bucket).remove([done.path]);
    return Response.json({ error: "Der Preis konnte nicht gespeichert werden. Wurde die Migration ausgefuehrt?", detail: error.message }, { status: 502 });
  }

  refreshPublicPage();
  return Response.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();
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
    .select("id, logo_path, image_path, quantity")
    .eq("id", prizeId)
    .maybeSingle();

  if (readError) return Response.json({ error: "Der Preis konnte nicht gelesen werden." }, { status: 502 });
  if (!existing) return Response.json({ error: "Diesen Preis gibt es nicht (mehr)." }, { status: 404 });

  /* Titel, Beschreibung und Bilder bleiben aenderbar - ein Tippfehler muss
     sich korrigieren lassen. Die Anzahl ist etwas anderes: Sie zu verringern
     nimmt Gewinne aus einer Liste, auf die sich schon jemand verlassen hat
     (Issue #110). */
  const quantityRefusal = prizeQuantityRefusal(await prizeListBinds(), Number(existing.quantity ?? 0), parsed.fields.quantity);
  if (quantityRefusal) return Response.json({ error: quantityRefusal }, { status: 409 });

  const paths: Partial<Record<Slot["column"], string | null>> = {};
  /* Dateien, die nach dem Speichern weg koennen: die ersetzten und die
     ausdruecklich entfernten. Geloescht wird erst, wenn die Zeile steht. */
  const obsolete: { bucket: Slot["bucket"]; path: string }[] = [];
  const added: { bucket: Slot["bucket"]; path: string }[] = [];

  for (const slot of slots) {
    const current = (existing as Record<string, unknown>)[slot.column] as string | null;
    const file = form.get(slot.field);
    const remove = String(form.get(`remove-${slot.field}`) ?? "") === "true";

    if (file instanceof File && file.size > 0) {
      const stored = await storeImage(supabase, slot, prizeId, file);
      if (!stored.path) {
        for (const done of added) await supabase.storage.from(done.bucket).remove([done.path]);
        return Response.json({ error: stored.error }, { status: 400 });
      }
      paths[slot.column] = stored.path;
      added.push({ bucket: slot.bucket, path: stored.path });
      if (current) obsolete.push({ bucket: slot.bucket, path: current });
      continue;
    }

    if (remove && current) {
      paths[slot.column] = null;
      obsolete.push({ bucket: slot.bucket, path: current });
    }
  }

  const { error } = await supabase.from("lottery_prizes").update({ ...parsed.fields, ...paths }).eq("id", prizeId);
  if (error) {
    for (const done of added) await supabase.storage.from(done.bucket).remove([done.path]);
    return Response.json({ error: "Der Preis konnte nicht gespeichert werden.", detail: error.message }, { status: 502 });
  }

  // Erst wenn die neue Adresse in der Zeile steht, darf die alte Datei weg.
  for (const done of obsolete) await supabase.storage.from(done.bucket).remove([done.path]);

  refreshPublicPage();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const prizeId = new URL(request.url).searchParams.get("id");
  if (!prizeId) return Response.json({ error: "Es fehlt, welcher Preis gemeint ist." }, { status: 400 });

  const removalRefusal = prizeRemovalRefusal(await prizeListBinds());
  if (removalRefusal) return Response.json({ error: removalRefusal }, { status: 409 });

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

  const { data: prize } = await supabase.from("lottery_prizes").select("logo_path, image_path").eq("id", prizeId).maybeSingle();
  const { error } = await supabase.from("lottery_prizes").delete().eq("id", prizeId);
  if (error) return Response.json({ error: "Der Preis konnte nicht entfernt werden." }, { status: 502 });

  if (prize?.logo_path) await supabase.storage.from("prize-logos").remove([prize.logo_path as string]);
  if (prize?.image_path) await supabase.storage.from("prize-photos").remove([prize.image_path as string]);

  refreshPublicPage();
  return Response.json({ ok: true });
}
