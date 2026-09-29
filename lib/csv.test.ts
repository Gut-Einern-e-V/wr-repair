import { describe, expect, it } from "vitest";
import { escapeCsv } from "./csv";

describe("CSV-Felder der Exporte", () => {
  it("setzt Anfuehrungszeichen und verdoppelt innere", () => {
    expect(escapeCsv('Toaster "Retro"')).toBe('"Toaster ""Retro"""');
    expect(escapeCsv(null)).toBe('""');
    expect(escapeCsv(42)).toBe('"42"');
  });

  it("entschaerft Felder, die eine Tabellenkalkulation als Formel liest", () => {
    for (const text of ["=HYPERLINK(\"x\")", "+1", "-1+1", "@SUM(A1)", "\t=1", "\r=1"]) {
      expect(escapeCsv(text).startsWith("\"'")).toBe(true);
    }
  });

  it("laesst gewoehnlichen Text unveraendert", () => {
    expect(escapeCsv("Kaffeemaschine entkalkt")).toBe('"Kaffeemaschine entkalkt"');
  });
});
