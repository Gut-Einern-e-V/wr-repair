import { describe, expect, it } from "vitest";
import { faqEntries, goalRecord, repairRecords } from "./repair-records";

describe("Rekordzahlen", () => {
  it("nennt zu jeder fremden Bestmarke eine oeffentlich pruefbare Quelle", () => {
    for (const record of repairRecords) {
      expect(record.value.trim()).not.toBe("");
      expect(record.label.trim()).not.toBe("");
      expect(record.detail.trim()).not.toBe("");
      expect(record.source?.label.trim()).not.toBe("");
      expect(record.source?.href.startsWith("https://")).toBe(true);
    }
  });

  it("nutzt eindeutige Bezeichnungen, damit die Liste stabil rendert", () => {
    const labels = [...repairRecords.map((record) => record.label), goalRecord(3_177)?.label];
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("Zielkachel", () => {
  it("nennt die eingestellte Zielzahl statt einer festen (Issue #74)", () => {
    expect(goalRecord(2_532)?.value).toBe("2.532");
    expect(goalRecord(12_000)?.value).toBe("12.000");
  });

  it("bleibt ohne Quellenangabe - das eigene Ziel belegt keine fremde Marke", () => {
    expect(goalRecord(500)?.source).toBeUndefined();
  });

  it("entfaellt, solange kein Ziel bekannt ist", () => {
    expect(goalRecord(null)).toBeNull();
    expect(goalRecord(0)).toBeNull();
  });
});

describe("Haeufige Fragen", () => {
  it("stellt jede Frage nur einmal und beantwortet sie", () => {
    const questions = faqEntries.map((entry) => entry.question);
    expect(new Set(questions).size).toBe(questions.length);
    for (const entry of faqEntries) {
      expect(entry.answer.trim()).not.toBe("");
    }
  });
});
