import { getRegionConfig } from "./region-config";

export type GeoCheckResult =
  | { allowed: true; region: string | null }
  | { allowed: false; reason: "outside-region" | "unknown" };

/**
 * Returns true when the given coordinates fall within the configured
 * geographic bounding box. Returns false when no bounding box is configured.
 */
export function isWithinRegion(lat: number, lon: number): boolean {
  const { bounds } = getRegionConfig();
  if (!bounds) return false;
  return (
    lat >= bounds.latMin &&
    lat <= bounds.latMax &&
    lon >= bounds.lonMin &&
    lon <= bounds.lonMax
  );
}

/** @deprecated Use {@link isWithinRegion} instead. */
export const isWithinNrw = isWithinRegion;

export function verifyRegion(request: Request): GeoCheckResult {
  const { enabled, label, ipCountry, ipRegion } = getRegionConfig();

  if (!enabled) {
    return { allowed: true, region: null };
  }

  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");

  const countryMatch = country === ipCountry;
  const regionMatch = ipRegion === "" || region === ipRegion;

  if (countryMatch && regionMatch) {
    return { allowed: true, region: label };
  }

  if (process.env.NODE_ENV === "development" && process.env.GEOIP_ALLOW_LOCAL === "true") {
    return { allowed: true, region: null };
  }

  if (country || region) {
    return { allowed: false, reason: "outside-region" };
  }

  return { allowed: false, reason: "unknown" };
}

/** @deprecated Use {@link verifyRegion} instead. */
export const verifyNorthrhineWestphalia = verifyRegion;
