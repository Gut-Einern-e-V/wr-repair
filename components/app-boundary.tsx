"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { appScopeFor } from "@/lib/app-manifests";

/* Wechsel zwischen den installierbaren Apps laden das Dokument neu.

   Safari liest das Manifest nur einmal pro geladenem Dokument, das
   apple-touch-icon aber erst beim "Zum Home-Bildschirm". Kam man per
   Client-Navigation etwa von `/` auf /mitmachen, lag danach das gruene Plus auf
   dem Home-Bildschirm, geoeffnet hat es aber die Startseite - mit dem Manifest
   des ersten Dokuments. Genauso bei /moderator und /admin, je nachdem, ob man
   die Seite frisch geladen hatte oder hineinnavigiert war.

   Deshalb gilt: Ein Link in eine andere App ist ein normaler Seitenaufruf. Der
   Klick wird vor React abgefangen, sodass `next/link` ihn gar nicht sieht und der
   Browser dem `href` selbst folgt. Das deckt jeden Link ab, auch kuenftige, ohne
   dass jemand daran denken muss. Was trotzdem per Client-Navigation ueber die
   Grenze kommt - Zurueck-Taste, `redirect()` -, laedt beim Ankommen einmal nach. */
export function AppBoundary() {
  const pathname = usePathname();
  // Das Root-Layout bleibt ueber Client-Navigationen stehen, der erste Wert ist
  // also der des geladenen Dokuments.
  const documentApp = useRef(appScopeFor(pathname));

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin) return;
      if (appScopeFor(url.pathname) !== documentApp.current) event.stopPropagation();
    }
    // Capture am document laeuft vor Reacts Listener am Wurzelknoten.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (appScopeFor(pathname) !== documentApp.current) location.reload();
  }, [pathname]);

  return null;
}
