"use client";

import { Analytics } from "@vercel/analytics/next";
import { useConsentFor } from "@/lib/consent-store";

/* Ohne Einwilligung wird <Analytics /> nicht gerendert, also laedt das Skript von
   va.vercel-scripts.com gar nicht erst. Ein `beforeSend`-Filter waere zu spaet:
   Die Verbindung zum Drittanbieter waere dann schon aufgebaut. */
export function ConsentAnalytics() {
  return useConsentFor("statistics") ? <Analytics /> : null;
}
