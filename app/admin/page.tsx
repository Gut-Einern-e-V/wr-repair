import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import AdminConsole from "./admin-console";
import type { AdminSettings } from "./campaign-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?next=/admin");
  }

  // Moderator*innen haben hier nichts zu suchen und landen direkt bei den
  // Einreichungen; Admins und Superadmins erreichen beide Bereiche.
  if (!currentAdmin.roles.some((role) => ["admin", "superadmin"].includes(role))) {
    if (currentAdmin.roles.includes("moderator")) {
      redirect("/moderator");
    }

    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Verwaltungsrolle.</h1></main>;
  }

  const settings = await getAppSettings();
  const row = settings.row;

  const initialSettings: AdminSettings = {
    startAt: settings.submissionWindow.startAt?.toISOString() ?? null,
    endAt: settings.submissionWindow.endAt?.toISOString() ?? null,
    windowStatus: settings.submissionWindow.status,
    recordGoal: settings.recordGoal,
    dayRecord: settings.dayRecord,
    region: {
      enabled: settings.region.enabled,
      label: settings.region.label,
      ipCountry: settings.region.ipCountry,
      ipRegion: settings.region.ipRegion,
      latMin: settings.region.bounds?.latMin ?? null,
      latMax: settings.region.bounds?.latMax ?? null,
      lonMin: settings.region.bounds?.lonMin ?? null,
      lonMax: settings.region.bounds?.lonMax ?? null,
    },
    logoUrl: settings.logoUrl,
    persisted: settings.persisted,
    stored: {
      window: Boolean(row?.submission_start_at && row?.submission_end_at),
      recordGoal: row?.record_goal != null,
      dayRecord: row?.day_record != null,
      region: row?.region_label != null,
      logo: Boolean(row?.logo_path),
    },
  };

  return <AdminConsole email={currentAdmin.user.email ?? "Unbekannt"} roles={currentAdmin.roles} initialSettings={initialSettings} />;
}
