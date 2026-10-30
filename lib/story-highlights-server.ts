import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readImageDimensions } from "@/lib/image-dimensions";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { highlightColumns, publicImageExtension, type HighlightRow, type HighlightStatus } from "@/lib/story-highlights";

/** Die Spalten der Reparatur, die ein Highlight mitbringt. */
const repairColumns =
  "id, category, brand_model, story, kreis, image_path, performed_by, repair_succeeded, duration_minutes, item_value_euros, entry_time, consent_publication, status";

export type HighlightRepairRow = {
  id: string;
  category: string;
  brand_model: string | null;
  story: string | null;
  kreis: string | null;
  image_path: string | null;
  performed_by: string | null;
  repair_succeeded: boolean;
  duration_minutes: number | null;
  item_value_euros: number | string | null;
  entry_time: string | null;
  consent_publication: boolean;
  status: string;
};

/** Ein Highlight samt Reparatur, so wie Moderation und Buehne es lesen. */
export type HighlightWithRepair = {
  repairId: string;
  status: HighlightStatus;
  title: string;
  teaser: string;
  body: string;
  note: string;
  sortOrder: number;
  publishedAt: string | null;
  updatedAt: string;
  repair: {
    category: string;
    categoryLabel: string;
    brandModel: string | null;
    story: string;
    kreis: string | null;
    performedBy: string | null;
    repairSucceeded: boolean;
    entryTime: string | null;
    hasImage: boolean;
    imageUrl: string | null;
  };
};

/** Signierte Adressen fuer die privaten Fotos. Die Buehne laeuft lange, daher eine eigene Gueltigkeit. */
export async function signImages(supabase: SupabaseClient, paths: (string | null)[], seconds: number) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const urls = new Map<string, string>();
  if (!unique.length) return urls;

  const { data } = await supabase.storage.from("repair-images").createSignedUrls(unique, seconds);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

/**
 * Highlights mit ihren Reparaturen laden, sortiert nach Reihenfolge.
 *
 * `statuses` grenzt ein - die Buehne will nur, was geprueft ist.
 */
export async function loadHighlights(supabase: SupabaseClient, { statuses, signSeconds }: { statuses?: HighlightStatus[]; signSeconds: number }) {
  let query = supabase.from("story_highlights").select(highlightColumns);
  if (statuses?.length) query = query.in("status", statuses);
  const { data, error } = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) return { highlights: [] as HighlightWithRepair[], error };

  const rows = (data ?? []) as unknown as HighlightRow[];
  if (!rows.length) return { highlights: [] as HighlightWithRepair[], error: null };

  const { data: repairData, error: repairError } = await supabase
    .from("repairs")
    .select(repairColumns)
    .in("id", rows.map((row) => row.repair_id));
  if (repairError) return { highlights: [] as HighlightWithRepair[], error: repairError };

  const repairs = new Map(((repairData ?? []) as unknown as HighlightRepairRow[]).map((repair) => [repair.id, repair]));
  const urls = await signImages(supabase, [...repairs.values()].map((repair) => repair.image_path), signSeconds);

  const highlights = rows.flatMap((row): HighlightWithRepair[] => {
    const repair = repairs.get(row.repair_id);
    if (!repair) return [];
    return [{
      repairId: row.repair_id,
      status: row.status,
      title: row.title,
      teaser: row.teaser,
      body: row.body,
      note: row.note,
      sortOrder: row.sort_order,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      repair: {
        category: repair.category,
        categoryLabel: repairCategoryLabel(repair.category),
        brandModel: repair.brand_model,
        story: repair.story ?? "",
        kreis: repair.kreis,
        performedBy: repair.performed_by,
        repairSucceeded: repair.repair_succeeded,
        entryTime: repair.entry_time,
        hasImage: Boolean(repair.image_path),
        imageUrl: repair.image_path ? (urls.get(repair.image_path) ?? null) : null,
      },
    }];
  });

  return { highlights, error: null };
}

/**
 * Das Foto fuer die Veroeffentlichung in den oeffentlichen Bucket kopieren.
 *
 * Das Original bleibt privat in `repair-images`. Die Masse werden dabei
 * gelesen, damit /stories das Bild ohne Springen setzen kann. Ohne Foto oder
 * bei einem Format, das der oeffentliche Bucket nicht nimmt, gibt es keine
 * Kopie - die Geschichte erscheint dann mit einem Bild der Markenbildwelt.
 */
export async function copyImageForPublication(supabase: SupabaseClient, repairId: string, imagePath: string | null) {
  if (!imagePath) return { path: null, width: null, height: null };

  const { data: file, error } = await supabase.storage.from("repair-images").download(imagePath);
  if (error || !file) throw new Error("Das Foto konnte nicht gelesen werden.");

  const extension = publicImageExtension(file.type);
  if (!extension) return { path: null, width: null, height: null };

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = readImageDimensions(buffer);
  const path = `${repairId}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("story-images").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
    cacheControl: "31536000",
  });
  if (uploadError) throw new Error("Das Foto konnte nicht veröffentlicht werden.");

  return { path, width: size?.width ?? null, height: size?.height ?? null };
}

export async function removePublishedImage(supabase: SupabaseClient, path: string | null) {
  if (path) await supabase.storage.from("story-images").remove([path]);
}
