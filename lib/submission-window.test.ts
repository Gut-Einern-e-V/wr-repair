import { afterEach, describe, expect, it } from "vitest";
import { getSubmissionWindow, getSubmissionWindowStatus, isSubmissionWindowOpen } from "./submission-window";

const originalStartAt = process.env.SUBMISSION_START_AT;
const originalEndAt = process.env.SUBMISSION_END_AT;

function setWindow(startAt?: string, endAt?: string) {
  if (startAt) process.env.SUBMISSION_START_AT = startAt;
  else delete process.env.SUBMISSION_START_AT;

  if (endAt) process.env.SUBMISSION_END_AT = endAt;
  else delete process.env.SUBMISSION_END_AT;
}

afterEach(() => setWindow(originalStartAt, originalEndAt));

describe("submission window", () => {
  it("fails closed for missing, malformed, or reversed configuration", () => {
    setWindow();
    expect(getSubmissionWindowStatus()).toBe("invalid");

    setWindow("not-a-date", "2026-10-02T12:00:00.000Z");
    expect(getSubmissionWindowStatus()).toBe("invalid");

    setWindow("2026-10-03T12:00:00.000Z", "2026-10-02T12:00:00.000Z");
    expect(getSubmissionWindowStatus()).toBe("invalid");
  });

  it("reports before, open, and after states from the same configured window", () => {
    setWindow("2026-10-01T08:00:00.000Z", "2026-10-03T18:00:00.000Z");

    expect(getSubmissionWindowStatus(new Date("2026-10-01T07:59:59.000Z"))).toBe("before");
    expect(getSubmissionWindowStatus(new Date("2026-10-02T12:00:00.000Z"))).toBe("open");
    expect(getSubmissionWindowStatus(new Date("2026-10-03T18:00:01.000Z"))).toBe("after");
    expect(isSubmissionWindowOpen(new Date("2026-10-02T12:00:00.000Z"))).toBe(true);
  });

  it("only exposes dates for a valid configuration", () => {
    setWindow();
    expect(getSubmissionWindow()).toEqual({ status: "invalid", startAt: null, endAt: null });
  });
});