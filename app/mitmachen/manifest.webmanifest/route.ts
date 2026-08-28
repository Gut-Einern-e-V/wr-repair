import { eintragenManifest, manifestResponse } from "@/lib/app-manifests";

// Eigenes Manifest fuer die Schnelleintragung, siehe lib/app-manifests.ts.
/* Reine Konstante - statisch ausliefern statt bei jedem Abruf zu erzeugen.
   Route Handler sind in Next standardmaessig dynamisch; das Wurzelmanifest aus
   app/manifest.ts ist von sich aus statisch. */
export const dynamic = "force-static";

export function GET() {
  return manifestResponse(eintragenManifest);
}
