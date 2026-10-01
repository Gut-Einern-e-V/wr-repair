import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWelcomeMail, buildWelcomeMailto, MODERATION_GUIDE_PATH } from "./moderation-onboarding";

const site = "https://www.reparatur-weltrekord.de";

describe("buildWelcomeMail", () => {
  it("verlinkt Login, Moderation und Anleitung auf der konfigurierten Domain", () => {
    const { body } = buildWelcomeMail({ email: "a@example.org", siteUrl: `${site}/` });
    expect(body).toContain(`${site}/login`);
    expect(body).toContain(`${site}/moderator`);
    expect(body).toContain(`${site}${MODERATION_GUIDE_PATH}`);
    expect(body).toContain("a@example.org");
  });

  it("spricht mit dem Vornamen an und kommt ohne Namen aus", () => {
    expect(buildWelcomeMail({ displayName: " Kim Muster ", email: "a@example.org", siteUrl: site }).body).toMatch(/^Hallo Kim,/);
    expect(buildWelcomeMail({ displayName: null, email: "a@example.org", siteUrl: site }).body).toMatch(/^Hallo,/);
  });

  it("enthaelt kein Passwort, nur den Hinweis auf persoenliche Uebergabe", () => {
    expect(buildWelcomeMail({ email: "a@example.org", siteUrl: site }).body).toContain("Passwort: bekommst du persönlich");
  });
});

describe("buildWelcomeMailto", () => {
  it("kodiert Empfaenger, Betreff und Text", () => {
    const url = buildWelcomeMailto({ subject: "Hallo & so", body: "Zeile 1\nZeile 2" }, "a+b@example.org");
    expect(url).toBe("mailto:a%2Bb%40example.org?subject=Hallo%20%26%20so&body=Zeile%201%0AZeile%202");
  });
});

describe("Anleitung", () => {
  it("liegt dort, wohin Mail und Verwaltung verlinken", () => {
    expect(existsSync(join(process.cwd(), "public", MODERATION_GUIDE_PATH))).toBe(true);
  });
});
