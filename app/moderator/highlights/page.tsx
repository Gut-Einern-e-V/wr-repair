import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import BackendHeader from "@/components/backend-header";
import HighlightStudio from "./highlight-studio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Highlights",
  robots: { index: false, follow: false },
};

/**
 * Highlight-Geschichten finden, glaetten und freigeben (Migration
 * 202610300001). Was hier "Geprüft" ist, zeigt /moderator/buehne; was
 * "Veröffentlicht" ist, steht unter /stories.
 */
export default async function HighlightsPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?next=/moderator/highlights");
  }

  if (!currentAdmin.roles.some((role) => ["moderator", "admin", "superadmin"].includes(role))) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Moderationsrolle.</h1></main>;
  }

  const settings = await getAppSettings();
  const canAdminister = currentAdmin.roles.some((role) => ["admin", "superadmin"].includes(role));

  return <main className="moderator-shell">
    <BackendHeader area="highlights" email={currentAdmin.user.email ?? "Unbekannt"} logoUrl={settings.logoUrl} canAdminister={canAdminister} />
    <HighlightStudio />
  </main>;
}
