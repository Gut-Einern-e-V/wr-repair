import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyNorthrhineWestphalia, isWithinNrw } from "./geo";

function request(headers: HeadersInit = {}) {
  return new Request("https://example.test/api/repairs", { headers });
}

afterEach(() => vi.unstubAllEnvs());

describe("NRW geo check", () => {
  it("accepts only Vercel's German NRW header combination", () => {
    expect(verifyNorthrhineWestphalia(request({ "x-vercel-ip-country": "DE", "x-vercel-ip-country-region": "NW" }))).toEqual({ allowed: true, region: "Nordrhein-Westfalen" });
  });

  it("rejects a known region outside NRW and missing headers differently", () => {
    expect(verifyNorthrhineWestphalia(request({ "x-vercel-ip-country": "DE", "x-vercel-ip-country-region": "BY" }))).toEqual({ allowed: false, reason: "outside-nrw" });
    expect(verifyNorthrhineWestphalia(request())).toEqual({ allowed: false, reason: "unknown" });
  });

  it("allows the local override only in development", () => {
    vi.stubEnv("GEOIP_ALLOW_LOCAL", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(verifyNorthrhineWestphalia(request())).toEqual({ allowed: true, region: null });

    vi.stubEnv("NODE_ENV", "production");
    expect(verifyNorthrhineWestphalia(request())).toEqual({ allowed: false, reason: "unknown" });
  });
});

describe("isWithinNrw bounding box", () => {
  it("accepts Wuppertal-Beyenburg coordinates", () => {
    expect(isWithinNrw(51.25, 7.31)).toBe(true);
  });

  it("accepts Cologne coordinates", () => {
    expect(isWithinNrw(50.94, 6.96)).toBe(true);
  });

  it("rejects Munich (Bavaria)", () => {
    expect(isWithinNrw(48.14, 11.58)).toBe(false);
  });

  it("rejects coordinates outside Germany entirely", () => {
    expect(isWithinNrw(48.85, 2.35)).toBe(false);
  });
});