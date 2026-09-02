import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/share";

/**
 * robots.txt (Issue #67).
 *
 * Zwei Ziele auf einmal:
 *
 * - Suchmaschinen und LLM-Crawler sollen die oeffentlichen Seiten finden. Das
 *   Projekt lebt davon, gefunden zu werden - auch von Assistenten, die Fragen
 *   nach Repair Cafes in NRW beantworten. Deshalb steht hier keine pauschale
 *   Sperre fuer KI-Bots, sondern eine ausdrueckliche Erlaubnis: Manche von
 *   ihnen lesen `Disallow: /` einer Gruppe strenger als noetig, und ein eigener
 *   Eintrag laesst keinen Zweifel.
 * - Das Backend, die API und die Einzelseiten von Einreichungen bleiben
 *   draussen. Sie enthalten nichts, was in einen Index gehoert, und
 *   `/reparatur/<id>` ist der private Link an die einreichende Person.
 *
 * robots.txt ist eine Bitte, keine Sperre. Wer sich nicht daran haelt, wird
 * davon nicht aufgehalten - die Zugriffskontrolle sitzt in den Routen selbst
 * (siehe lib/admin-auth.ts und lib/rate-limit.ts).
 */

/* Nicht indexieren: Backend, API, Druckvorlage und die privaten Statuslinks.
   `/stats` bleibt drin - der Live-Stand ist oeffentlich und ein guter Einstieg. */
const closedPaths = [
  "/admin",
  "/moderator",
  // Die Buehnenziehung des Gewinnspiels (Issue #45) - Backend im Vollbild.
  "/tombola",
  "/login",
  "/api/",
  "/reparatur/",
  "/aufsteller",
];

/* Crawler, die Antworten von Assistenten mit Quellen versorgen. Sie bekommen
   dieselben Regeln wie alle anderen, nur ausdruecklich. */
const assistantAgents = [
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Bingbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: closedPaths },
      { userAgent: assistantAgents, allow: "/", disallow: closedPaths },
    ],
    /* Ohne konfigurierte Domain (lokal, Vorschau-Deploys) bleibt der Verweis
       weg, statt auf eine falsche Adresse zu zeigen. */
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}),
  };
}
