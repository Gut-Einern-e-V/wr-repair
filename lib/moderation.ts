import { requireModerator } from "@/lib/admin-auth";
import { getConfiguredSubmissionWindow } from "@/lib/campaign-settings";
import { hasOriginMismatch, type OriginSource } from "@/lib/origin-check";
import { projectToUnitSquare } from "@/lib/nrw-map";
import type { RegionConfig } from "@/lib/region-config";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Frist eines Moderationsanspruchs. Sie muss lang genug fuer eine gruendliche
 * Pruefung sein und kurz genug, dass ein geschlossener Tab die Einreichung
 * nicht aus der Warteschlange nimmt (Issue #38). Derselbe Wert steckt als
 * Vorgabe in `claim_next_repair`.
 */
export const CLAIM_LEASE_SECONDS = 300;

/** Spalten, die das Moderationsbackend ueber eine Einreichung braucht. */
export const moderationColumns =
  "id, category, brand_model, duration_minutes, item_value_euros, performed_by, story, repair_succeeded, image_path, image_alt_text, tags, consent_publication, status, location_region, moderator_comment, created_at, entry_time, claimed_by, claimed_at, location_lat, location_lon, kreis, origin_source, origin_ip_region";

export type ModerationRow = {
  id: string;
  image_path: string | null;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  location_lat: number | string | null;
  location_lon: number | string | null;
  kreis: string | null;
  origin_source: string | null;
  origin_ip_region: string | null;
};

/**
 * Alles, was die Moderation ueber die Herkunft einer Einreichung wissen muss -
 * an einer Stelle statt ueber fuenf Felder verteilt.
 *
 * `mapX`/`mapY` sind die auf der Landkarte projizierten Koordinaten der
 * anonymisierten Zelle (0..1 innerhalb des Landes, siehe projectToUnitSquare
 * in lib/nrw-map.ts). Die Projektion passiert hier auf dem Server, damit die
 * Konsole im Browser keine 1200 Zeilen Polygondaten laden muss.
 */
export type ModerationOrigin = {
  lat: number;
  lon: number;
  kreis: string | null;
  source: OriginSource | null;
  ipRegion: string | null;
  /** Verbindung und Ortsangabe kommen aus verschiedenen Gegenden. */
  mismatch: boolean;
  /** Die Zelle liegt ausserhalb des Gebiets - sollte nach der Herkunftspruefung nicht mehr vorkommen. */
  outside: boolean;
  mapX: number;
  mapY: number;
};

/* numeric aus Postgres kommt je nach Treiber als Zahl oder als String. */
function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const originSources = new Set(["photo", "gps", "manual", "ip"]);

function toModerationOrigin(row: ModerationRow, region: RegionConfig): ModerationOrigin | null {
  const lat = toNumber(row.location_lat);
  const lon = toNumber(row.location_lon);
  if (lat === null || lon === null) return null;

  const { x, y } = projectToUnitSquare({ lat, lon });
  return {
    lat,
    lon,
    kreis: row.kreis,
    source: originSources.has(row.origin_source ?? "") ? (row.origin_source as OriginSource) : null,
    ipRegion: row.origin_ip_region,
    mismatch: hasOriginMismatch(row.origin_ip_region, row.kreis, region),
    outside: row.kreis === null,
    mapX: x,
    mapY: y,
  };
}

/**
 * Moderationszugang samt Zeitfenster. Ausserhalb des Einreichungszeitraums
 * moderiert nur die Administration.
 */
export async function requireModerationAccess() {
  const authorization = await requireModerator();
  if (!authorization.authorized) {
    return { ok: false as const, response: Response.json({ error: authorization.error }, { status: authorization.status }) };
  }

  const isAdmin = authorization.currentAdmin.roles.some((role) => ["admin", "superadmin"].includes(role));
  if (!isAdmin && (await getConfiguredSubmissionWindow()).status !== "open") {
    return {
      ok: false as const,
      response: Response.json({ error: "Moderation ist nur waehrend des Einreichungszeitraums moeglich." }, { status: 403 }),
    };
  }

  return { ok: true as const, currentAdmin: authorization.currentAdmin, isAdmin };
}

/** Signierte Bild-URLs fuer genau die uebergebenen Einreichungen. */
export async function signRepairImages(supabase: SupabaseClient, rows: { image_path: string | null }[]) {
  const paths = rows.map((row) => row.image_path).filter((path): path is string => Boolean(path));
  if (!paths.length) {
    return { urls: new Map<string, string>(), error: null };
  }

  const { data, error } = await supabase.storage.from("repair-images").createSignedUrls(paths, 900);
  if (error) {
    return { urls: new Map<string, string>(), error };
  }

  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }

  return { urls, error: null };
}

/**
 * Datenbankzeile in die Form, die das Backend erwartet: mit signierter Bild-URL
 * und aufgeloestem Anspruch. `claimed_by` selbst verlaesst den Server nicht -
 * wer prueft, ist keine Information fuer den Browser, nur ob jemand prueft.
 */
export function toModerationRepair<Row extends ModerationRow>(
  row: Row,
  urls: Map<string, string>,
  viewerId: string,
  region: RegionConfig,
) {
  /* Die Herkunftsspalten gehen als aufbereitetes `origin`-Objekt raus, nicht
     zusaetzlich als lose Spalten - sie werden hier nur weggeschnitten. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { image_path, claimed_by, claimed_at, location_lat, location_lon, kreis, origin_source, origin_ip_region, ...rest } = row;
  const claimedUntil = claimed_at && row.status === "pending"
    ? new Date(Date.parse(claimed_at) + CLAIM_LEASE_SECONDS * 1000).toISOString()
    : null;

  return {
    ...rest,
    origin: toModerationOrigin(row, region),
    imageUrl: image_path ? (urls.get(image_path) ?? null) : null,
    claimedUntil: claimedUntil && Date.parse(claimedUntil) > Date.now() ? claimedUntil : null,
    claimedByMe: claimed_by === viewerId,
  };
}
