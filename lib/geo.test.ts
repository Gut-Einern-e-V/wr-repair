import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyRegion, isWithinRegion } from "./geo";

function request(headers: HeadersInit = {}) {
  return new Request("https://example.test/api/repairs", { headers });
}

afterEach(() => vi.unstubAllEnvs());

describe("region geo check (defaults: NRW)", () => {
  it("accepts the configured country+region header combination", () => {
    expect(verifyRegion(request({ "x-vercel-ip-country": "DE", "x-vercel-ip-country-region": "NW" }))).toEqual({ allowed: true, region: "Nordrhein-Westfalen" });
  });

  it("rejects a known region outside the configured area and missing headers differently", () => {
    expect(verifyRegion(request({ "x-vercel-ip-country": "DE", "x-vercel-ip-country-region": "BY" }))).toEqual({ allowed: false, reason: "outside-region" });
    expect(verifyRegion(request())).toEqual({ allowed: false, reason: "unknown" });
  });

  it("allows the local override only in development", () => {
    vi.stubEnv("GEOIP_ALLOW_LOCAL", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(verifyRegion(request())).toEqual({ allowed: true, region: null });

    vi.stubEnv("NODE_ENV", "production");
    expect(verifyRegion(request())).toEqual({ allowed: false, reason: "unknown" });
  });

  it("allows any country when restriction is disabled", () => {
    vi.stubEnv("REGION_RESTRICTION_ENABLED", "false");
    expect(verifyRegion(request({ "x-vercel-ip-country": "IN", "x-vercel-ip-country-region": "MH" }))).toEqual({ allowed: true, region: null });
  });

  it("uses the configured region label", () => {
    vi.stubEnv("REGION_LABEL", "Berlin");
    vi.stubEnv("REGION_IP_COUNTRY", "DE");
    vi.stubEnv("REGION_IP_REGION", "BE");
    expect(verifyRegion(request({ "x-vercel-ip-country": "DE", "x-vercel-ip-country-region": "BE" }))).toEqual({ allowed: true, region: "Berlin" });
  });

  it("skips the IP region check when REGION_IP_REGION is empty", () => {
    vi.stubEnv("REGION_IP_COUNTRY", "IN");
    vi.stubEnv("REGION_IP_REGION", "");
    expect(verifyRegion(request({ "x-vercel-ip-country": "IN", "x-vercel-ip-country-region": "MH" }))).toEqual({ allowed: true, region: "Nordrhein-Westfalen" });
    expect(verifyRegion(request({ "x-vercel-ip-country": "IN", "x-vercel-ip-country-region": "KA" }))).toEqual({ allowed: true, region: "Nordrhein-Westfalen" });
  });
});

describe("isWithinRegion bounding box", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns false when no bounding box is configured", () => {
    vi.stubEnv("REGION_GEO_LAT_MIN", "");
    vi.stubEnv("REGION_GEO_LAT_MAX", "");
    vi.stubEnv("REGION_GEO_LON_MIN", "");
    vi.stubEnv("REGION_GEO_LON_MAX", "");
    expect(isWithinRegion(51.25, 7.31)).toBe(false);
  });

  it("accepts Wuppertal-Beyenburg with NRW defaults", () => {
    vi.stubEnv("REGION_GEO_LAT_MIN", "50.3");
    vi.stubEnv("REGION_GEO_LAT_MAX", "52.6");
    vi.stubEnv("REGION_GEO_LON_MIN", "5.9");
    vi.stubEnv("REGION_GEO_LON_MAX", "9.5");
    expect(isWithinRegion(51.25, 7.31)).toBe(true);
  });

  it("rejects Munich (Bavaria) with NRW bounds", () => {
    vi.stubEnv("REGION_GEO_LAT_MIN", "50.3");
    vi.stubEnv("REGION_GEO_LAT_MAX", "52.6");
    vi.stubEnv("REGION_GEO_LON_MIN", "5.9");
    vi.stubEnv("REGION_GEO_LON_MAX", "9.5");
    expect(isWithinRegion(48.14, 11.58)).toBe(false);
  });

  it("accepts a coordinate with a custom bounding box for Berlin", () => {
    vi.stubEnv("REGION_GEO_LAT_MIN", "52.3");
    vi.stubEnv("REGION_GEO_LAT_MAX", "52.7");
    vi.stubEnv("REGION_GEO_LON_MIN", "13.1");
    vi.stubEnv("REGION_GEO_LON_MAX", "13.8");
    expect(isWithinRegion(52.52, 13.4)).toBe(true);
    expect(isWithinRegion(51.25, 7.31)).toBe(false);
  });
});
