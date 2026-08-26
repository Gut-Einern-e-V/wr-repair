/**
 * Central configuration for the regional restriction feature.
 *
 * All values fall back to the NRW defaults so existing deployments continue to
 * work without any environment changes. To adapt the platform for a different
 * region set the following environment variables:
 *
 *   REGION_RESTRICTION_ENABLED   – "true" (default) | "false"
 *   REGION_LABEL                 – Human-readable name, e.g. "Berlin"
 *   NEXT_PUBLIC_REGION_LABEL     – Same value, exposed to the browser bundle
 *   REGION_IP_COUNTRY            – ISO 3166-1 alpha-2, e.g. "DE"
 *   REGION_IP_REGION             – Vercel sub-region code, e.g. "BE"; leave
 *                                  empty to skip the IP region check
 *   REGION_GEO_LAT_MIN           – Southern latitude of the bounding box
 *   REGION_GEO_LAT_MAX           – Northern latitude
 *   REGION_GEO_LON_MIN           – Western longitude
 *   REGION_GEO_LON_MAX           – Eastern longitude
 *                                  Leave all four empty to skip the GPS check
 */

export type RegionConfig = {
  /** Whether any location restriction is applied at all. */
  enabled: boolean;
  /** Human-readable region name stored in the database on match. */
  label: string;
  /** Expected ISO 3166-1 alpha-2 country code from Vercel headers. */
  ipCountry: string;
  /**
   * Expected Vercel sub-region code. Empty string means the IP region header
   * is not checked (only the country code is required).
   */
  ipRegion: string;
  /** Geographic bounding box used as EXIF GPS fallback. Null disables the GPS check. */
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number } | null;
};

function parseFloat_(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const n = parseFloat(value);
  return isFinite(n) ? n : null;
}

/** Returns the active region configuration read from environment variables. */
export function getRegionConfig(): RegionConfig {
  const enabled = process.env.REGION_RESTRICTION_ENABLED !== "false";
  const label = process.env.REGION_LABEL ?? "Nordrhein-Westfalen";
  const ipCountry = process.env.REGION_IP_COUNTRY ?? "DE";
  const ipRegion = process.env.REGION_IP_REGION ?? "NW";

  const latMin = parseFloat_(process.env.REGION_GEO_LAT_MIN);
  const latMax = parseFloat_(process.env.REGION_GEO_LAT_MAX);
  const lonMin = parseFloat_(process.env.REGION_GEO_LON_MIN);
  const lonMax = parseFloat_(process.env.REGION_GEO_LON_MAX);

  const bounds =
    latMin !== null && latMax !== null && lonMin !== null && lonMax !== null
      ? { latMin, latMax, lonMin, lonMax }
      : null;

  return { enabled, label, ipCountry, ipRegion, bounds };
}
