import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import ModerationConsole from "./moderation-console";

export const dynamic = "force-dynamic";

// Eigene installierbare App statt der Hauptseite (siehe lib/app-manifests.ts).
// Auf iOS ist das Voraussetzung fuer Push-Benachrichtigungen.
export const metadata = {
  title: "Moderation | Reparaturrekord NRW",
  robots: { index: false, follow: false },
  manifest: "/moderator/manifest.webmanifest",
};

export default async function ModeratorPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?next=/moderator");
  }

  if (!currentAdmin.roles.some((role) => ["moderator", "admin", "superadmin"].includes(role))) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Moderationsrolle.</h1></main>;
  }

  const settings = await getAppSettings();

  return <ModerationConsole email={currentAdmin.user.email ?? "Unbekannt"} roles={currentAdmin.roles} logoUrl={settings.logoUrl} />;
}
