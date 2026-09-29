import { getAppSettings } from "@/lib/app-settings";
import { getPartners } from "@/lib/partners";
import { publicRateLimit } from "@/lib/rate-limit";

/** Anfragen je Minute und IP-Adresse im Normalbetrieb (Issue #80). */
const PARTNERS_LIMIT_PER_MINUTE = 120;

export async function GET(request: Request) {
  const { publicThrottle } = await getAppSettings();
  const limit = publicRateLimit(request, "partners", publicThrottle, PARTNERS_LIMIT_PER_MINUTE);
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Abfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  return Response.json(
    { partners: await getPartners() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
  );
}
