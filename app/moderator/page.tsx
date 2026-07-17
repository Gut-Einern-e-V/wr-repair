import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import ModeratorDashboard from "./moderator-dashboard";

export const dynamic = "force-dynamic";

export default async function ModeratorPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login");
  }

  if (!currentAdmin.roles.some((role) => ["moderator", "admin", "superadmin"].includes(role))) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Moderationsrolle.</h1></main>;
  }

  return <ModeratorDashboard email={currentAdmin.user.email ?? "Unbekannt"} roles={currentAdmin.roles} />;
}