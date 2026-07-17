import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getSubmissionWindowStatus } from "@/lib/submission-window";

const PAGE_SIZE = 1_000;
const TIMELINE_DAYS = 30;

function getBerlinDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET(request: Request) {
  const windowStatus = getSubmissionWindowStatus();
  if (windowStatus !== "open") {
    return Response.json(
      { error: "Die oeffentliche Statistik ist nur waehrend des Weltrekordversuchs verfuegbar.", code: "outside-campaign-window" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = rateLimit(request, "repair-stats", { limit: 120, windowMs: 60 * 1_000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Statistikabfragen. Bitte versuche es gleich erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Der Statistikdienst ist noch nicht konfiguriert." }, { status: 503 });
  }

  const { count, error: countError } = await supabase
    .from("repairs")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  if (countError) {
    return Response.json({ error: "Die Statistik konnte nicht geladen werden." }, { status: 502 });
  }

  const categories: Record<string, number> = {};
  const total = count ?? 0;
  const timeline = new Map<string, number>();
  const now = new Date();

  for (let day = TIMELINE_DAYS - 1; day >= 0; day -= 1) {
    timeline.set(getBerlinDate(new Date(now.getTime() - day * 86_400_000)), 0);
  }

  for (let start = 0; start < total; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("repairs")
      .select("category, moderated_at")
      .eq("status", "approved")
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      return Response.json({ error: "Die Statistik konnte nicht geladen werden." }, { status: 502 });
    }

    for (const repair of data ?? []) {
      categories[repair.category] = (categories[repair.category] ?? 0) + 1;
      if (repair.moderated_at) {
        const day = getBerlinDate(new Date(repair.moderated_at));
        if (timeline.has(day)) {
          timeline.set(day, (timeline.get(day) ?? 0) + 1);
        }
      }
    }
  }

  return Response.json(
    { total, categories, timeline: [...timeline].map(([date, dayTotal]) => ({ date, total: dayTotal })) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
  );
}