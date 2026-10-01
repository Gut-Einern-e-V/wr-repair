import type { NextConfig } from "next";
import { buildDomainRedirects } from "./lib/domain-redirects";

/* Die Partnerlogos kommen aus dem oeffentlichen Bucket `partner-logos` und
   laufen durch den Bildoptimierer (components/partner-strip.tsx). Freigegeben
   ist nur dieser Bucket des eigenen Projekts, keine anderen Hosts. */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/* Sicherheits-Header fuer alle Antworten (Datenschutz-Audit, Issue #44).

   Eine volle Content-Security-Policy fehlt noch mit Absicht: Friendly
   Captcha und Vercel Analytics laden Skripte von eigenen Hosts, und eine zu
   enge Policy wuerde das Formular brechen. `frame-ancestors` steht trotzdem
   schon hier, weil es nichts mit Skripten zu tun hat - es verhindert, dass eine
   fremde Seite Backend, Buehnenziehung oder Formular in einen Rahmen legt
   (Clickjacking).

   `Referrer-Policy` schickt beim Klick auf einen fremden Link nur die Domain
   mit, nie den Pfad. Das zaehlt fuer `/reparatur/<id>`: Der Link ist privat und
   soll nicht bei verlinkten Sponsorenseiten im Log landen. Moderne Browser tun
   das zwar von sich aus, verlassen sollte sich die Seite darauf aber nicht.

   `geolocation=(self)`, weil das Formular den Standort auf Wunsch selbst
   abfragt (components/repair-submission-form.tsx). Alles andere braucht die
   Seite nicht. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()" },
];

/* Antworten der Verwaltung und Moderation enthalten Mail-Adressen,
   unveroeffentlichte Einreichungen und genaue Herkunft. Zwischengespeichert
   wird davon heute nichts, weil die Routen Cookies lesen und damit dynamisch
   sind - das haengt aber an einer Eigenschaft des Frameworks und nicht an
   einer Entscheidung. Der Header macht sie ausdruecklich, fuer Browser, CDN und
   Proxys dazwischen. */
const privateResponseHeaders = [{ key: "Cache-Control", value: "private, no-store" }];
const privateApiRoutes = ["/api/admin/:path*", "/api/moderation/:path*", "/api/notifications/:path*", "/api/auth/:path*"];

const nextConfig: NextConfig = {
  /* Die Sharepics lesen ihre Graustufenlogos zur Laufzeit von der Platte
     (components/sharepics/logos.ts). Die Dateinamen stehen dort in einer
     Tabelle, darauf verlaesst sich die Dateiverfolgung nicht - also
     ausdruecklich mitnehmen. */
  outputFileTracingIncludes: {
    "/sharepics/image": ["./components/sharepics/logos/*.png"],
    "/moderator/sharepics/image": ["./components/sharepics/logos/*.png"],
  },
  /* Alte Domains leiten mit Pfad auf NEXT_PUBLIC_SITE_URL weiter
     (lib/domain-redirects.ts). Wird beim Build gelesen - nach einer Aenderung
     neu deployen. */
  async redirects() {
    return buildDomainRedirects(process.env.NEXT_PUBLIC_SITE_URL, process.env.LEGACY_SITE_HOSTS);
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...privateApiRoutes.map((source) => ({ source, headers: privateResponseHeaders })),
    ];
  },
  images: {
    /* Die Voreinstellung von vier Stunden laesst das CDN jedes Logo mehrmals
       am Tag neu umrechnen, weil aeltere Uploads mit `max-age=3600` im Bucket
       liegen. Ein Logo aendert sich unter seinem Namen nie (UUID je Upload,
       app/api/admin/partners/route.ts) - ein neues Logo ist eine neue URL. */
    minimumCacheTTL: 2678400,
    remotePatterns: supabaseUrl
      ? [new URL("/storage/v1/object/public/partner-logos/**", supabaseUrl)]
      : [],
  },
};

export default nextConfig;
