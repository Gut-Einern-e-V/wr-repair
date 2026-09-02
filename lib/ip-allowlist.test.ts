import { describe, expect, it } from "vitest";
import { isAllowlisted, ipMatchesRule, isValidIpRule, normalizeIpRules, parseIp, MAX_ALLOWLIST_ENTRIES } from "./ip-allowlist";

describe("parseIp", () => {
  it("liest IPv4 als vier Bytes", () => {
    expect([...(parseIp("203.0.113.4") ?? [])]).toEqual([203, 0, 113, 4]);
  });

  it("liest IPv6 mit und ohne Kurzschreibweise gleich", () => {
    expect(parseIp("2001:db8::1")).toEqual(parseIp("2001:0db8:0000:0000:0000:0000:0000:0001"));
  });

  it("kuerzt eine IPv4-mapped IPv6 auf ihre vier Bytes", () => {
    // Vercel liefert dieselbe Verbindung je nach Netz in beiden Formen.
    expect(parseIp("::ffff:203.0.113.4")).toEqual(parseIp("203.0.113.4"));
  });

  it("ignoriert einen Zonenindex", () => {
    expect(parseIp("fe80::1%eth0")).toEqual(parseIp("fe80::1"));
  });

  it("weist unbrauchbare Angaben ab", () => {
    // "unknown" entsteht ohne Weiterleitungs-Header und darf nie passen.
    expect(parseIp("unknown")).toBeNull();
    expect(parseIp("")).toBeNull();
    expect(parseIp("203.0.113")).toBeNull();
    expect(parseIp("203.0.113.256")).toBeNull();
    // Fuehrende Nullen sind mehrdeutig (dezimal oder oktal) und deshalb raus.
    expect(parseIp("203.0.113.010")).toBeNull();
    expect(parseIp("2001:db8::1::2")).toBeNull();
    expect(parseIp("2001:db8:1")).toBeNull();
    expect(parseIp("2001:db8::zz")).toBeNull();
  });
});

describe("ipMatchesRule", () => {
  it("passt auf eine einzelne Adresse", () => {
    expect(ipMatchesRule("203.0.113.4", "203.0.113.4")).toBe(true);
    expect(ipMatchesRule("203.0.113.5", "203.0.113.4")).toBe(false);
  });

  it("passt auf ein IPv4-Praefix", () => {
    expect(ipMatchesRule("203.0.113.77", "203.0.113.0/24")).toBe(true);
    expect(ipMatchesRule("203.0.114.77", "203.0.113.0/24")).toBe(false);
  });

  it("rechnet auch Praefixe innerhalb eines Bytes richtig", () => {
    expect(ipMatchesRule("203.0.113.100", "203.0.113.64/26")).toBe(true);
    expect(ipMatchesRule("203.0.113.130", "203.0.113.64/26")).toBe(false);
  });

  it("passt auf ein IPv6-Praefix - der hintere Teil wechselt ohnehin", () => {
    expect(ipMatchesRule("2001:db8:1234::abcd", "2001:db8::/32")).toBe(true);
    expect(ipMatchesRule("2001:db9:1234::abcd", "2001:db8::/32")).toBe(false);
  });

  it("mischt die Familien nicht", () => {
    expect(ipMatchesRule("2001:db8::1", "0.0.0.0/0")).toBe(false);
    expect(ipMatchesRule("203.0.113.4", "::/0")).toBe(false);
  });

  it("laesst mit /0 alles derselben Familie durch", () => {
    expect(ipMatchesRule("203.0.113.4", "0.0.0.0/0")).toBe(true);
  });

  it("weist kaputte Regeln ab statt sie zu erraten", () => {
    expect(ipMatchesRule("203.0.113.4", "203.0.113.0/33")).toBe(false);
    expect(ipMatchesRule("203.0.113.4", "203.0.113.0/")).toBe(false);
    expect(ipMatchesRule("203.0.113.4", "")).toBe(false);
  });
});

describe("isValidIpRule", () => {
  it("nimmt Adressen und Praefixe an", () => {
    for (const rule of ["203.0.113.4", "203.0.113.0/24", "2001:db8::1", "2001:db8::/32", "::1"]) {
      expect(isValidIpRule(rule), rule).toBe(true);
    }
  });

  it("lehnt alles andere ab", () => {
    for (const rule of ["", "unknown", "203.0.113.0/99", "203.0.113", "example.test", "203.0.113.4/24/8"]) {
      expect(isValidIpRule(rule), rule).toBe(false);
    }
  });
});

describe("isAllowlisted", () => {
  const rules = ["203.0.113.4", "198.51.100.0/24", "2001:db8::/32"];

  it("erkennt eine freigegebene Adresse in jeder Schreibweise", () => {
    expect(isAllowlisted("203.0.113.4", rules)).toBe(true);
    expect(isAllowlisted("198.51.100.200", rules)).toBe(true);
    expect(isAllowlisted("2001:db8:abcd::7", rules)).toBe(true);
  });

  it("laesst alles andere durch die Drosselung laufen", () => {
    expect(isAllowlisted("203.0.113.5", rules)).toBe(false);
    expect(isAllowlisted("unknown", rules)).toBe(false);
    expect(isAllowlisted(null, rules)).toBe(false);
    expect(isAllowlisted("203.0.113.4", [])).toBe(false);
  });
});

describe("normalizeIpRules", () => {
  it("wirft unbrauchbare Eintraege weg statt zu scheitern", () => {
    expect(normalizeIpRules(["203.0.113.4", "kaputt", 42, "", "  198.51.100.0/24  "]))
      .toEqual(["203.0.113.4", "198.51.100.0/24"]);
  });

  it("fasst doppelte Eintraege zusammen", () => {
    expect(normalizeIpRules(["203.0.113.4", "203.0.113.4"])).toEqual(["203.0.113.4"]);
  });

  it("kommt mit allem zurecht, was keine Liste ist", () => {
    expect(normalizeIpRules(null)).toEqual([]);
    expect(normalizeIpRules("203.0.113.4")).toEqual([]);
  });

  it("deckelt die Laenge", () => {
    const many = Array.from({ length: MAX_ALLOWLIST_ENTRIES + 10 }, (_, index) => `198.51.100.${index}`);
    expect(normalizeIpRules(many)).toHaveLength(MAX_ALLOWLIST_ENTRIES);
  });
});
