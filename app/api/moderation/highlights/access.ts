import { requireModerator } from "@/lib/admin-auth";

/**
 * Highlights pflegt die Moderation auch nach dem Einreichungszeitraum - die
 * Buehne und /stories brauchen sie gerade danach. Deshalb ohne das
 * Zeitfenster aus `requireModerationAccess`.
 */
export async function requireHighlightAccess() {
  const authorization = await requireModerator();
  if (!authorization.authorized) {
    return { ok: false as const, response: Response.json({ error: authorization.error }, { status: authorization.status }) };
  }
  return { ok: true as const, currentAdmin: authorization.currentAdmin };
}
