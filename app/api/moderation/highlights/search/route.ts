import { repairCategoryLabel, repairCategoryValues } from "@/lib/repair-catalog";
import { searchRepairs, type HighlightStatus, type SearchableRepair } from "@/lib/story-highlights";
import { signImages } from "@/lib/story-highlights-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireHighlightAccess } from "../access";

const PAGE = 1000;
const MAX_ROWS = 20000;
const RESULT_LIMIT = 60;
const categories = new Set(repairCategoryValues as string[]);

type Row = SearchableRepair & { performed_by: string | null; repair_succeeded: boolean };

/**
 * Freigegebene Reparaturen mit Text und Zustimmung durchsuchen - die
 * Fundgrube fuer neue Highlights.
 *
 * PostgREST liefert hoechstens 1000 Zeilen je Abfrage, deshalb seitenweise.
 * Es sind nur die Zeilen mit Geschichte, die meisten Reparaturen haben keine.
 */
export async function GET(request: Request) {
  const access = await requireHighlightAccess();
  if (!access.ok) return access.response;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const category = params.get("category") ?? "";
  const kreis = (params.get("kreis") ?? "").trim().slice(0, 80);
  const withImage = params.get("withImage") === "1";
  const minLength = Math.min(Math.max(Number.parseInt(params.get("minLength") ?? "0", 10) || 0, 0), 2000);
  const sort = params.get("sort") === "newest" ? "newest" as const : "longest" as const;
  if (category && !categories.has(category)) return Response.json({ error: "Ungültige Kategorie." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("repairs")
      .select("id, category, brand_model, story, kreis, image_path, entry_time, performed_by, repair_succeeded")
      .eq("status", "approved")
      .eq("consent_publication", true)
      .not("story", "is", null)
      .neq("story", "")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return Response.json({ error: "Reparaturen konnten nicht geladen werden." }, { status: 502 });
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }

  const matches = searchRepairs(rows, { q, category, kreis, withImage, minLength, sort });
  const shown = matches.slice(0, RESULT_LIMIT);

  const { data: highlightData } = await supabase.from("story_highlights").select("repair_id, status").in("repair_id", shown.map((row) => row.id));
  const inBucket = new Map((highlightData ?? []).map((row) => [row.repair_id as string, row.status as HighlightStatus]));
  const urls = await signImages(supabase, shown.map((row) => row.image_path), 900);
  const kreise = [...new Set(rows.map((row) => row.kreis).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "de"));

  return Response.json({
    total: matches.length,
    withText: rows.length,
    kreise,
    results: shown.map((row) => ({
      id: row.id,
      categoryLabel: repairCategoryLabel(row.category),
      brandModel: row.brand_model,
      story: row.story,
      kreis: row.kreis,
      performedBy: row.performed_by,
      repairSucceeded: row.repair_succeeded,
      entryTime: row.entry_time,
      imageUrl: row.image_path ? (urls.get(row.image_path) ?? null) : null,
      highlightStatus: inBucket.get(row.id) ?? null,
    })),
  });
}
