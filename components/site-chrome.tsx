import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { getSiteLogoUrl } from "@/lib/site-logo";
import { AccessBar } from "@/components/access-bar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { FundingStrip } from "@/components/funding-strip";
import { ConsentSettingsLink } from "@/components/consent-settings-link";
import { MadeInWuppertal } from "@/components/made-in-wuppertal";
import { circularWeek, operator } from "@/lib/organisation";

const messages = getMessages();

export async function SiteHeader() {
  const logoUrl = await getSiteLogoUrl();

  return <>
    <AccessBar />
    <header className="site-header">
    <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite">{logoUrl
      // eslint-disable-next-line @next/next/no-img-element -- Logo aus Supabase Storage ohne bekannte Groesse.
      ? <img className="brand-logo" src={logoUrl} alt="" />
      : <span className="brand-mark">R</span>}<span>Reparaturrekord<br />NRW</span></Link>
    <nav aria-label="Hauptnavigation"><Link href="/stories">{messages.navigation.stories}</Link><Link href="/about">{messages.navigation.project}</Link><Link href="/supporters">{messages.navigation.supporters}</Link><Link href="/mitmachen">{messages.navigation.submit}</Link></nav>
    {/* Eigener Knopf statt eines weiteren Navigationspunkts (Issue #33): Das
        Festival ist ein Termin mit Datum, kein Dauerthema wie "Projekt" oder
        "Geschichten" - und es faellt in der Reihe gleich aussehender Links
        nicht auf. Die Unterseiten haengen darunter und stehen nicht im Kopf.

        Knopf und Live-Stand stehen zusammen in einer Gruppe: Im Kopf verteilt
        `space-between` seine Kinder ueber die ganze Breite, und als eigenes
        Kind stand der rote Knopf frei zwischen Navigation und Live-Stand -
        ohne Bezug zu beidem. In der Gruppe sitzt er da, wo die Handlungen der
        Seite sind. */}
    <div className="header-actions">
      <Link className="header-festival" href="/festival"><span>{messages.navigation.festival}</span></Link>
      <Link className="header-link" href="/stats">{messages.navigation.live}</Link>
    </div>
    <MobileNavigation />
    </header>
  </>;
}

/* Der Foerderhinweis gehoert auf jede oeffentliche Seite und steht deshalb hier,
   direkt ueber dem Footer. `funding={false}` nur dort, wo die Foerderlogos schon
   im Seiteninhalt stehen (/supporters) - zweimal auf einer Seite ist redundant. */
export function SiteFooter({ funding = true }: { funding?: boolean } = {}) {
  return <>
    {funding && <FundingStrip />}
    <footer className="site-footer">
      {/* Zwei Rollen, zwei Zeilen (Issue #78): Die Initiative liegt beim CSCP
          und gehoert zur Circular Week, die Website kommt aus der FAB Region.
          Vorher stand hier nur die FAB Region und damit der falsche Absender. */}
      <p><strong>Reparaturrekord NRW</strong><br />Eine Initiative der <a href={circularWeek.url} target="_blank" rel="noreferrer">{circularWeek.name}</a>, organisiert vom <a href={operator.website} target="_blank" rel="noreferrer">{operator.shortName}</a>.</p>
      <div><Link href="/gewinnspiel">{messages.navigation.lottery}</Link><Link href="/privacy">{messages.footer.privacy}</Link><Link href="/imprint">{messages.footer.imprint}</Link><Link href="/accessibility">{messages.footer.accessibility}</Link><Link href="/leichte-sprache">{messages.footer.easyLanguage}</Link><Link href="/open-source">{messages.footer.openSource}</Link><ConsentSettingsLink /></div>
      <p>Website der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region</a></p>
    </footer>
    <MadeInWuppertal />
  </>;
}