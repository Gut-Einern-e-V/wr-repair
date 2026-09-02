import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import AdminConsole from "./admin-console";
import type { AdminSettings } from "./campaign-panel";

export const dynamic = "force-dynamic";

// Backend gehoert in keinen Suchindex (Issue #67), wie schon bei /moderator.
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

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
  /* Die Adresse dieses Aufrufs - fuer den Knopf "meine Adresse eintragen" in
     der Freigabeliste (Issue #80). Wird nur angezeigt, nie gespeichert. */
  const clientIp = clientIpFromHeaders(await headers());

  const initialSettings: AdminSettings = {
    startAt: settings.submissionWindow.startAt?.toISOString() ?? null,
    endAt: settings.submissionWindow.endAt?.toISOString() ?? null,
    windowStatus: settings.submissionWindow.status,
    recordGoal: settings.recordGoal,
    dayRecord: settings.dayRecord,
    rateLimit: settings.publicThrottle,
    clientIp,
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
      rateLimit: row?.rate_limit_enabled != null,
      region: row?.region_label != null,
      logo: Boolean(row?.logo_path),
    },
  };

  return <AdminConsole email={currentAdmin.user.email ?? "Unbekannt"} roles={currentAdmin.roles} initialSettings={initialSettings} />;
}
