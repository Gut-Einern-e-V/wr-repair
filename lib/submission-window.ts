export type SubmissionWindowStatus = "open" | "before" | "after" | "invalid";

export function getSubmissionWindowStatus(now = new Date()): SubmissionWindowStatus {
  const startAt = new Date(process.env.SUBMISSION_START_AT ?? "");
  const endAt = new Date(process.env.SUBMISSION_END_AT ?? "");

  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf()) || startAt >= endAt) {
    return "invalid";
  }

  if (now < startAt) return "before";
  if (now > endAt) return "after";
  return "open";
}

export function isSubmissionWindowOpen(now = new Date()) {
  return getSubmissionWindowStatus(now) === "open";
}
