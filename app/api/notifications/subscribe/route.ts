import { requireModerator } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isPushConfigured } from "@/lib/push";

/* An- und Abmeldung fuer Push-Benachrichtigungen der Moderation (Issue #43).
 *
 * Nur mit Moderationsrolle erreichbar. Damit kann sich niemand Zutritt zu den
 * Benachrichtigungen verschaffen, indem er den Endpunkt von aussen aufruft. */
export const runtime = "nodejs";

type IncomingSubscription = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/* Der Endpoint kommt aus dem Browser und wird nicht blind uebernommen: Es muss
   eine https-URL sein. Sonst liesse sich die Tabelle mit Muell fuellen, den
   jeder spaetere Versand mitschleppt. */
function parseSubscription(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const candidate = value as IncomingSubscription;
  const { endpoint, keys } = candidate;

  if (typeof endpoint !== "string" || endpoint.length > 1000) return null;
  if (typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") return null;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

export async function GET() {
  const auth = await requireModerator();
  if (!auth.authorized) return errorResponse(auth.error, auth.status);

  // Die Konsole fragt hiermit ab, ob der Umschalter ueberhaupt Sinn hat.
  return Response.json({ configured: isPushConfigured() });
}

export async function POST(request: Request) {
  const auth = await requireModerator();
  if (!auth.authorized) return errorResponse(auth.error, auth.status);

  if (!isPushConfigured()) {
    return errorResponse("Benachrichtigungen sind auf diesem Server nicht konfiguriert.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltige Anfrage.", 400);
  }

  const subscription = parseSubscription((body as { subscription?: unknown })?.subscription);
  if (!subscription) {
    return errorResponse("Das Abo ist unvollstaendig.", 400);
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return errorResponse("Der Dienst ist noch nicht konfiguriert.", 503);
  }

  /* upsert auf den Endpoint: Derselbe Browser meldet sich bei jedem Oeffnen der
     Konsole erneut an, und nach einem `pushsubscriptionchange` kommt ein neues
     Abo fuer dasselbe Geraet. Ohne upsert gaebe es doppelte Zeilen oder einen
     Konflikt. Wechselt das Konto am gleichen Geraet, zieht user_id mit. */
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: subscription.endpoint,
        user_id: auth.currentAdmin.user.id,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    return errorResponse("Das Abo konnte nicht gespeichert werden.", 502);
  }

  return Response.json({ subscribed: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireModerator();
  if (!auth.authorized) return errorResponse(auth.error, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltige Anfrage.", 400);
  }

  const endpoint = (body as { endpoint?: unknown })?.endpoint;
  if (typeof endpoint !== "string" || !endpoint) {
    return errorResponse("Kein Abo angegeben.", 400);
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return errorResponse("Der Dienst ist noch nicht konfiguriert.", 503);
  }

  /* Nur das eigene Abo darf weg. Sonst koennte ein Moderationskonto die
     Benachrichtigungen aller anderen abschalten, indem es fremde Endpoints
     durchprobiert. */
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", auth.currentAdmin.user.id);

  if (error) {
    return errorResponse("Das Abo konnte nicht entfernt werden.", 502);
  }

  return Response.json({ subscribed: false });
}
