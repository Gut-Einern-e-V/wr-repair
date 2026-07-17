import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

let namespaceIndex = 0;

function namespace() {
  namespaceIndex += 1;
  return `test-${namespaceIndex}`;
}

function request(headers: HeadersInit = {}) {
  return new Request("https://example.test/api/repairs", { headers });
}

afterEach(() => vi.useRealTimers());

describe("rate limit", () => {
  it("blocks a client after the configured number of attempts", () => {
    const key = namespace();
    const client = request({ "x-forwarded-for": "203.0.113.4" });

    expect(rateLimit(client, key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit(client, key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit(client, key, { limit: 2, windowMs: 60_000 })).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("uses the first forwarded address and isolates namespaces", () => {
    const key = namespace();
    const firstClient = request({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    const secondClient = request({ "x-forwarded-for": "203.0.113.11, 10.0.0.1" });

    expect(rateLimit(firstClient, key, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit(firstClient, key, { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(secondClient, key, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("opens a new window after expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:00:00.000Z"));
    const key = namespace();
    const client = request({ "x-real-ip": "203.0.113.12" });

    expect(rateLimit(client, key, { limit: 1, windowMs: 15_000 }).allowed).toBe(true);
    expect(rateLimit(client, key, { limit: 1, windowMs: 15_000 }).allowed).toBe(false);

    vi.advanceTimersByTime(15_000);
    expect(rateLimit(client, key, { limit: 1, windowMs: 15_000 }).allowed).toBe(true);
  });
});