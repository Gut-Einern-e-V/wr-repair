import { describe, expect, it } from "vitest";
import { buildDomainRedirects } from "./domain-redirects";

const site = "https://www.reparatur-weltrekord.de";

describe("buildDomainRedirects", () => {
  it("leitet jede alte Domain mit Pfad auf die neue weiter", () => {
    expect(buildDomainRedirects(site, "reparatur.fab-bergisch.org")).toEqual([
      {
        source: "/:path*",
        has: [{ type: "host", value: "reparatur.fab-bergisch.org" }],
        destination: "https://www.reparatur-weltrekord.de/:path*",
        permanent: true,
      },
    ]);
  });

  it("verträgt Schreibweisen mit Protokoll, Schrägstrich und Leerzeichen", () => {
    const redirects = buildDomainRedirects(`${site}/`, " https://Reparatur.fab-bergisch.org/ , reparatur-weltrekord.de,");
    expect(redirects.map((redirect) => redirect.has?.[0].value)).toEqual(["reparatur.fab-bergisch.org", "reparatur-weltrekord.de"]);
    expect(redirects[0].destination).toBe("https://www.reparatur-weltrekord.de/:path*");
  });

  it("leitet die eigene Domain nie auf sich selbst weiter", () => {
    expect(buildDomainRedirects(site, "www.reparatur-weltrekord.de")).toEqual([]);
  });

  it("bleibt ohne Konfiguration still", () => {
    expect(buildDomainRedirects(undefined, "reparatur.fab-bergisch.org")).toEqual([]);
    expect(buildDomainRedirects(site, undefined)).toEqual([]);
    expect(buildDomainRedirects("keine url", "reparatur.fab-bergisch.org")).toEqual([]);
  });
});
