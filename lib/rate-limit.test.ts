import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp, publicLimit, publicRateLimit, rateLimit } from "./rate-limit";

let namespaceIndex = 0;

function namespace() {
  namespaceIndex += 1;
  return `test-${namespaceIndex}`;
}

function request(headers: HeadersInit = {}) {
  return new Request("https://example.test/api/repairs", { headers });
}

afterEach(() => vi.useRealTimers());

describe("rate limit", () => {
  it("blocks a client after the configured number of attempts", () => {
    const key = namespace();
    const client = request({ "x-forwarded-for": "203.0.113.4" });

    expect(rateLimit(client, key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit(client, key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit(client, key, { limit: 2, windowMs: 60_000 })).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("uses the first forwarded address and isolates namespaces", () => {
    const key = namespace();
    const firstClient = request({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    const secondClient = request({ "x-forwarded-for": "203.0.113.11, 10.0.0.1" });

    expect(rateLimit(firstClient, key, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit(firstClient, key, { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(secondClient, key, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("opens a new window after expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:00:00.000Z"));
    const key = namespace();
    const client = request({ "x-real-ip": "203.0.113.12" });

    expect(rateLimit(client, key, { limit: 1, windowMs: 15_000 }).allowed).toBe(true);
    expect(rateLimit(client, key, { limit: 1, windowMs: 15_000 }).allowed).toBe(false);

    vi.advanceTimersByTime(15_000);
    expect(rateLimit(client, key, { limit: 1, windowMs: 15_000 }).allowed).toBe(true);
  });
});
describe("publicLimit", () => {
  it("laesst im Normalbetrieb die Vorgabe der Route gelten", () => {
    expect(publicLimit({ enabled: false, perMinute: 10, allowlist: [] }, 240)).toBe(240);
  });

  it("nimmt eingeschaltet die engere der beiden Zahlen", () => {
    expect(publicLimit({ enabled: true, perMinute: 30, allowlist: [] }, 240)).toBe(30);
    // Eine Drosselung darf eine Route nicht lockerer machen als sie sein wollte.
    expect(publicLimit({ enabled: true, perMinute: 500, allowlist: [] }, 240)).toBe(240);
  });

  it("bleibt bei mindestens einer Anfrage - eine Grenze von null waere eine Sperre", () => {
    expect(publicLimit({ enabled: true, perMinute: 0, allowlist: [] }, 240)).toBe(1);
  });
});

describe("publicRateLimit", () => {
  it("greift erst mit eingeschalteter Drosselung", () => {
    const client = request({ "x-forwarded-for": "203.0.113.42" });
    const off = namespace();
    const on = namespace();

    // Vorgabe der Route: zwei Anfragen sind drin.
    expect(publicRateLimit(client, off, { enabled: false, perMinute: 1, allowlist: [] }, 2).allowed).toBe(true);
    expect(publicRateLimit(client, off, { enabled: false, perMinute: 1, allowlist: [] }, 2).allowed).toBe(true);

    // Gedrosselt auf eine Anfrage je Minute.
    expect(publicRateLimit(client, on, { enabled: true, perMinute: 1, allowlist: [] }, 2).allowed).toBe(true);
    expect(publicRateLimit(client, on, { enabled: true, perMinute: 1, allowlist: [] }, 2).allowed).toBe(false);
  });
});

describe("getClientIp", () => {
  it("nimmt die erste weitergeleitete Adresse", () => {
    expect(getClientIp(request({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" }))).toBe("203.0.113.10");
  });

  it("faellt auf x-real-ip zurueck und sonst auf \"unknown\"", () => {
    expect(getClientIp(request({ "x-real-ip": "203.0.113.11" }))).toBe("203.0.113.11");
    expect(getClientIp(request())).toBe("unknown");
  });
});

describe("Freigabeliste", () => {
  it("nimmt eine freigegebene Adresse von jeder Grenze aus", () => {
    const client = request({ "x-forwarded-for": "203.0.113.7" });
    const key = namespace();
    const throttle = { enabled: true, perMinute: 1, allowlist: ["203.0.113.0/24"] };

    // Weit ueber der gedrosselten Grenze und ueber der Vorgabe der Route.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(publicRateLimit(client, key, throttle, 2).allowed).toBe(true);
    }
  });

  it("laesst andere Adressen weiter gegen die Grenze laufen", () => {
    const client = request({ "x-forwarded-for": "198.51.100.7" });
    const key = namespace();
    const throttle = { enabled: true, perMinute: 1, allowlist: ["203.0.113.0/24"] };

    expect(publicRateLimit(client, key, throttle, 2).allowed).toBe(true);
    expect(publicRateLimit(client, key, throttle, 2).allowed).toBe(false);
  });

  it("gibt eine Verbindung ohne erkennbare Adresse nicht frei", () => {
    // Ohne Weiterleitungs-Header zaehlt alles unter "unknown" zusammen - eine
    // Freigabe darf dort nie greifen, sonst gibt sie alle frei.
    const client = request();
    const key = namespace();
    const throttle = { enabled: true, perMinute: 1, allowlist: ["0.0.0.0/0"] };

    expect(publicRateLimit(client, key, throttle, 2).allowed).toBe(true);
    expect(publicRateLimit(client, key, throttle, 2).allowed).toBe(false);
  });
});
