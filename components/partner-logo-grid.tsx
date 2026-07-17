"use client";

import { useEffect, useState } from "react";
import { defaultPartners, type Partner } from "@/lib/default-partners";

export function PartnerLogoGrid() {
  const [partners, setPartners] = useState<Partner[]>(defaultPartners);

  useEffect(() => {
    void fetch("/api/partners")
      .then(async (response) => {
        if (!response.ok) return defaultPartners;
        const data = await response.json() as { partners?: Partner[] };
        return data.partners?.length ? data.partners : defaultPartners;
      })
      .then(setPartners)
      .catch(() => setPartners(defaultPartners));
  }, []);

  return <div className="supporter-grid">{partners.map((partner) => <a className="supporter-card" href={partner.websiteUrl} target="_blank" rel="noreferrer" key={partner.id} aria-label={`${partner.name} öffnen`} title={partner.name}>
    {/* Partner assets originate from local public files or the public partner-logos bucket. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={partner.logoUrl} alt="" />
    <span className="supporter-name">{partner.name}</span>
  </a>)}</div>;
}
