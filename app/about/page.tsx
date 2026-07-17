import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "About the project | Reparaturrekord NRW" };

export default function AboutPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="about-title"><p className="eyebrow">About the project</p><h1 id="about-title">Repair is public<br /><span>infrastructure.</span></h1><p>Reparaturrekord NRW makes everyday repair visible. Each approved contribution is a small proof that durable things, practical skills and shared knowledge matter.</p></section>
    <section className="content-section two-column-copy"><div><p className="section-index">Open source</p><h2>Made to be adapted.</h2></div><div><p>This website is maintained in a public repository so other initiatives can inspect, reuse and adapt the technical approach for their own repair campaign.</p><p>The repository contains the submission flow, moderation model, Supabase migrations, deployment notes and this content system. Before operating a copy, replace the responsible organisation, legal texts, retention rules, access credentials and campaign conditions.</p><a className="button button-primary" href="https://github.com/Gut-Einern-e-V/wr-repair" target="_blank" rel="noreferrer">View the repository <span aria-hidden="true">&#8599;</span></a></div></section>
    <section className="content-section contribution-grid" aria-labelledby="contribute-title"><div><p className="section-index">Contribute</p><h2 id="contribute-title">A record is a collective effort.</h2></div><ol><li><span>01</span><p>Document a repair and submit it during the campaign period.</p></li><li><span>02</span><p>Share repair knowledge in a workshop, school or neighbourhood.</p></li><li><span>03</span><p>Improve the website, content or documentation through the repository.</p></li></ol></section>
    <section className="content-callout"><p>Reparaturrekord NRW is connected to the <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region Bergisches Staedtedreieck</a>.</p><Link className="button button-secondary" href="/supporters">Meet the supporters <span aria-hidden="true">&#8594;</span></Link></section>
    <SiteFooter />
  </main>;
}