"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  ["/stories", "Geschichten"],
  ["/about", "Projekt"],
  ["/supporters", "Unterstützer"],
  ["/stats", "Live-Stand"],
] as const;

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return <div className="mobile-navigation">
    <button className="mobile-nav-toggle" type="button" aria-expanded={isOpen} aria-controls="mobile-navigation-panel" onClick={() => setIsOpen((open) => !open)}>
      <span className="sr-only">{isOpen ? "Menue schliessen" : "Menue oeffnen"}</span>
      <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
    </button>
    {isOpen && <nav className="mobile-nav-panel" id="mobile-navigation-panel" aria-label="Mobile Hauptnavigation">
      {links.map(([href, label]) => <Link href={href} key={href} onClick={() => setIsOpen(false)}>{label}</Link>)}
    </nav>}
  </div>;
}
