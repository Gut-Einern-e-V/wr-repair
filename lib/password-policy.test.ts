import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, MIN_PASSWORD_LENGTH, mustChangePassword, passwordProblem, PASSWORD_PAGE_PATH, safeNextPath, withMustChangePassword } from "./password-policy";

describe("mustChangePassword", () => {
  it("greift nur bei ausdruecklich gesetzter Markierung", () => {
    expect(mustChangePassword({ app_metadata: { must_change_password: true } })).toBe(true);
    expect(mustChangePassword({ app_metadata: { must_change_password: "true" } })).toBe(false);
    expect(mustChangePassword({ app_metadata: {} })).toBe(false);
    expect(mustChangePassword(null)).toBe(false);
  });

  it("laesst die uebrigen app_metadata stehen", () => {
    expect(withMustChangePassword({ provider: "email", providers: ["email"] }, true)).toEqual({ provider: "email", providers: ["email"], must_change_password: true });
    expect(withMustChangePassword(undefined, false)).toEqual({ must_change_password: false });
  });
});

describe("passwordProblem", () => {
  it("verlangt Mindestlaenge und Uebereinstimmung", () => {
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/mindestens/);
    expect(passwordProblem("a".repeat(73))).toMatch(/höchstens/);
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH), "b".repeat(MIN_PASSWORD_LENGTH))).toMatch(/stimmen nicht/);
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH), "a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });
});

describe("generateTemporaryPassword", () => {
  it("erzeugt vier Gruppen ohne verwechselbare Zeichen", () => {
    for (let index = 0; index < 50; index += 1) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/);
      expect(password).not.toMatch(/[0O1lI]/);
      expect(passwordProblem(password)).toBeNull();
    }
  });

  it("verwirft Bytes, die die Verteilung verzerren wuerden", () => {
    // 255 liegt oberhalb des letzten vollen Durchlaufs des Alphabets und faellt
    // weg; die fehlende sechzehnte Stelle kommt aus dem naechsten Abruf.
    const bytes = [255, ...Array.from({ length: 15 }, (_, index) => index)];
    expect(generateTemporaryPassword(() => Uint8Array.from(bytes))).toBe("abcd-efgh-ijkm-npqa");
  });
});

describe("safeNextPath", () => {
  it("laesst nur interne Pfade durch und nie die Passwortseite selbst", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("//fremd.example")).toBeNull();
    expect(safeNextPath("https://fremd.example")).toBeNull();
    expect(safeNextPath(PASSWORD_PAGE_PATH)).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
