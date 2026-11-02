import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { loadHighlights } from "@/lib/story-highlights-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import StageShow, { type StageSlide } from "./stage-show";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bühne · Highlights",
  robots: { index: false, follow: false },
};

/* Die signierten Fotoadressen muessen einen langen Buehnenabend halten. Mit
   „R“ laedt die Ansicht neu und holt frische Adressen samt neuer Highlights. */
const STAGE_SIGN_SECONDS = 12 * 60 * 60;

/**
 * Vollbild-Diashow der geprueften Highlights fuer die Festivalbuehne.
 *
 * Unter /moderator, weil die Fotos aus dem privaten Bucket kommen und noch
 * nicht veroeffentlichte Geschichten zeigen. Auf dem Buehnenrechner einmal
 * anmelden, dann F fuer Vollbild.
 */
export default async function StagePage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?next=/moderator/buehne");
  }

  if (!currentAdmin.roles.some((role) => ["moderator", "admin", "superadmin"].includes(role))) {
    return <main className="access-denied"><p className="section-index">Kein Zugriff</p><h1>Dieses Konto hat keine Moderationsrolle.</h1></main>;
  }

  const { highlights, error } = await loadHighlights(createSupabaseAdminClient(), { statuses: ["ready", "published"], signSeconds: STAGE_SIGN_SECONDS });

  const slides: StageSlide[] = highlights.map((highlight) => ({
    id: highlight.repairId,
    title: highlight.title,
    teaser: highlight.teaser,
    category: highlight.repair.category,
    categoryLabel: highlight.repair.categoryLabel,
    kreis: highlight.repair.kreis,
    imageUrl: highlight.repair.imageUrl,
  }));

  return <StageShow slides={slides} error={error ? "Die Highlights konnten nicht geladen werden." : ""} />;
}
