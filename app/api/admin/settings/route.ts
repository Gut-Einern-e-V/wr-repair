import { requireAdmin } from "@/lib/admin-auth";
import { isValidIpRule, MAX_ALLOWLIST_ENTRIES } from "@/lib/ip-allowlist";
import { getClientIp } from "@/lib/rate-limit";
import { getAppSettings, publicLogoUrl, readSettingsRow } from "@/lib/app-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Body = {
  startAt?: unknown;
  endAt?: unknown;
  recordGoal?: unknown;
  dayRecord?: unknown;
  rateLimit?: {
    enabled?: unknown;
    perMinute?: unknown;
    allowlist?: unknown;
  };
  lotteryOrganizer?: {
    name?: unknown;
    address?: unknown;
    email?: unknown;
  };
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

export async function GET(request: Request) {
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
    dayRecord: settings.dayRecord,
    rateLimit: settings.publicThrottle,
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
    lotteryOrganizer: settings.lotteryOrganizer,
    /* Die Adresse, mit der dieses Backend gerade aufgerufen wird (Issue #80).
       Sie steht hier, damit die Freigabeliste einen Knopf "meine Adresse
       eintragen" haben kann: Wer am Buehnenrechner sitzt, soll die Adresse
       nicht woanders nachschlagen muessen. Sie wird nicht gespeichert - nur
       angezeigt. Bewusst aus derselben Funktion wie das Limit selbst, sonst
       gaebe der Knopf womoeglich eine andere Adresse frei als die gedrosselte. */
    clientIp: getClientIp(request),
    // False means the settings row is unreachable and the environment still rules.
    persisted: settings.persisted,
    // Which values are stored rather than inherited from the environment.
    stored: {
      window: Boolean(row?.submission_start_at && row?.submission_end_at),
      recordGoal: row?.record_goal != null,
      dayRecord: row?.day_record != null,
      rateLimit: row?.rate_limit_enabled != null,
      region: row?.region_label != null,
      logo: Boolean(row?.logo_path),
      lotteryOrganizer: Boolean(row?.lottery_organizer_name),
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

  /* Der bisherige Tagesrekord aus der Tabellenkalkulation - die Marke "an einem
     Tag und Ort" (Issue #75). Null loescht ihn; dann zaehlt auf der Buehne
     allein der beste Ortstag dieser Aktion. */
  if (body.dayRecord !== undefined) {
    if (body.dayRecord === null) {
      update.day_record = null;
    } else {
      const record = Number(body.dayRecord);
      if (!Number.isInteger(record) || record < 1 || record > 100_000_000) {
        return Response.json({ error: "Der Tagesrekord muss eine ganze Zahl ab 1 sein." }, { status: 400 });
      }
      update.day_record = record;
    }
  }

  /* Drosselung der oeffentlichen Leseroute (Issue #80). Schalter und Zahl
     werden zusammen gespeichert: Eine Zahl ohne Schalter waere kein Zustand,
     den die Oberflaeche anzeigen kann. */
  if (body.rateLimit !== undefined) {
    const rateLimit = body.rateLimit;

    if (typeof rateLimit.enabled !== "boolean") {
      return Response.json({ error: "Bitte gib an, ob die Drosselung aktiv ist." }, { status: 400 });
    }

    const perMinute = Number(rateLimit.perMinute);
    if (!Number.isInteger(perMinute) || perMinute < 1 || perMinute > 100_000) {
      return Response.json({ error: "Die Anfragen pro Minute muessen eine ganze Zahl zwischen 1 und 100.000 sein." }, { status: 400 });
    }

    /* Die Freigabeliste kommt zusammen mit dem Schalter, weil die Karte im
       Backend beides in einem Formular speichert. Unbrauchbare Schreibweisen
       werden abgewiesen statt stillschweigend weggeworfen: Wer eine Adresse
       eintraegt, die nicht greift, wuerde sich sonst auf eine Freigabe
       verlassen, die es nicht gibt. */
    if (!Array.isArray(rateLimit.allowlist)) {
      return Response.json({ error: "Die Freigabeliste muss eine Liste von Adressen sein." }, { status: 400 });
    }
    if (rateLimit.allowlist.length > MAX_ALLOWLIST_ENTRIES) {
      return Response.json({ error: `Die Freigabeliste fasst hoechstens ${MAX_ALLOWLIST_ENTRIES} Eintraege.` }, { status: 400 });
    }

    const allowlist: string[] = [];
    for (const entry of rateLimit.allowlist) {
      const rule = typeof entry === "string" ? entry.trim() : "";
      if (!isValidIpRule(rule)) {
        return Response.json(
          { error: `"${rule}" ist keine IP-Adresse und kein Praefix. Beispiele: 203.0.113.4, 203.0.113.0/24, 2001:db8::/32.` },
          { status: 400 },
        );
      }
      if (!allowlist.includes(rule)) allowlist.push(rule);
    }

    update.rate_limit_enabled = rateLimit.enabled;
    update.rate_limit_per_minute = perMinute;
    update.rate_limit_allowlist = allowlist;
  }

  /* Veranstalter des Gewinnspiels (Issue #45). Alle drei Felder zusammen,
     weil sie zusammen in den Teilnahmebedingungen stehen: Ein Name ohne
     Anschrift waere dort keine gueltige Angabe, sondern eine halbe. Leere
     Felder sind erlaubt und heissen "steht noch nicht fest" - die
     oeffentliche Seite schreibt dann genau das, statt etwas zu behaupten. */
  if (body.lotteryOrganizer !== undefined) {
    const organizer = body.lotteryOrganizer;
    const name = typeof organizer.name === "string" ? organizer.name.trim() : "";
    const address = typeof organizer.address === "string" ? organizer.address.trim() : "";
    const email = typeof organizer.email === "string" ? organizer.email.trim() : "";

    if (name.length > 200 || address.length > 300 || email.length > 200) {
      return Response.json({ error: "Name, Anschrift und Kontaktadresse des Veranstalters sind zu lang." }, { status: 400 });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ error: "Die Kontaktadresse des Veranstalters ist keine gueltige E-Mail-Adresse." }, { status: 400 });
    }

    update.lottery_organizer_name = name || null;
    update.lottery_organizer_address = address || null;
    update.lottery_organizer_email = email || null;
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
