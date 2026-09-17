import { describe, expect, it } from "vitest";
import { isCaptchaSolution, needsCaptchaReset } from "./captcha-token";

describe("captcha token", () => {
  it("haelt kein Zustandswort fuer eine Loesung", () => {
    // Genau diese Werte sind als Loesungswort beim Server angekommen und haben
    // Einreichungen gekostet (Issue #107).
    for (const sentinel of [
      ".UNINITIALIZED", ".UNCONNECTED", ".UNSTARTED", ".REQUESTING", ".SOLVING",
      ".VERIFYING", ".EXPIRED", ".DESTROYED", ".ERROR", ".ERROR.UNREACHABLE", ".RESET",
    ]) {
      expect(isCaptchaSolution(sentinel)).toBe(false);
    }

    expect(isCaptchaSolution("")).toBe(false);
  });

  it("erkennt ein Loesungswort", () => {
    expect(isCaptchaSolution("eyJhbGciOiJIUzI1NiJ9.beispiel.signatur")).toBe(true);
  });

  it("verlangt einen Neustart nur dort, wo Warten nichts mehr bringt", () => {
    expect(needsCaptchaReset(".EXPIRED")).toBe(true);
    expect(needsCaptchaReset(".ERROR")).toBe(true);
    expect(needsCaptchaReset(".ERROR.UNREACHABLE")).toBe(true);
    expect(needsCaptchaReset(".DESTROYED")).toBe(true);
    expect(needsCaptchaReset(".UNCONNECTED")).toBe(true);

    // Diese loesen sich von selbst auf - ein Neustart waere hier nur eine
    // zweite Rechenaufgabe fuer dieselbe Einreichung.
    expect(needsCaptchaReset(".UNSTARTED")).toBe(false);
    expect(needsCaptchaReset(".REQUESTING")).toBe(false);
    expect(needsCaptchaReset(".SOLVING")).toBe(false);
    expect(needsCaptchaReset(".VERIFYING")).toBe(false);
  });
});
