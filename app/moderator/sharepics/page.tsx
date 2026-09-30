import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { nrwKreiseList } from "@/lib/nrw-kreise-list";
import { SharepicStudio } from "@/components/sharepics/sharepic-studio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sharepics",
  robots: { index: false, follow: false },
};

/**
 * Sharepics fuer Story und Feed mit dem Live-Stand (siehe lib/sharepics.ts).
 *
 * Unter /moderator, weil die Bildroute daneben nur mit Moderationsrolle
 * zeichnet - sie kann eigene Ueberschriften und Beispielzahlen. Die Fassung
 * fuer alle liegt unter /sharepics.
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
  return <SharepicStudio kreise={kreise} variant="moderation" />;
}
