import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { MobileNavigation } from "@/components/mobile-navigation";

const messages = getMessages();

export function SiteHeader() {
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
    <nav aria-label="Hauptnavigation"><Link href="/stories">{messages.navigation.stories}</Link><Link href="/about">{messages.navigation.project}</Link><Link href="/supporters">{messages.navigation.supporters}</Link></nav>
    <Link className="header-link" href="/stats">{messages.navigation.live}</Link>
    <MobileNavigation />
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
    <div><Link href="/privacy">{messages.footer.privacy}</Link><Link href="/imprint">{messages.footer.imprint}</Link><Link href="/accessibility">{messages.footer.accessibility}</Link></div>
    <p>Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region</a></p>
  </footer>;
}