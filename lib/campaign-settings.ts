import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSubmissionWindow, type SubmissionWindow } from "@/lib/submission-window";

export type CampaignSettings = {
  startAt: Date | null;
  endAt: Date | null;
};

function parseWindow(startAt: string | null, endAt: string | null): SubmissionWindow | null {
  const start = new Date(startAt ?? "");
  const end = new Date(endAt ?? "");

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end) {
    return null;
  }

  const now = new Date();
  return {
    status: now < start ? "before" : now > end ? "after" : "open",
    startAt: start,
    endAt: end,
  };
}

export async function getConfiguredSubmissionWindow(): Promise<SubmissionWindow> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("campaign_settings")
      .select("submission_start_at, submission_end_at")
      .eq("id", true)
      .maybeSingle();

    if (data) {
      const window = parseWindow(data.submission_start_at, data.submission_end_at);
      if (window) return window;
    }
  } catch {
    // Environment variables retain a fail-closed fallback until the database is configured.
  }

  return getSubmissionWindow();
}

export async function getCampaignSettings(): Promise<CampaignSettings> {
  const window = await getConfiguredSubmissionWindow();
  return { startAt: window.startAt, endAt: window.endAt };
}
