import { requireAdmin } from "@/lib/admin-auth";
import { getAppSettings, publicLogoUrl, readSettingsRow } from "@/lib/app-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Body = {
  startAt?: unknown;
  endAt?: unknown;
  recordGoal?: unknown;
  region?: {
    enabled?: unknown;
    label?: unknown;
    ipCountry?: unknown;
    ipRegion?: unknown;
    latMin?: unknown;
    latMax?: unknown;
    lonMin?: unknown;
    lonMax?: unknown;
  };
};

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).valueOf());
}

/** Accepts a finite number or null; anything else (including "") is rejected. */
function coordinate(value: unknown, limit: number): number | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) return undefined;
  return value;
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const settings = await getAppSettings();
  const row = settings.row;

  return Response.json({
    startAt: settings.submissionWindow.startAt?.toISOString() ?? null,
    endAt: settings.submissionWindow.endAt?.toISOString() ?? null,
    windowStatus: settings.submissionWindow.status,
    recordGoal: settings.recordGoal,
    region: {
      enabled: settings.region.enabled,
      label: settings.region.label,
      ipCountry: settings.region.ipCountry,
      ipRegion: settings.region.ipRegion,
      latMin: settings.region.bounds?.latMin ?? null,
      latMax: settings.region.bounds?.latMax ?? null,
      lonMin: settings.region.bounds?.lonMin ?? null,
      lonMax: settings.region.bounds?.lonMax ?? null,
    },
    logoUrl: settings.logoUrl,
    // False means the settings row is unreachable and the environment still rules.
    persisted: settings.persisted,
    // Which values are stored rather than inherited from the environment.
    stored: {
      window: Boolean(row?.submission_start_at && row?.submission_end_at),
      recordGoal: row?.record_goal != null,
      region: row?.region_label != null,
      logo: Boolean(row?.logo_path),
    },
  });
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json() as Body;
  const update: Record<string, unknown> = { id: true, updated_by: authorization.currentAdmin.user.id };

  if (body.startAt !== undefined || body.endAt !== undefined) {
    if (!validDate(body.startAt) || !validDate(body.endAt) || new Date(body.startAt) >= new Date(body.endAt)) {
      return Response.json({ error: "Bitte waehle einen gueltigen Beginn und ein gueltiges Ende." }, { status: 400 });
    }
    update.submission_start_at = new Date(body.startAt).toISOString();
    update.submission_end_at = new Date(body.endAt).toISOString();
  }

  if (body.recordGoal !== undefined) {
    const goal = Number(body.recordGoal);
    if (!Number.isInteger(goal) || goal < 1 || goal > 100_000_000) {
      return Response.json({ error: "Das Ziel muss eine ganze Zahl ab 1 sein." }, { status: 400 });
    }
    update.record_goal = goal;
  }

  if (body.region !== undefined) {
    const region = body.region;

    if (typeof region.enabled !== "boolean") {
      return Response.json({ error: "Bitte gib an, ob die Gebietspruefung aktiv ist." }, { status: 400 });
    }
    if (typeof region.label !== "string" || !region.label.trim() || region.label.trim().length > 120) {
      return Response.json({ error: "Der Gebietsname darf nicht leer sein und hoechstens 120 Zeichen haben." }, { status: 400 });
    }
    if (typeof region.ipCountry !== "string" || !/^[A-Za-z]{2}$/.test(region.ipCountry.trim())) {
      return Response.json({ error: "Das Laenderkuerzel muss aus zwei Buchstaben bestehen, zum Beispiel DE." }, { status: 400 });
    }
    if (typeof region.ipRegion !== "string" || region.ipRegion.trim().length > 10) {
      return Response.json({ error: "Das Regionskuerzel ist zu lang." }, { status: 400 });
    }

    const latMin = coordinate(region.latMin, 90);
    const latMax = coordinate(region.latMax, 90);
    const lonMin = coordinate(region.lonMin, 180);
    const lonMax = coordinate(region.lonMax, 180);
    const box = [latMin, latMax, lonMin, lonMax];

    if (box.some((value) => value === undefined)) {
      return Response.json({ error: "Die Koordinaten des Gebiets sind ungueltig." }, { status: 400 });
    }
    // Either a complete box or none at all; half a box would silently disable the GPS fallback.
    const filled = box.filter((value) => value !== null).length;
    if (filled !== 0 && filled !== 4) {
      return Response.json({ error: "Bitte gib alle vier Eckwerte des Gebiets an oder lasse alle leer." }, { status: 400 });
    }
    if (filled === 4 && ((latMin as number) >= (latMax as number) || (lonMin as number) >= (lonMax as number))) {
      return Response.json({ error: "Die Minimalwerte des Gebiets muessen kleiner als die Maximalwerte sein." }, { status: 400 });
    }

    update.region_enabled = region.enabled;
    update.region_label = region.label.trim();
    update.region_ip_country = region.ipCountry.trim().toUpperCase();
    update.region_ip_region = region.ipRegion.trim().toUpperCase();
    update.region_lat_min = latMin;
    update.region_lat_max = latMax;
    update.region_lon_min = lonMin;
    update.region_lon_max = lonMax;
  }

  if (Object.keys(update).length <= 2) {
    return Response.json({ error: "Keine Aenderung angegeben." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("campaign_settings").upsert(update);

  if (error) {
    return Response.json({ error: "Die Einstellungen konnten nicht gespeichert werden. Wurde die Migration ausgefuehrt?" }, { status: 502 });
  }

  const row = await readSettingsRow();
  return Response.json({ ok: true, logoUrl: publicLogoUrl(row?.logo_path ?? null) });
}
