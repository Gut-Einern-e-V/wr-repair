import { afterEach, describe, expect, it } from "vitest";
import { isPushConfigured, missingPushConfig, notifyModerators } from "./push";

/* Die wichtigste Eigenschaft ist nicht, dass Push funktioniert, sondern dass
   sein Fehlen niemandem schadet: `notifyModerators` haengt in app/api/repairs
   an einer Einreichung. Wirft es, waere die Reparatur gespeichert, aber der
   Request kaputt - und das auf jedem Deployment ohne VAPID-Schluessel. */

const KEYS = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function setKeys(values: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => setKeys(original));

describe("push configuration", () => {
  it("counts as unconfigured unless all three values are present", () => {
    setKeys({});
    expect(isPushConfigured()).toBe(false);

    // Teilkonfiguration ist wertlos: Ohne privaten Schluessel kann der Server
    // nicht signieren, ohne subject weisen Push-Dienste die Anfrage ab.
    setKeys({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public" });
    expect(isPushConfigured()).toBe(false);

    setKeys({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private" });
    expect(isPushConfigured()).toBe(false);

    setKeys({
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:test@example.org",
    });
    expect(isPushConfigured()).toBe(true);
  });
});

describe("missingPushConfig", () => {
  it("names exactly the values that are absent", () => {
    setKeys({});
    expect(missingPushConfig()).toEqual([
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_SUBJECT",
    ]);

    /* Der Fall, an dem die erste Einrichtung haengen blieb: oeffentlicher
       Schluessel gesetzt, Serverpaar nicht. Die Meldung muss beide nennen. */
    setKeys({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public" });
    expect(missingPushConfig()).toEqual(["VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]);

    setKeys({
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:test@example.org",
    });
    expect(missingPushConfig()).toEqual([]);
  });
});

describe("notifyModerators without configuration", () => {
  it("gives up quietly instead of throwing", async () => {
    setKeys({});

    await expect(
      notifyModerators({ title: "Neue Eintragung", count: 1, url: "/moderator" }),
    ).resolves.toEqual({ sent: 0, removed: 0, state: "unconfigured" });
  });

  it("does not reach the database when keys are missing", async () => {
    /* Reihenfolge im Code: erst Schluessel pruefen, dann Supabase-Client bauen.
       Ohne Supabase-Variablen wuerde createSupabaseAdminClient() werfen - dass
       hier trotzdem sauber "unconfigured" zurueckkommt, beweist die Reihenfolge. */
    setKeys({});
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const result = await notifyModerators({ title: "x", count: 2, url: "/moderator" });
      expect(result.state).toBe("unconfigured");
      expect(result.sent).toBe(0);
    } finally {
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });
});
