import { cache } from "react";
import { createSupabaseAdminClient } from "./supabase/server";
import { getRecordGoal } from "./dashboard";
import { normalizeIpRules } from "./ip-allowlist";
import { DEFAULT_THROTTLE_PER_MINUTE, type PublicThrottle } from "./rate-limit";
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
  /**
   * Drosselung der oeffentlichen Leseroute je IP-Adresse (Issue #80).
   *
   * Ausgeschaltet, solange niemand sie einschaltet - und ebenso, solange
   * Migration 202609020002 nicht ausgerollt ist. Dann gelten die Vorgaben der
   * Routen, also genau das bisherige Verhalten.
   */
  publicThrottle: PublicThrottle;
  logoUrl: string | null;
  logoPath: string | null;
  /**
   * Wer das Gewinnspiel veranstaltet (Issue #45).
   *
   * Steht in den Teilnahmebedingungen und ist noch nicht abschliessend
   * geklaert. Deshalb aus dem Backend und nicht aus dem Quelltext: Sobald
   * Name, Anschrift und Kontaktadresse feststehen, werden sie eingetragen -
   * ohne Deployment. Null heisst nicht "Vorgabe", sondern "steht noch nicht
   * fest"; die oeffentliche Seite sagt dann genau das.
   */
  lotteryOrganizer: LotteryOrganizer;
  /** False when the settings row could not be read, e.g. before the migration ran. */
  persisted: boolean;
  /** The stored overrides themselves, so callers can tell stored from inherited. */
  row: SettingsRow | null;
};

export type LotteryOrganizer = {
  name: string | null;
  address: string | null;
  email: string | null;
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
  rate_limit_enabled: boolean | null;
  rate_limit_per_minute: number | null;
  rate_limit_allowlist: string[] | null;
  /* Fehlen, solange Migration 202609030001 nicht gelaufen ist. */
  lottery_organizer_name?: string | null;
  lottery_organizer_address?: string | null;
  lottery_organizer_email?: string | null;
};

/**
 * Bewusst alle Spalten statt einer Liste.
 *
 * Eine feste Liste bricht die gesamte Abfrage, sobald sie eine Spalte nennt,
 * die es in dieser Datenbank noch nicht gibt - PostgREST antwortet dann mit
 * einem Fehler fuer die ganze Anfrage. Genau in dieses Fenster faellt jede
 * Umgebung zwischen einem Deployment und der zugehoerigen Migration: Die
 * Einstellungen waeren dort nicht "teilweise", sondern gar nicht lesbar, und
 * die Seite fiele auf die Umgebungsvariablen zurueck. Mit `*` kommt schlicht
 * das, was da ist (Issue #45, dieselbe Lehre wie in lib/moderation.ts).
 */
const settingsColumns = "*";

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
    /* An explicitly emptied sub-region is a valid choice, so only a missing
       value falls back. Bewusst `== null` und nicht `=== null`: Die Zeile kommt
       nicht mehr nur aus einer Abfrage mit fester Spaltenliste, sondern auch
       aus `submission_gate` (siehe lib/submission-gate.ts). Eine dort fehlende
       Spalte darf die Einreichung nicht mit einem Serverfehler beenden. */
    ipRegion: row.region_ip_region == null ? base.ipRegion : row.region_ip_region.trim().toUpperCase(),
    bounds: hasBox
      ? { latMin: row.region_lat_min as number, latMax: row.region_lat_max as number, lonMin: row.region_lon_min as number, lonMax: row.region_lon_max as number }
      : base.bounds,
  };
}

/**
 * Liest die Drosselung aus der Einstellungszeile (Issue #80).
 *
 * Bewusst `?? false` und nicht "an, sobald eine Zahl steht": Eine
 * eingetragene Zahl ohne gesetzten Schalter ist ein vorbereiteter Wert, keine
 * Anweisung. Und `== null` fuer die Spalte, weil die Zeile nicht nur aus einer
 * Abfrage mit fester Spaltenliste kommt, sondern auch aus `submission_gate` -
 * dort fehlt sie, solange die Migration nicht durch ist (siehe
 * {@link mergeRegion} fuer denselben Fall).
 */
export function mergeThrottle(row: SettingsRow | null): PublicThrottle {
  const perMinute = row?.rate_limit_per_minute;

  return {
    enabled: row?.rate_limit_enabled ?? false,
    perMinute: perMinute != null && perMinute > 0 ? perMinute : DEFAULT_THROTTLE_PER_MINUTE,
    /* Die Freigabeliste gilt unabhaengig vom Schalter: Sie nimmt eine Anzeige
       auch von der Vorgabe der Route aus, nicht nur vom Schonmodus. */
    allowlist: normalizeIpRules(row?.rate_limit_allowlist),
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
 * Legt die gespeicherten Ueberschreibungen auf die Umgebungsvorgaben.
 *
 * Getrennt von {@link getAppSettings}, weil die Zeile nicht immer aus einer
 * eigenen Abfrage kommt: Die Einreichungsroute holt sie zusammen mit der
 * Limitpruefung in einem Aufruf (siehe lib/submission-gate.ts) und braucht
 * denselben Aufbau, ohne die Datenbank ein zweites Mal zu fragen.
 */
export function buildAppSettings(row: SettingsRow | null): AppSettings {
  const storedWindow = row ? parseWindow(row.submission_start_at, row.submission_end_at) : null;

  return {
    submissionWindow: storedWindow ?? getSubmissionWindow(),
    recordGoal: row?.record_goal && row.record_goal > 0 ? row.record_goal : getRecordGoal(),
    dayRecord: row?.day_record && row.day_record > 0 ? row.day_record : null,
    region: mergeRegion(getRegionConfig(), row),
    publicThrottle: mergeThrottle(row),
    logoPath: row?.logo_path ?? null,
    logoUrl: publicLogoUrl(row?.logo_path ?? null),
    lotteryOrganizer: {
      name: row?.lottery_organizer_name?.trim() || null,
      address: row?.lottery_organizer_address?.trim() || null,
      email: row?.lottery_organizer_email?.trim() || null,
    },
    persisted: row !== null,
    row,
  };
}

/**
 * Cached per request so a page rendering several settings-aware sections still
 * hits the database once.
 */
export const getAppSettings = cache(async (): Promise<AppSettings> => buildAppSettings(await readSettingsRow()));
