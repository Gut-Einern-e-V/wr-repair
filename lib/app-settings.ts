import { cache } from "react";
import { createSupabaseAdminClient } from "./supabase/server";
import { getRecordGoal } from "./dashboard";
import { getRegionConfig, type RegionConfig } from "./region-config";
import { getSubmissionWindow, type SubmissionWindow } from "./submission-window";

/**
 * Every value the admin backend can change at runtime. The database row only
 * ever holds overrides: a null column means "keep the environment default", so
 * a deployment without the settings migration behaves exactly as before.
 */
export type AppSettings = {
  submissionWindow: SubmissionWindow;
  recordGoal: number;
  /**
   * Bisher hoechster Tagesstand, aus der Tabellenkalkulation uebernommen. Null
   * heisst: nicht eingetragen - dann zaehlt auf der Buehne allein der beste Tag
   * dieser Aktion.
   */
  dayRecord: number | null;
  region: RegionConfig;
  logoUrl: string | null;
  logoPath: string | null;
  /** False when the settings row could not be read, e.g. before the migration ran. */
  persisted: boolean;
  /** The stored overrides themselves, so callers can tell stored from inherited. */
  row: SettingsRow | null;
};

export type SettingsRow = {
  submission_start_at: string | null;
  submission_end_at: string | null;
  record_goal: number | null;
  day_record: number | null;
  logo_path: string | null;
  region_enabled: boolean | null;
  region_label: string | null;
  region_ip_country: string | null;
  region_ip_region: string | null;
  region_lat_min: number | null;
  region_lat_max: number | null;
  region_lon_min: number | null;
  region_lon_max: number | null;
};

const settingsColumns =
  "submission_start_at, submission_end_at, record_goal, day_record, logo_path, region_enabled, region_label, region_ip_country, region_ip_region, region_lat_min, region_lat_max, region_lon_min, region_lon_max";

export function parseWindow(startAt: string | null, endAt: string | null): SubmissionWindow | null {
  const start = new Date(startAt ?? "");
  const end = new Date(endAt ?? "");

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end) {
    return null;
  }

  const now = new Date();
  return {
    status: now < start ? "before" : now > end ? "after" : "open",
    startAt: start,
    endAt: end,
  };
}

/** Overlays the stored region override on the environment configuration. */
export function mergeRegion(base: RegionConfig, row: SettingsRow | null): RegionConfig {
  if (!row) return base;

  const box = [row.region_lat_min, row.region_lat_max, row.region_lon_min, row.region_lon_max];
  const hasBox = box.every((value) => typeof value === "number" && Number.isFinite(value));

  return {
    enabled: row.region_enabled ?? base.enabled,
    label: row.region_label?.trim() || base.label,
    ipCountry: row.region_ip_country?.trim().toUpperCase() || base.ipCountry,
    // An explicitly emptied sub-region is a valid choice, so only null falls back.
    ipRegion: row.region_ip_region === null ? base.ipRegion : row.region_ip_region.trim().toUpperCase(),
    bounds: hasBox
      ? { latMin: row.region_lat_min as number, latMax: row.region_lat_max as number, lonMin: row.region_lon_min as number, lonMax: row.region_lon_max as number }
      : base.bounds,
  };
}

export function publicLogoUrl(logoPath: string | null): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!logoPath || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/site-assets/${logoPath}`;
}

export async function readSettingsRow(): Promise<SettingsRow | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("campaign_settings")
      .select(settingsColumns)
      .eq("id", true)
      .maybeSingle();

    if (error) return null;
    return (data as SettingsRow | null) ?? null;
  } catch {
    // Missing credentials or migration: the environment defaults stay in charge.
    return null;
  }
}

/**
 * Cached per request so a page rendering several settings-aware sections still
 * hits the database once.
 */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const row = await readSettingsRow();
  const storedWindow = row ? parseWindow(row.submission_start_at, row.submission_end_at) : null;

  return {
    submissionWindow: storedWindow ?? getSubmissionWindow(),
    recordGoal: row?.record_goal && row.record_goal > 0 ? row.record_goal : getRecordGoal(),
    dayRecord: row?.day_record && row.day_record > 0 ? row.day_record : null,
    region: mergeRegion(getRegionConfig(), row),
    logoPath: row?.logo_path ?? null,
    logoUrl: publicLogoUrl(row?.logo_path ?? null),
    persisted: row !== null,
    row,
  };
});
