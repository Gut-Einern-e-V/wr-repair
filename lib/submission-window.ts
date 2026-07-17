export type SubmissionWindowStatus = "open" | "before" | "after" | "invalid";

export type SubmissionWindow = {
  status: SubmissionWindowStatus;
  startAt: Date | null;
  endAt: Date | null;
};

export function getSubmissionWindow(now = new Date()): SubmissionWindow {
  const startAt = new Date(process.env.SUBMISSION_START_AT ?? "");
  const endAt = new Date(process.env.SUBMISSION_END_AT ?? "");

  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf()) || startAt >= endAt) {
    return { status: "invalid", startAt: null, endAt: null };
  }

  if (now < startAt) return { status: "before", startAt, endAt };
  if (now > endAt) return { status: "after", startAt, endAt };
  return { status: "open", startAt, endAt };
}

export function getSubmissionWindowStatus(now = new Date()): SubmissionWindowStatus {
  return getSubmissionWindow(now).status;
}

export function isSubmissionWindowOpen(now = new Date()) {
  return getSubmissionWindowStatus(now) === "open";
}
