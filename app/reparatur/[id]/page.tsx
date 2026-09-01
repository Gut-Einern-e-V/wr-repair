import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategoryMotif } from "@/components/category-motif";
import { ShareButton } from "@/components/share-button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getPublicRepairStatus } from "@/lib/repair-status";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { buildRepairPath, buildRepairUrl, buildShareText } from "@/lib/share";

export const dynamic = "force-dynamic";

type RepairPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RepairPageProps): Promise<Metadata> {
  const repair = await getPublicRepairStatus((await params).id);

  if (!repair || repair.status !== "approved") {
    return { title: "Deine Reparatur | Reparaturrekord NRW", robots: { index: false, follow: false } };
  }

  return {
    title: `${repairCategoryLabel(repair.category)} repariert | Reparaturrekord NRW`,
    description: buildShareText(repairCategoryLabel(repair.category)),
    openGraph: {
      title: `${repairCategoryLabel(repair.category)} repariert`,
      description: buildShareText(repairCategoryLabel(repair.category)),
      url: buildRepairUrl(repair.id),
    },
  };
}

export default async function RepairStatusPage({ params }: RepairPageProps) {
  const { id } = await params;
  const repair = await getPublicRepairStatus(id);
  if (!repair) notFound();

  const categoryLabel = repairCategoryLabel(repair.category);
  const isApproved = repair.status === "approved";

  return <main className="page-shell content-page">
    <SiteHeader />
    <article className="repair-status" aria-labelledby="repair-status-title">
      <p className="brand-kicker">Deine Reparatur</p>
      <h1 className="sticker-head is-mint" id="repair-status-title">
        <span className="sticker">{isApproved ? "Freigegeben" : repair.status === "rejected" ? "Nicht gezählt" : "In Prüfung"}</span>
        <span className="sticker">{categoryLabel}</span>
      </h1>

      {isApproved ? <>
        <p className="repair-status-lead">Deine Reparatur ist freigegeben und zählt zum Weltrekordversuch. Jetzt darfst du sie teilen.</p>
        {repair.imageUrl ? <>
          {/* Signed URLs from the private bucket cannot use Next.js image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="repair-status-image" src={repair.imageUrl} alt={`Freigegebene Reparatur aus der Kategorie ${categoryLabel}`} />
        </> : <CategoryMotif category={repair.category} size={140} priority />}
        {repair.productName && <p className="repair-status-meta">{repair.productName}</p>}
        {repair.story && <p className="repair-status-story">{repair.story}</p>}
        <div className="repair-status-actions">
          <ShareButton
            title="Reparaturrekord NRW"
            text={buildShareText(categoryLabel)}
            path={buildRepairPath(repair.id)}
            label="Jetzt teilen"
          />
          <Link className="button button-secondary" href="/mitmachen">Noch eine Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
        </div>
      </> : repair.status === "rejected" ? <>
        <p className="repair-status-lead">Diese Einreichung konnte nicht freigegeben werden. Melde dich gerne bei uns, wenn du dazu Fragen hast.</p>
        <CategoryMotif category={repair.category} size={140} priority />
        {/* Offen sagen, was mit dem Foto passiert ist (Issue #58). Wer sich
            meldet, kann wieder eingesetzt werden - das Bild ist dann aber weg
            und muesste neu hochgeladen werden. */}
        <p className="form-notice">Das eingereichte Foto wurde dabei gelöscht. Wir bewahren keine Bilder auf, die nicht veröffentlicht werden.</p>
        <div className="repair-status-actions">
          <Link className="button button-primary" href="/mitmachen">Neue Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
          <a className="text-button" href="mailto:mail@gut-einern.org?subject=Reparaturrekord%20NRW%20Einreichung">Kontakt aufnehmen <span aria-hidden="true">&#8594;</span></a>
        </div>
      </> : <>
        <p className="repair-status-lead">Danke! Deine Reparatur liegt bei der Moderation. Sobald sie freigegeben ist, zählt sie zum Rekord und du kannst sie hier teilen.</p>
        {/* Solange nichts freigegeben ist, wird kein eingereichtes Bild
            gezeigt - das Motiv der Kategorie steht dafuer. */}
        <CategoryMotif category={repair.category} size={140} priority />
        <p className="form-notice">Teilen ist erst nach der Freigabe möglich – so landet nichts Ungeprüftes in den sozialen Netzwerken. Speichere dir diese Seite als Lesezeichen und schau später wieder vorbei.</p>
        <div className="repair-status-actions">
          <Link className="button button-primary" href="/mitmachen">Noch eine Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
          <Link className="text-button" href="/stats">Live-Stand ansehen <span aria-hidden="true">&#8594;</span></Link>
        </div>
      </>}
    </article>
    <SiteFooter />
  </main>;
}
