import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSubmissionGate, retryHint, submissionLimit, throttleKey } from "./submission-gate";

function request(ip = "203.0.113.7") {
  return new Request("https://example.test/api/repairs", { headers: { "x-forwarded-for": ip } });
}

/** Minimaler Supabase-Ersatz: nur `rpc`, mehr braucht der Torwaechter nicht. */
function client(rpc: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown }) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const stub = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return rpc(name, args);
    },
  };
  return { supabase: stub as unknown as SupabaseClient, calls };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("SUBMISSION_RATE_SALT", "pfeffer");
});

describe("throttleKey", () => {
  it("erkennt dieselbe Verbindung wieder", () => {
    expect(throttleKey(request())).toBe(throttleKey(request()));
  });

  it("trennt verschiedene Verbindungen", () => {
    expect(throttleKey(request("203.0.113.7"))).not.toBe(throttleKey(request("203.0.113.8")));
  });

  /* Die Einreichungsseite sagt zu, dass die IP-Adresse nicht gespeichert wird.
     Der Schluessel landet in der Datenbank - also darf die Adresse nicht darin
     vorkommen, und ein anderes Salz muss zu einem anderen Schluessel fuehren. */
  it("enthaelt die Adresse nicht im Klartext und haengt am Salz", () => {
    const key = throttleKey(request("203.0.113.7"));
    expect(key).not.toContain("203.0.113.7");

    vi.stubEnv("SUBMISSION_RATE_SALT", "anderes-salz");
    expect(throttleKey(request("203.0.113.7"))).not.toBe(key);
  });
});

describe("submissionLimit", () => {
  /* Hohe Rate, kurzes Fenster (Issue #59): In einem Reparatur-Cafe haengen alle
     an einer IP-Adresse, und wer trotzdem ins Limit laeuft, soll nach einer
     Minute weitermachen koennen und nicht nach fuenf. */
  it("nimmt die Vorgabe, wenn die Umgebung nichts sagt", () => {
    expect(submissionLimit()).toEqual({ limit: 40, windowSeconds: 60 });
  });

  it("laesst sich ueber die Umgebung verstellen", () => {
    vi.stubEnv("SUBMISSION_RATE_LIMIT", "80");
    vi.stubEnv("SUBMISSION_RATE_WINDOW_SECONDS", "30");
    expect(submissionLimit()).toEqual({ limit: 80, windowSeconds: 30 });
  });

  it("ignoriert Unsinn statt die Einreichung zu sperren", () => {
    vi.stubEnv("SUBMISSION_RATE_LIMIT", "0");
    vi.stubEnv("SUBMISSION_RATE_WINDOW_SECONDS", "keine Zahl");
    expect(submissionLimit()).toEqual({ limit: 40, windowSeconds: 60 });
  });
});

describe("retryHint", () => {
  it("sagt bei kurzer Restzeit nicht 'in 1 Minuten'", () => {
    expect(retryHint(1)).toBe("in einer Minute");
    expect(retryHint(60)).toBe("in einer Minute");
  });

  it("rundet laengere Wartezeiten auf Minuten auf", () => {
    expect(retryHint(120)).toBe("in 2 Minuten");
    expect(retryHint(301)).toBe("in 6 Minuten");
  });
});

describe("checkSubmissionGate", () => {
  it("holt Limit und Einstellungen in einem einzigen Aufruf", async () => {
    const { supabase, calls } = client(() => ({
      data: { allowed: true, hits: 1, retryAfterSeconds: 300, settings: { record_goal: 4_242 } },
      error: null,
    }));

    const gate = await checkSubmissionGate(supabase, request());

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("submission_gate");
    expect(gate.allowed).toBe(true);
    expect(gate.persisted).toBe(true);
    // Die Einstellungen kommen aus derselben Antwort, nicht aus einer zweiten Abfrage.
    expect(gate.settings.recordGoal).toBe(4_242);
    expect(gate.hits).toBe(1);
  });

  it("gibt die Absage samt Wartezeit weiter", async () => {
    const { supabase } = client(() => ({
      data: { allowed: false, hits: 31, retryAfterSeconds: 120, settings: null },
      error: null,
    }));

    const gate = await checkSubmissionGate(supabase, request());
    /* `hits` wird durchgereicht, damit die Route genau den ersten Versuch ueber
       der Grenze protokollieren kann und nicht jeden abgewiesenen. */
    expect(gate).toMatchObject({ allowed: false, retryAfterSeconds: 120, persisted: true, hits: 31 });
  });

  /* Die Migration wird von Hand ausgerollt. Zwischen Deployment und Migration
     darf die Einreichung nicht stehenbleiben - dann greift wieder das Limit im
     Arbeitsspeicher, nur mit den neuen Zahlen. */
  it("faellt auf das Notlimit zurueck, wenn die Funktion fehlt", async () => {
    const { supabase } = client(() => ({ data: null, error: { message: 'function "submission_gate" does not exist' } }));

    const gate = await checkSubmissionGate(supabase, request("198.51.100.3"));
    expect(gate.allowed).toBe(true);
    expect(gate.persisted).toBe(false);
    // Ohne Zaehler in der Datenbank gibt es keinen Zaehlerstand zu melden.
    expect(gate.hits).toBeNull();
  });

  it("kommt ohne Datenbankverbindung nicht ins Straucheln", async () => {
    const gate = await checkSubmissionGate(null, request("198.51.100.4"));
    expect(gate.allowed).toBe(true);
    expect(gate.persisted).toBe(false);
  });
});
