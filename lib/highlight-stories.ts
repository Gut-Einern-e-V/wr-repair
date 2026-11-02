import "server-only";
import { repairCategoryLabel } from "./repair-catalog";
import type { Story, StoryBlock } from "./stories";
import { highlightColumns, type HighlightRow } from "./story-highlights";
import { createSupabaseAdminClient } from "./supabase/server";

/**
 * Veroeffentlichte Highlights als Reparaturgeschichten fuer /stories.
 *
 * Neben den Markdown-Dateien die zweite Quelle: Die Moderation gibt eine
 * Geschichte im Highlight-Eimer frei, ohne Commit und Deploy. Die Route setzt
 * dabei /stories neu auf (app/api/moderation/highlights/[repairId]/route.ts).
 */

/** Lesbarer Pfad mit eindeutigem Rest aus der Reparatur-ID. */
export function highlightSlug(title: string, repairId: string) {
  const base = title
    .toLocaleLowerCase("de")
    .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base || "reparatur"}-${repairId.slice(0, 8)}`;
}

/** Lesezeit wie in den Markdown-Dateien: "2 min", nie unter einer Minute. */
export function readingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

export function toHighlightStory(
  row: HighlightRow,
  repair: { category: string; image_alt_text: string | null; entry_time: string | null },
  publicImageUrl: (path: string) => string,
): Story {
  const blocks: StoryBlock[] = row.body.split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean)
    .map((content) => ({ type: "paragraph", content: content.replace(/\r?\n/g, " ") }));
  const hasImage = row.public_image_path && row.public_image_width && row.public_image_height;

  return {
    slug: highlightSlug(row.title, row.repair_id),
    title: row.title,
    summary: row.teaser,
    category: repairCategoryLabel(repair.category),
    date: (row.published_at ?? repair.entry_time ?? new Date().toISOString()).slice(0, 10),
    readingTime: readingTime(row.body),
    image: hasImage
      ? {
        src: publicImageUrl(row.public_image_path!),
        alt: repair.image_alt_text?.trim() || `Foto zur Reparatur: ${row.title}`,
        width: row.public_image_width!,
        height: row.public_image_height!,
        caption: null,
        credit: "Eingereicht beim Reparaturrekord NRW",
      }
      : null,
    blocks: blocks.length ? blocks : [{ type: "paragraph", content: row.teaser }],
  };
}

/**
 * Laedt die veroeffentlichten Highlights. Ohne Zugangsdaten (Tests, lokaler
 * Build ohne .env) oder bei einem Datenbankfehler bleibt es bei den
 * Markdown-Geschichten - /stories darf daran nicht scheitern.
 */
export async function getHighlightStories(): Promise<Story[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("story_highlights").select(highlightColumns).eq("status", "published");
    if (error || !data?.length) return [];
    const rows = data as unknown as HighlightRow[];

    const { data: repairs } = await supabase
      .from("repairs")
      .select("id, category, image_alt_text, entry_time, status, consent_publication")
      .in("id", rows.map((row) => row.repair_id));
    const byId = new Map((repairs ?? []).map((repair) => [repair.id as string, repair]));

    return rows.flatMap((row) => {
      const repair = byId.get(row.repair_id);
      // Zurueckgezogene Freigabe oder Zustimmung schlaegt das Highlight.
      if (!repair || repair.status !== "approved" || !repair.consent_publication) return [];
      return [toHighlightStory(row, repair, (path) => `${supabaseUrl}/storage/v1/object/public/story-images/${path}`)];
    });
  } catch {
    return [];
  }
}
