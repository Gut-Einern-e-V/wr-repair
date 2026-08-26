import { afterEach, describe, expect, it } from "vitest";
import { buildRepairPath, buildRepairUrl, buildShareText, getSiteUrl, isRepairId } from "./share";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function setSiteUrl(value?: string) {
  if (value) process.env.NEXT_PUBLIC_SITE_URL = value;
  else delete process.env.NEXT_PUBLIC_SITE_URL;
}

afterEach(() => setSiteUrl(originalSiteUrl));

describe("share links", () => {
  it("prefers the configured site URL so a domain change only happens in one place", () => {
    setSiteUrl("https://reparatur.fab-bergisch.org/");
    expect(getSiteUrl("https://preview.example")).toBe("https://reparatur.fab-bergisch.org");
    expect(buildRepairUrl("11111111-2222-4333-8444-555555555555")).toBe(
      "https://reparatur.fab-bergisch.org/reparatur/11111111-2222-4333-8444-555555555555",
    );
  });

  it("falls back to the current origin when no site URL is configured", () => {
    setSiteUrl();
    expect(getSiteUrl("https://preview.example/")).toBe("https://preview.example");
    expect(buildRepairUrl("11111111-2222-4333-8444-555555555555", "https://preview.example")).toBe(
      "https://preview.example/reparatur/11111111-2222-4333-8444-555555555555",
    );
    expect(getSiteUrl()).toBe("");
  });

  it("exposes the repair path so the browser can build an absolute link", () => {
    expect(buildRepairPath("11111111-2222-4333-8444-555555555555")).toBe("/reparatur/11111111-2222-4333-8444-555555555555");
  });

  it("accepts only repair ids in UUID form", () => {
    expect(isRepairId("11111111-2222-4333-8444-555555555555")).toBe(true);
    expect(isRepairId("../../etc/passwd")).toBe(false);
    expect(isRepairId("")).toBe(false);
  });

  it("names the category in the share text when it is known", () => {
    expect(buildShareText("Fahrrad")).toContain("Fahrrad");
    expect(buildShareText()).toContain("Reparaturrekord NRW");
  });
});
