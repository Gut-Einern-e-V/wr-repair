import { describe, expect, it } from "vitest";
import { ipCity, outsideRegionHelp } from "./outside-region-help";

function request(headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/repairs", { headers });
}

describe("Stadt aus dem Geo-Header", () => {
  it("dekodiert prozentkodierte Umlaute", () => {
    expect(ipCity(request({ "x-vercel-ip-city": "M%C3%BCnchen" }))).toBe("München");
  });

  it("nimmt einen kaputten Wert unveraendert, statt zu scheitern", () => {
    expect(ipCity(request({ "x-vercel-ip-city": "M%unchen" }))).toBe("M%unchen");
  });

  it("liefert null ohne Header", () => {
    expect(ipCity(request())).toBeNull();
  });
});

describe("Absage fuer Einreichungen von ausserhalb", () => {
  it("verweist auf die Terminsuche fuer genau diese Stadt", () => {
    const help = outsideRegionHelp(
      request({ "x-vercel-ip-country": "DE", "x-vercel-ip-city": "M%C3%BCnchen" }),
      "Nordrhein-Westfalen",
    );

    expect(help.href).toBe("https://www.reparatur-initiativen.de/termine?keyword=M%C3%BCnchen");
    expect(help.linkLabel).toContain("München");
    expect(help.message).toContain("München");
  });

  it("faellt ohne Stadt auf die allgemeine Terminsuche zurueck", () => {
    const help = outsideRegionHelp(request({ "x-vercel-ip-country": "DE" }), "Nordrhein-Westfalen");
    expect(help.href).toBe("https://www.reparatur-initiativen.de/termine");
  });

  it("schickt ausserhalb Deutschlands auf die Weltkarte", () => {
    const help = outsideRegionHelp(request({ "x-vercel-ip-country": "AT", "x-vercel-ip-city": "Wien" }), "Nordrhein-Westfalen");
    expect(help.href).toBe("https://www.repaircafe.org/de/besuchen/");
  });

  it("nennt in jeder Variante den Weg zurueck ins Formular", () => {
    const variants: Record<string, string>[] = [
      { "x-vercel-ip-country": "DE", "x-vercel-ip-city": "Kiel" },
      { "x-vercel-ip-country": "DE" },
      {},
    ];

    for (const headers of variants) {
      const help = outsideRegionHelp(request(headers), "Nordrhein-Westfalen");
      expect(help.hint).toContain("Kreis");
      expect(help.headline).toBe("Danke, dass du mitmachen willst!");
    }
  });
});
