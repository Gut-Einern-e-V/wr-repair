import { unstable_cache } from "next/cache";
import { buildAppSettings, readSettingsRow, type AppSettings } from "./app-settings";

/** Cache-Tag fuer {@link getCampaignClosed}; das Speichern der Einstellungen invalidiert ihn. */
export const CAMPAIGN_CLOSED_TAG = "campaign-closed";

/**
 * Ob die Aktion vorbei ist und die Seite als Rueckblick stehen bleibt.
 *
 * Gegenstueck zu `acceptsSubmissions`: Ein Testlauf haelt die Seite im
 * Mitmach-Modus, auch wenn der Zeitraum abgelaufen ist (Issue #102). Mit einem
 * neuen Zeitraum im Backend schaltet alles wieder auf Mitmachen um.
 */
export function campaignClosed(settings: AppSettings) {
  return settings.submissionWindow.status === "after" && !settings.testRun;
}

/**
 * {@link campaignClosed} fuer Kopf, Menue und statische Seiten.
 *
 * Wie das Logo (lib/site-logo.ts) gecacht, damit die Seiten statisch bleiben.
 * Die Stunde ist nur das Sicherheitsnetz fuer den Wechsel nach Uhr; ein
 * gespeicherter Zeitraum invalidiert den Tag sofort.
 */
export const getCampaignClosed = unstable_cache(
  async () => campaignClosed(buildAppSettings(await readSettingsRow())),
  ["campaign-closed"],
  { revalidate: 3600, tags: [CAMPAIGN_CLOSED_TAG] },
);
