"use client";

import { useEffect, useState } from "react";

/**
 * Sprungmenue, das beim Scrollen oben stehen bleibt.
 *
 * Die Festivalseite ist lang; ohne Menue musste man auf dem Telefon an
 * Zeitplan und Stationen vorbei, um zur Anreise zu kommen. Der Abschnitt, in
 * dem man gerade liest, ist hervorgehoben, und das Menue rollt ihn auf dem
 * Telefon in den sichtbaren Bereich.
 */
export function FestivalJumpNav({ sections }: { sections: readonly (readonly [string, string])[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = sections.map(([id]) => document.getElementById(id)).filter((element): element is HTMLElement => element !== null);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!active) return;
    // Nur die Leiste waagerecht verschieben: scrollIntoView wuerde auch die
    // Seite bewegen und einen laufenden Sprung abbrechen.
    const link = document.querySelector<HTMLElement>(`.festival-jump a[href="#${active}"]`);
    const list = link?.closest("ul");
    if (link && list) list.scrollTo({ left: link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2 });
  }, [active]);

  return <nav className="festival-jump" aria-label="Auf dieser Seite">
    <ul>
      {sections.map(([id, label]) => (
        <li key={id}><a href={`#${id}`} aria-current={active === id ? "true" : undefined}>{label}</a></li>
      ))}
    </ul>
  </nav>;
}
