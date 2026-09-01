import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { getSiteLogoUrl } from "@/lib/site-logo";
import { MobileNavigation } from "@/components/mobile-navigation";
import { FundingStrip } from "@/components/funding-strip";
import { ConsentSettingsLink } from "@/components/consent-settings-link";

const messages = getMessages();

export async function SiteHeader() {
  const logoUrl = await getSiteLogoUrl();

  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite">{logoUrl
      // eslint-disable-next-line @next/next/no-img-element -- Logo aus Supabase Storage ohne bekannte Groesse.
      ? <img className="brand-logo" src={logoUrl} alt="" />
      : <span className="brand-mark">R</span>}<span>Reparaturrekord<br />NRW</span></Link>
    <nav aria-label="Hauptnavigation"><Link href="/stories">{messages.navigation.stories}</Link><Link href="/about">{messages.navigation.project}</Link><Link href="/supporters">{messages.navigation.supporters}</Link><Link href="/mitmachen">{messages.navigation.submit}</Link></nav>
    <Link className="header-link" href="/stats">{messages.navigation.live}</Link>
    <MobileNavigation />
  </header>;
}

/* Der Foerderhinweis gehoert auf jede oeffentliche Seite und steht deshalb hier,
   direkt ueber dem Footer. Die Startseite bindet ihn selbst ein, weil sie ihren
   eigenen Footer rendert. `funding={false}` nur dort, wo die Foerderlogos schon
   im Seiteninhalt stehen (/supporters) - zweimal auf einer Seite ist redundant. */
export function SiteFooter({ funding = true }: { funding?: boolean } = {}) {
  return <>
    {funding && <FundingStrip />}
    <footer className="site-footer">
      <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
      <div><Link href="/gewinnspiel">{messages.navigation.lottery}</Link><Link href="/privacy">{messages.footer.privacy}</Link><Link href="/imprint">{messages.footer.imprint}</Link><Link href="/accessibility">{messages.footer.accessibility}</Link><ConsentSettingsLink /></div>
      <p>Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region</a></p>
    </footer>
  </>;
}