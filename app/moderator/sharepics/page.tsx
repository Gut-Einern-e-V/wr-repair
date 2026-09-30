import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { nrwKreiseList } from "@/lib/nrw-kreise-list";
import { SharepicStudio } from "./sharepic-studio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sharepics",
  robots: { index: false, follow: false },
};

/**
 * Sharepics fuer Instagram-Storys mit dem Live-Stand (siehe lib/sharepics.ts).
 *
 * Unter /moderator, weil die Bildroute daneben nur mit Moderationsrolle
 * zeichnet - und damit die Seite nie in der oeffentlichen App landet.
 */
export default async function SharepicsPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?next=/moderator/sharepics");
  }

  if (!currentAdmin.roles.some((role) => ["moderator", "admin", "superadmin"].includes(role))) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Moderationsrolle.</h1></main>;
  }

  const kreise = nrwKreiseList.map((kreis) => kreis.name).sort((a, b) => a.localeCompare(b, "de"));
  return <SharepicStudio kreise={kreise} />;
}
