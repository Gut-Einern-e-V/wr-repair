"use client";

import { useEffect } from "react";

/* Sanftes Einblenden beim Scrollen. Die Startzustaende setzt erst diese Komponente
   ueber `data-reveal-ready` am <html>-Element: Ohne JavaScript bleibt alles sichtbar.

   Seiten, die gar keine Bewegung wollen, tragen `data-reveal="off"` an ihrem
   Wurzelelement - die Seite in Leichter Sprache tut das (Issue #47). Das ist
   mehr als `prefers-reduced-motion`: Diese Einstellung hat kaum jemand gesetzt,
   und wer die Extraseite ansteuert, hat sich schon entschieden. */
export function ScrollReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const root = document.documentElement;
    root.dataset.revealReady = "true";

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });

    const selector = "main > section, .content-section, .content-callout, .funding-note, .story-list-item, .story-card, .supporter-card";
    const observed = new Set<Element>();
    function observeAll() {
      for (const element of document.querySelectorAll(selector)) {
        if (observed.has(element)) continue;
        if (element.closest('[data-reveal="off"]')) continue;
        observed.add(element);
        element.classList.add("reveal-item");
        observer.observe(element);
      }
    }

    observeAll();
    // Galerie, Statistik und Geschichten werden nachgeladen; neue Karten sollen mitziehen.
    const mutations = new MutationObserver(() => observeAll());
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      delete root.dataset.revealReady;
    };
  }, []);

  return null;
}
