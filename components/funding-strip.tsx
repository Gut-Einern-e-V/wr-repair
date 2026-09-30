import NextImage from "next/image";
import { fundingGroups } from "@/lib/funding";

/* Die beiden Logogruppen aus lib/funding.ts. Steht in der Foerderleiste im
   Footer und auf /supporters. */
export function FundingLogos() {
  return <div className="funding-logos">
    {fundingGroups.map((group) => <div key={group.key} className="funding-group">
      <p>{group.label}</p>
      <div className="funding-group-logos">
        {group.logos.map((logo) => <a key={logo.src} className={`funding-logo ${logo.className}`} href={logo.href} target="_blank" rel="noreferrer">
          <NextImage src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} sizes="360px" />
        </a>)}
      </div>
    </div>)}
  </div>;
}

/* Foerderleiste im Footer. */
export function FundingStrip() {
  return <section className="funding-strip" aria-label="Förderhinweis">
    <FundingLogos />
  </section>;
}
