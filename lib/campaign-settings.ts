import { getAppSettings } from "./app-settings";
import type { SubmissionWindow } from "./submission-window";

export type CampaignSettings = {
  startAt: Date | null;
  endAt: Date | null;
};

/**
 * Der Einreichungszeitraum, wie ihn das Admin-Backend hinterlegt hat. Ohne
 * gespeicherten Zeitraum gelten weiterhin die Umgebungsvariablen.
 */
export async function getConfiguredSubmissionWindow(): Promise<SubmissionWindow> {
  return (await getAppSettings()).submissionWindow;
}

export async function getCampaignSettings(): Promise<CampaignSettings> {
  const window = await getConfiguredSubmissionWindow();
  return { startAt: window.startAt, endAt: window.endAt };
}
