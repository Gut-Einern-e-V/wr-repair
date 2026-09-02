import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import TombolaStage from "./tombola-stage";

export const dynamic = "force-dynamic";

/**
 * Die Ziehung der Hauptpreise auf der Buehne (Issue #45).
 *
 * Eine eigene Seite und kein Bereich im Backend: Sie laeuft auf einem Beamer
 * vor Publikum, also ohne Verwaltungsmenue, ohne Tabellen und in Groessen, die
 * aus zehn Metern lesbar sind. Was sie zeigt, ist die Geschichte hinter der
 * Reparatur - Kreis, Gegenstand, Text -, nicht die E-Mail-Adresse: Die gehoert
 * nicht auf eine Leinwand.
 *
 * Zugang wie das Backend: Wer hier zieht, aendert echte Gewinne. Die Seite
 * bleibt aus jedem Suchindex.
 */
export const metadata = {
  title: "Bühnenziehung",
  robots: { index: false, follow: false },
};

export default async function TombolaPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?next=/tombola");
  }

  if (!currentAdmin.roles.includes("superadmin")) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Die Bühnenziehung ist Superadmins vorbehalten.</h1></main>;
  }

  return <TombolaStage />;
}
