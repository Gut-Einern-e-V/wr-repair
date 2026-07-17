type GeoCheckResult =
  | { allowed: true; region: "Nordrhein-Westfalen" | null }
  | { allowed: false; reason: "outside-nrw" | "unknown" };

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