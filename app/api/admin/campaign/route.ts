import { requireSuperadmin } from "@/lib/admin-auth";
import { getCampaignSettings } from "@/lib/campaign-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).valueOf());
}

export async function GET() {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const settings = await getCampaignSettings();
  return Response.json({
    startAt: settings.startAt?.toISOString() ?? null,
    endAt: settings.endAt?.toISOString() ?? null,
  });
}

export async function PUT(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json() as { startAt?: unknown; endAt?: unknown };
  if (!validDate(body.startAt) || !validDate(body.endAt) || new Date(body.startAt) >= new Date(body.endAt)) {
    return Response.json({ error: "Bitte waehle einen gueltigen Beginn und ein gueltiges Ende." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("campaign_settings").upsert({
    id: true,
    submission_start_at: new Date(body.startAt).toISOString(),
    submission_end_at: new Date(body.endAt).toISOString(),
    updated_by: authorization.currentAdmin.user.id,
  });

  if (error) {
    return Response.json({ error: "Der Zeitraum konnte nicht gespeichert werden. Wurde die Migration ausgefuehrt?" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
