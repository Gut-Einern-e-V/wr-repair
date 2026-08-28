import webpush, { type PushSubscription, WebPushError } from "web-push";
// Relativ, nicht ueber @/: Wie lib/app-settings.ts, damit vitest das Modul ohne
// Alias-Konfiguration laden kann (lib/push.test.ts).
import { createSupabaseAdminClient } from "./supabase/server";

/* Web-Push fuer die Moderation (Issue #43).
 *
 * Die VAPID-Schluessel identifizieren diesen Server gegenueber den Push-Diensten
 * von Google, Apple und Mozilla. Erzeugt werden sie einmalig mit
 * `npx web-push generate-vapid-keys`; der private Schluessel darf nur in der
 * Serverumgebung liegen, der oeffentliche geht an den Browser.
 */

export type PushConfigState = "ready" | "unconfigured";

function readConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  // Kontaktadresse fuer den Push-Dienst, falls er Probleme melden muss.
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured() {
  return readConfig() !== null;
}

/* Nennt die fehlenden Variablen beim Namen. Ohne das laesst sich aus der
   Fehlmeldung nicht ableiten, welcher der drei Werte fehlt - genau daran ist die
   erste Einrichtung haengen geblieben. Variablennamen sind keine Geheimnisse,
   und der Endpunkt, der das ausliefert, verlangt Moderationsrolle. */
export function missingPushConfig() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!process.env.VAPID_PRIVATE_KEY) missing.push("VAPID_PRIVATE_KEY");
  if (!process.env.VAPID_SUBJECT) missing.push("VAPID_SUBJECT");
  return missing;
}

/* Nachrichten bleiben inhaltslos: nur, dass etwas wartet, und wie viel. Kein
   Foto, kein Text aus der Einreichung, keine Kategorie. Der Transport ist zwar
   Ende-zu-Ende verschluesselt, aber es gibt keinen Grund, Einreichungsinhalte
   ueberhaupt an einen Drittdienst zu geben. */
type PushPayload = {
  title: string;
  count: number;
  url: string;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Schickt eine Benachrichtigung an alle angemeldeten Moderationsgeraete.
 *
 * Wirft nie. Der Aufrufer haengt an einer Einreichung, und eine Einreichung
 * darf nicht scheitern, weil ein Push-Dienst nicht antwortet. Ergebnis ist eine
 * Zusammenfassung fuers Log.
 */
export async function notifyModerators(payload: PushPayload) {
  const config = readConfig();
  if (!config) {
    return { sent: 0, removed: 0, state: "unconfigured" as PushConfigState };
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return { sent: 0, removed: 0, state: "unconfigured" as PushConfigState };
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error || !data || data.length === 0) {
    return { sent: 0, removed: 0, state: "ready" as PushConfigState };
  }

  const rows = data as SubscriptionRow[];
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    rows.map((row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      // TTL: Nach zwei Stunden ist "es wartet etwas" nicht mehr interessant -
      // dann soll der Push-Dienst die Nachricht verwerfen statt sie nachzureichen.
      return webpush.sendNotification(subscription, body, { TTL: 2 * 60 * 60 });
    }),
  );

  /* 404 und 410 heissen: Dieses Abo existiert beim Push-Dienst nicht mehr, weil
     die App deinstalliert oder die Berechtigung entzogen wurde. Solche Zeilen
     werden entfernt, sonst sammelt die Tabelle tote Endpunkte und jeder Versand
     laeuft unnoetig in Fehler. Andere Fehler (Netz, 5xx) bleiben stehen. */
  const dead: string[] = [];
  const alive: string[] = [];

  results.forEach((result, index) => {
    const endpoint = rows[index].endpoint;
    if (result.status === "fulfilled") {
      alive.push(endpoint);
      return;
    }
    const reason = result.reason;
    if (reason instanceof WebPushError && (reason.statusCode === 404 || reason.statusCode === 410)) {
      dead.push(endpoint);
    }
  });

  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }

  if (alive.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("endpoint", alive);
  }

  return { sent: alive.length, removed: dead.length, state: "ready" as PushConfigState };
}
