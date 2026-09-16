import { describe, expect, it } from "vitest";
import { isPrizeListBinding, prizeListLead, prizeQuantityRefusal, prizeRemovalRefusal, totalPrizeCount } from "./prize-list";

describe("isPrizeListBinding", () => {
  it("bindet noch nicht, solange die Teilnahme nicht begonnen hat", () => {
    expect(isPrizeListBinding({ status: "before" })).toBe(false);
  });

  it("bindet, sobald die Teilnahme laeuft", () => {
    expect(isPrizeListBinding({ status: "open" })).toBe(true);
  });

  /* Nach dem Ende steht die Ziehung noch aus - gerade dann darf niemand mehr
     einen Preis aus der Liste nehmen, auf die sich Teilnehmende verlassen
     haben. */
  it("bindet auch nach dem Ende der Teilnahme", () => {
    expect(isPrizeListBinding({ status: "after" })).toBe(true);
  });

  it("bindet nicht ohne eingestellten Zeitraum", () => {
    expect(isPrizeListBinding({ status: "invalid" })).toBe(false);
  });
});

describe("prizeRemovalRefusal", () => {
  it("laesst das Entfernen vor dem Start zu", () => {
    expect(prizeRemovalRefusal(false)).toBeNull();
  });

  it("verweigert das Entfernen ab dem Start", () => {
    expect(prizeRemovalRefusal(true)).toContain("nicht mehr entfernt");
  });
});

describe("prizeQuantityRefusal", () => {
  it("laesst jede Aenderung vor dem Start zu", () => {
    expect(prizeQuantityRefusal(false, 5, 1)).toBeNull();
  });

  it("verweigert das Verringern ab dem Start", () => {
    expect(prizeQuantityRefusal(true, 5, 4)).toContain("nicht mehr verringert");
  });

  /* Ein Preis mehr ist fuer Teilnehmende nie ein Nachteil - das bleibt offen,
     damit spaet gestiftete Preise noch dazukommen koennen. */
  it("laesst das Erhoehen auch ab dem Start zu", () => {
    expect(prizeQuantityRefusal(true, 5, 6)).toBeNull();
  });

  it("laesst eine unveraenderte Anzahl zu", () => {
    expect(prizeQuantityRefusal(true, 5, 5)).toBeNull();
  });
});

describe("totalPrizeCount", () => {
  it("zaehlt die Gewinne und nicht die Zeilen", () => {
    expect(totalPrizeCount([{ quantity: 1 }, { quantity: 10 }, { quantity: 3 }])).toBe(14);
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    expect(totalPrizeCount([])).toBe(0);
  });

  /* Die Anzahl kommt aus der Datenbank, und dort kann nach einer halb
     ausgerollten Migration alles stehen. Eine kaputte Zeile darf die Zahl auf
     der oeffentlichen Seite nicht zu "NaN Preise" machen. */
  it("ueberspringt unbrauchbare Anzahlen", () => {
    expect(totalPrizeCount([{ quantity: Number.NaN }, { quantity: -3 }, { quantity: 2 }])).toBe(2);
  });
});

describe("prizeListLead", () => {
  it("nennt vor dem Start den Stichtag und laesst die Liste offen", () => {
    const lead = prizeListLead(false, "1. Oktober 2026", 7);
    expect(lead).toContain("stehen 7 Gewinne fest");
    expect(lead).toContain("1. Oktober 2026");
    expect(lead).toContain("Ab dem Start ist die Liste verbindlich");
  });

  /* Der Satz, den die rechtliche Pruefung vorgeschlagen hat - und die Zahl,
     ohne die niemand erkennt, was er gewinnen kann (Issue #110). */
  it("nennt ab dem Start die Zahl der Gewinne und die Zusage", () => {
    const lead = prizeListLead(true, "1. Oktober 2026", 7);
    expect(lead).toContain("Unter allen gültigen Teilnahmen werden die folgenden 7 Preise verlost");
    expect(lead).toContain("gestrichen oder in der Anzahl verringert wird keiner");
  });

  it("bleibt bei einem einzigen Gewinn im Singular", () => {
    expect(prizeListLead(true, null, 1)).toContain("der folgende Preis");
    expect(prizeListLead(false, null, 1)).toContain("steht ein Gewinn fest");
  });

  it("kommt ohne eingestellten Stichtag aus", () => {
    expect(prizeListLead(false, null, 3)).not.toContain("undefined");
    expect(prizeListLead(false, null, 3)).toContain("Bis zum Start der Teilnahme können");
  });

  /* Vor dem Start stehen unten Beispiele - darauf darf der Satz verweisen.
     Ab dem Start waeren dieselben Beispiele die Irrefuehrung, die die
     Preisliste gerade verhindern soll; dann steht dort der Weg zur Auskunft. */
  it("verweist ohne Preise vor dem Start auf die Beispiele", () => {
    expect(prizeListLead(false, "1. Oktober 2026", 0)).toContain("Beispiele");
  });

  it("nennt ohne Preise ab dem Start eine Stoerung statt Beispielen", () => {
    const lead = prizeListLead(true, "1. Oktober 2026", 0);
    expect(lead).not.toContain("Beispiele");
    expect(lead).toContain("schreib uns");
  });
});
