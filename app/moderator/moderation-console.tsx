"use client";

import { useState } from "react";
import BackendHeader from "@/components/backend-header";
import QuickReview from "./quick-review";
import RepairTable from "./repair-table";
import PushToggle from "./push-toggle";

type Role = "moderator" | "admin" | "superadmin";

/**
 * Das Moderationsbackend kennt nur Einreichungen: die Schnellpruefung und eine
 * filterbare Tabelle. Alles Administrative liegt unter /admin (Issue #10).
 *
 * Die Schnellpruefung ist die Standardansicht - sie ist der Weg, auf dem
 * Einreichungen tatsaechlich abgearbeitet werden. Statt des Posterkopfes steht
 * nur eine schmale Leiste darueber: Auf dem Handy hat der Kopf den halben
 * Bildschirm belegt, ohne bei der Arbeit zu helfen (Issue #38).
 */
export default function ModerationConsole({ email, roles, logoUrl }: { email: string; roles: Role[]; logoUrl: string | null }) {
  const isAdmin = roles.some((role) => ["admin", "superadmin"].includes(role));
  const [view, setView] = useState<"quick" | "table">("quick");

  return (
    <main className="moderator-shell">
      <BackendHeader area="moderation" email={email} logoUrl={logoUrl} canAdminister={isAdmin} />

      <div className="moderator-bar">
        <div>
          <p className="brand-kicker">Moderation</p>
          <h1>{view === "quick" ? "Schnellprüfung" : "Tabelle"}</h1>
        </div>
        <div className="moderator-bar-actions">
          {/* Nur hier steht der Umschalter, und nur er fragt nach der
              Benachrichtigungserlaubnis. Oeffentliche Seiten fragen nie. */}
          <PushToggle />
          <div className="view-switch" role="group" aria-label="Ansicht wechseln">
            <button className={`button ${view === "quick" ? "button-primary" : "button-secondary"}`} type="button" aria-pressed={view === "quick"} onClick={() => setView("quick")}>Schnellprüfung</button>
            <button className={`button ${view === "table" ? "button-primary" : "button-secondary"}`} type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Tabelle</button>
          </div>
        </div>
      </div>

      <section className={`repair-queue${view === "quick" ? " is-quick" : ""}`} aria-label={view === "quick" ? "Schnellprüfung" : "Einreichungen"}>
        {view === "quick" ? <QuickReview showProgress={isAdmin} /> : <RepairTable isAdmin={isAdmin} />}
      </section>
    </main>
  );
}
