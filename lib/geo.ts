type GeoCheckResult =
  | { allowed: true; region: "Nordrhein-Westfalen" | null }
  | { allowed: false; reason: "outside-nrw" | "unknown" };

/** Approximate bounding box for Nordrhein-Westfalen. */
const NRW_BOUNDS = { latMin: 50.3, latMax: 52.6, lonMin: 5.9, lonMax: 9.5 };

/** Returns true when the given coordinates fall within NRW's bounding box. */
export function isWithinNrw(lat: number, lon: number): boolean {
  return (
    lat >= NRW_BOUNDS.latMin &&
    lat <= NRW_BOUNDS.latMax &&
    lon >= NRW_BOUNDS.lonMin &&
    lon <= NRW_BOUNDS.lonMax
  );
}

export function verifyNorthrhineWestphalia(request: Request): GeoCheckResult {
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");

  if (country === "DE" && region === "NW") {
    return { allowed: true, region: "Nordrhein-Westfalen" };
  }

  if (process.env.NODE_ENV === "development" && process.env.GEOIP_ALLOW_LOCAL === "true") {
    return { allowed: true, region: null };
  }

  if (country || region) {
    return { allowed: false, reason: "outside-nrw" };
  }

  return { allowed: false, reason: "unknown" };
}