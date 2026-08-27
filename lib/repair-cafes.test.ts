import { describe, expect, it } from "vitest";
import { cityEventsUrl, repairCafeCities, repairCafeDirectories } from "./repair-cafes";

describe("Repair-Cafe-Verzeichnisse", () => {
  it("verlinkt nur ueber HTTPS und nennt zu jedem Eintrag einen Linktext", () => {
    for (const directory of repairCafeDirectories) {
      expect(directory.href.startsWith("https://")).toBe(true);
      expect(directory.name.trim()).not.toBe("");
      expect(directory.detail.trim()).not.toBe("");
      expect(directory.linkLabel.trim()).not.toBe("");
    }
  });

  it("filtert die Terminsuche auf Nordrhein-Westfalen", () => {
    const network = repairCafeDirectories.find((directory) => directory.id === "netzwerk");
    expect(network?.href).toBe("https://www.reparatur-initiativen.de/termine?provinceId=10");
  });
});

describe("Staedtelinks", () => {
  it("kodiert Umlaute fuer die Terminsuche", () => {
    expect(cityEventsUrl("Köln")).toBe("https://www.reparatur-initiativen.de/termine?keyword=K%C3%B6ln");
    expect(cityEventsUrl("Mönchengladbach")).toBe("https://www.reparatur-initiativen.de/termine?keyword=M%C3%B6nchengladbach");
  });

  it("nennt jede Stadt nur einmal und enthaelt das Bergische Staedtedreieck", () => {
    expect(new Set(repairCafeCities).size).toBe(repairCafeCities.length);
    for (const city of ["Wuppertal", "Solingen", "Remscheid"]) {
      expect(repairCafeCities).toContain(city);
    }
  });
});
