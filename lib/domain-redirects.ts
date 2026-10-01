import type { NextConfig } from "next";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/**
 * Weiterleitungen von alten Domains auf die Domain aus `NEXT_PUBLIC_SITE_URL`.
 *
 * Gedruckte Aufsteller, geteilte Reparaturlinks und installierte Apps zeigen
 * noch auf die alte Domain. Pfad und Query bleiben erhalten: Wer die alte
 * `/mitmachen` aufruft, landet auf `/mitmachen` der neuen Domain. 308, damit
 * Suchmaschinen den Umzug uebernehmen und ein POST ein POST bleibt.
 *
 * Die Liste kommt aus `LEGACY_SITE_HOSTS` (kommagetrennt), damit ein weiterer
 * Umzug nur Umgebungsvariablen braucht. Die Domain selbst steht nie darin -
 * sonst leitet sie auf sich selbst weiter.
 */
export function buildDomainRedirects(siteUrl: string | undefined, legacyHosts: string | undefined): Redirect[] {
  if (!siteUrl?.trim() || !legacyHosts?.trim()) return [];

  let target: URL;
  try {
    target = new URL(siteUrl.trim());
  } catch {
    return [];
  }
  const base = target.origin;

  const hosts = [...new Set(
    legacyHosts
      .split(",")
      .map((host) => host.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .filter((host) => host && host !== target.host),
  )];

  return hosts.map((host) => ({
    source: "/:path*",
    has: [{ type: "host", value: host }],
    destination: `${base}/:path*`,
    permanent: true,
  }));
}
