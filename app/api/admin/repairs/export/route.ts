import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1_000;
const MAX_EXPORT_ROWS = 20_000;

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll("\"", "\"\"")}"`;
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await supabase
    .from("repairs")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return Response.json({ error: "Der Export konnte nicht vorbereitet werden." }, { status: 502 });
  }

  if ((count ?? 0) > MAX_EXPORT_ROWS) {
    return Response.json(
      { error: `Der Export ist auf ${MAX_EXPORT_ROWS.toLocaleString("de-DE")} Einreichungen begrenzt. Bitte erstelle einen gefilterten Export.` },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const repairs: Array<{
    id: string;
    category: string;
    product_name: string | null;
    context: string | null;
    description: string | null;
    answers: Record<string, string> | null;
    repair_succeeded: boolean;
    consent_publication: boolean;
    status: string;
    location_region: string | null;
    moderator_comment: string | null;
    created_at: string;
    moderated_at: string | null;
  }> = [];

  for (let start = 0; start < MAX_EXPORT_ROWS; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("repairs")
      .select("id, category, product_name, context, description, answers, repair_succeeded, consent_publication, status, location_region, moderator_comment, created_at, moderated_at")
      .order("created_at", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      return Response.json({ error: "Der Export konnte nicht erstellt werden." }, { status: 502 });
    }

    repairs.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  const columns = ["id", "category", "product_name", "context", "description", "answers", "repair_succeeded", "consent_publication", "status", "location_region", "moderator_comment", "created_at", "moderated_at"];
  const rows = repairs.map((repair) => [
    repair.id,
    repair.category,
    repair.product_name,
    repair.context,
    repair.description,
    repair.answers ? JSON.stringify(repair.answers) : "",
    repair.repair_succeeded,
    repair.consent_publication,
    repair.status,
    repair.location_region,
    repair.moderator_comment,
    repair.created_at,
    repair.moderated_at,
  ].map(escapeCsv).join(";"));
  const csv = `\ufeff${columns.map(escapeCsv).join(";")}\r\n${rows.join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename=repair-export.csv",
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}