import { unstable_cache } from "next/cache";
import { publicLogoUrl, readSettingsRow } from "./app-settings";

export const SITE_LOGO_TAG = "site-logo";

/**
 * Das im Admin-Backend hinterlegte Logo fuer die oeffentlichen Seiten.
 *
 * Der Cache haelt die Seiten statisch ausgeliefert; ein Logowechsel invalidiert
 * ihn per `revalidateTag(SITE_LOGO_TAG)` sofort, spaetestens greift die Frist.
 */
export const getSiteLogoUrl = unstable_cache(
  async () => publicLogoUrl((await readSettingsRow())?.logo_path ?? null),
  ["site-logo"],
  { revalidate: 300, tags: [SITE_LOGO_TAG] },
);
