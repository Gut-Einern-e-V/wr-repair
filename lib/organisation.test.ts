import { describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL,
  DEVELOPER_EMAIL,
  mailto,
  operator,
  operatorAddressLine,
  projectCredits,
} from "./organisation";

describe("Kontaktadressen", () => {
  it("trennt die Projektadresse von der Adresse fuer Schnittstelle und Quelltext", () => {
    expect(CONTACT_EMAIL).toBe("reparatur@cscp.org");
    expect(DEVELOPER_EMAIL).toBe("mail@gut-einern.org");
    expect(CONTACT_EMAIL).not.toBe(DEVELOPER_EMAIL);
  });

  it("kodiert den Betreff, damit ein Kaufmanns-Und ihn nicht abschneidet", () => {
    expect(mailto(CONTACT_EMAIL)).toBe("mailto:reparatur@cscp.org");
    expect(mailto(CONTACT_EMAIL, "Repair & Share Festival – Anreise")).toBe(
      "mailto:reparatur@cscp.org?subject=Repair%20%26%20Share%20Festival%20%E2%80%93%20Anreise",
    );
  });
});

describe("Betreiberangaben", () => {
  it("uebernimmt die Pflichtangaben aus dem CSCP-Impressum", () => {
    expect(operator.legalName).toContain("gGmbH");
    expect(operator.registerNumber).toBe("HRB 20060");
    expect(operator.registerCourt).toBe("Amtsgericht Wuppertal");
    expect(operator.vatId).toBe("DE250910282");
    expect(operatorAddressLine).toBe("Hagenauer Str. 30, 42107 Wuppertal");
  });

  it("laesst keine Pflichtangabe leer - eine luecke im Impressum ist abmahnfaehig", () => {
    for (const [key, value] of Object.entries(operator)) {
      expect(value.trim(), `operator.${key}`).not.toBe("");
    }
  });
});

describe("Projektbeteiligte", () => {
  it("nennt Initiative, Website und Programmierung getrennt", () => {
    expect(projectCredits.map((credit) => credit.role)).toEqual(["Initiative", "Website", "Programmierung"]);
  });

  it("gibt jeder Rolle einen Namen, einen Satz und ein Ziel", () => {
    for (const credit of projectCredits) {
      expect(credit.name.trim().length).toBeGreaterThan(0);
      expect(credit.description.trim().length).toBeGreaterThan(0);
      expect(credit.url).toMatch(/^https:\/\//);
    }
  });

  it("haelt die Kurzform kurz genug fuer eine Knopfbeschriftung", () => {
    for (const credit of projectCredits) {
      expect(credit.shortName.length, credit.role).toBeLessThanOrEqual(14);
      expect(credit.name).toContain(credit.shortName);
    }
  });
});
