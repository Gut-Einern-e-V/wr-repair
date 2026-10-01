import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { mustChangePassword, PASSWORD_PAGE_PATH, safeNextPath } from "@/lib/password-policy";
import PasswordForm from "./password-form";

export const dynamic = "force-dynamic";

// Gleiches Manifest wie die Moderation: Die Seite liegt im Rahmen der
// installierten App, damit der Pflichtwechsel nach dem ersten Login dort bleibt.
export const metadata = {
  title: "Passwort",
  robots: { index: false, follow: false },
  manifest: "/moderator/manifest.webmanifest",
};

/**
 * Eigenes Passwort aendern - fuer jede Backend-Rolle. Mit temporaerem Passwort
 * fuehrt proxy.ts hierher, bevor irgendetwas anderes geht.
 */
export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect(`/login?next=${PASSWORD_PAGE_PATH}`);
  }

  if (!currentAdmin.roles.length) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Backend-Rolle.</h1></main>;
  }

  const { next } = await searchParams;
  // /admin schickt reine Moderationskonten selbst weiter, wie nach dem Login.
  const target = safeNextPath(Array.isArray(next) ? next[0] : next) ?? "/admin";

  return <PasswordForm email={currentAdmin.user.email ?? ""} forced={mustChangePassword(currentAdmin.user)} next={target} />;
}
