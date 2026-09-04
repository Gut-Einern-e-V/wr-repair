import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAppSettings, mergeRegion, mergeThrottle, parseWindow, publicLogoUrl, type SettingsRow } from "./app-settings";
import { defaultLotteryOrganizer } from "./organisation";
import { DEFAULT_THROTTLE_PER_MINUTE } from "./rate-limit";
import { getRegionConfig } from "./region-config";

function row(overrides: Partial<SettingsRow> = {}): SettingsRow {
  return {
    submission_start_at: null,
    submission_end_at: null,
    record_goal: null,
    day_record: null,
    logo_path: null,
    region_enabled: null,
    region_label: null,
    region_ip_country: null,
    region_ip_region: null,
    region_lat_min: null,
    region_lat_max: null,
    region_lon_min: null,
    region_lon_max: null,
    rate_limit_enabled: null,
    rate_limit_per_minute: null,
    rate_limit_allowlist: null,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("parseWindow", () => {
  it("erkennt den Zustand relativ zur Gegenwart", () => {
    const past = parseWindow("2020-01-01T00:00:00Z", "2020-02-01T00:00:00Z");
    const future = parseWindow("2999-01-01T00:00:00Z", "2999-02-01T00:00:00Z");
    const open = parseWindow("2020-01-01T00:00:00Z", "2999-01-01T00:00:00Z");

    expect(past?.status).toBe("after");
    expect(future?.status).toBe("before");
    expect(open?.status).toBe("open");
  });

  it("verwirft unvollstaendige oder verdrehte Zeitraeume", () => {
    expect(parseWindow(null, "2999-01-01T00:00:00Z")).toBeNull();
    expect(parseWindow("2999-01-01T00:00:00Z", null)).toBeNull();
    expect(parseWindow("2999-02-01T00:00:00Z", "2999-01-01T00:00:00Z")).toBeNull();
    expect(parseWindow("keine Zeit", "auch nicht")).toBeNull();
  });
});

describe("mergeRegion", () => {
  it("behaelt die Umgebungswerte ohne gespeicherte Zeile", () => {
    expect(mergeRegion(getRegionConfig(), null)).toEqual(getRegionConfig());
  });

  it("uebernimmt gespeicherte Werte und laesst leere Felder zurueckfallen", () => {
    const merged = mergeRegion(getRegionConfig(), row({ region_label: "Berlin", region_ip_country: "de", region_enabled: false }));

    expect(merged.label).toBe("Berlin");
    expect(merged.ipCountry).toBe("DE");
    expect(merged.enabled).toBe(false);
    // Ohne gespeicherte Region bleibt das Kuerzel aus der Umgebung stehen.
    expect(merged.ipRegion).toBe("NW");
    expect(merged.bounds).toEqual(getRegionConfig().bounds);
  });

  it("nimmt ein absichtlich geleertes Regionskuerzel als Wert", () => {
    expect(mergeRegion(getRegionConfig(), row({ region_ip_region: "" })).ipRegion).toBe("");
  });

  it("uebernimmt nur ein vollstaendiges Koordinatenfenster", () => {
    const complete = mergeRegion(getRegionConfig(), row({ region_lat_min: 52.3, region_lat_max: 52.7, region_lon_min: 13.0, region_lon_max: 13.8 }));
    expect(complete.bounds).toEqual({ latMin: 52.3, latMax: 52.7, lonMin: 13.0, lonMax: 13.8 });

    const partial = mergeRegion(getRegionConfig(), row({ region_lat_min: 52.3, region_lat_max: 52.7 }));
    expect(partial.bounds).toEqual(getRegionConfig().bounds);
  });
});

describe("publicLogoUrl", () => {
  it("baut die oeffentliche Storage-URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    expect(publicLogoUrl("logo-1.png")).toBe("https://project.supabase.co/storage/v1/object/public/site-assets/logo-1.png");
  });

  it("liefert null ohne Logo oder ohne konfiguriertes Projekt", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    expect(publicLogoUrl(null)).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(publicLogoUrl("logo-1.png")).toBeNull();
  });
});

describe("mergeThrottle", () => {
  it("bleibt ohne Einstellungszeile im Normalbetrieb", () => {
    expect(mergeThrottle(null)).toEqual({ enabled: false, perMinute: DEFAULT_THROTTLE_PER_MINUTE, allowlist: [] });
  });

  it("bleibt aus, solange nur eine Zahl hinterlegt ist", () => {
    // Eine vorbereitete Zahl ist keine Anweisung zu drosseln (Issue #80).
    expect(mergeThrottle(row({ rate_limit_per_minute: 20 })))
      .toEqual({ enabled: false, perMinute: 20, allowlist: [] });
  });

  it("nimmt Schalter und Zahl aus der Zeile", () => {
    expect(mergeThrottle(row({ rate_limit_enabled: true, rate_limit_per_minute: 15 })))
      .toEqual({ enabled: true, perMinute: 15, allowlist: [] });
  });

  it("faellt bei unbrauchbarer Zahl auf den Standardwert zurueck", () => {
    expect(mergeThrottle(row({ rate_limit_enabled: true, rate_limit_per_minute: 0 })))
      .toEqual({ enabled: true, perMinute: DEFAULT_THROTTLE_PER_MINUTE, allowlist: [] });
  });

  it("liest die Freigabeliste und wirft Tippfehler darin weg", () => {
    // Eine Liste mit einem kaputten Eintrag darf die Drosselung nicht
    // insgesamt ausfallen lassen (Issue #80).
    const throttle = mergeThrottle(row({ rate_limit_allowlist: ["203.0.113.4", "kaputt", "2001:db8::/32"] }));
    expect(throttle.allowlist).toEqual(["203.0.113.4", "2001:db8::/32"]);
  });
});

describe("Veranstalter des Gewinnspiels", () => {
  it("nennt ohne Einstellungszeile die Vorgabe - eine Verlosung ohne Veranstalter gibt es nicht", () => {
    expect(buildAppSettings(null).lotteryOrganizer).toEqual({ ...defaultLotteryOrganizer });
  });

  it("laesst das Backend jedes Feld einzeln ueberschreiben", () => {
    const organizer = buildAppSettings(row({
      lottery_organizer_name: "Repair Café Wuppertal",
      lottery_organizer_email: "  verlosung@example.org  ",
    })).lotteryOrganizer;

    expect(organizer.name).toBe("Repair Café Wuppertal");
    expect(organizer.email).toBe("verlosung@example.org");
    // Nicht ueberschrieben, also weiterhin die Vorgabe.
    expect(organizer.address).toBe(defaultLotteryOrganizer.address);
  });

  it("nimmt ein geleertes Feld als Rueckkehr zur Vorgabe, nicht als leere Angabe", () => {
    const organizer = buildAppSettings(row({ lottery_organizer_name: "   " })).lotteryOrganizer;
    expect(organizer.name).toBe(defaultLotteryOrganizer.name);
  });
});
