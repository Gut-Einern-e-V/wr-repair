import { describe, expect, it } from "vitest";
import { faqEntries, repairRecords } from "./repair-records";

describe("Rekordzahlen", () => {
  it("nennt zu jeder Zahl eine oeffentlich pruefbare Quelle", () => {
    for (const record of repairRecords) {
      expect(record.value.trim()).not.toBe("");
      expect(record.label.trim()).not.toBe("");
      expect(record.detail.trim()).not.toBe("");
      expect(record.source.label.trim()).not.toBe("");
      expect(record.source.href.startsWith("https://")).toBe(true);
    }
  });

  it("nutzt eindeutige Bezeichnungen, damit die Liste stabil rendert", () => {
    const labels = repairRecords.map((record) => record.label);
    expect(new Set(labels).size).toBe(labels.length);
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
