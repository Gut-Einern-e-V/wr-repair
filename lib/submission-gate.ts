import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAppSettings, readSettingsRow, type AppSettings, type SettingsRow } from "./app-settings";
import { rateLimit } from "./rate-limit";

/**
 * Torwaechter der Einreichung: Limit und Kampagneneinstellungen in einem Zug.
 *
 * Warum beides zusammen? Weil Issue #64 zwei Beschwerden hatte, die
 * gegeneinander ziehen. Das alte Limit lag im Arbeitsspeicher der jeweiligen
 * Serverless-Instanz - drei Einreichungen je Viertelstunde und IP-Adresse. Bei
 * einem User-Test sitzen alle im selben WLAN, also auf einer IP: ab der
 * vierten Person kam eine harte Absage. Ein Limit in der Datenbank behebt das
 * und kostet normalerweise einen zusaetzlichen Roundtrip - also genau die
 * Wartezeit, die die zweite Beschwerde war. Deshalb erledigt `submission_gate`
 * in Postgres beides in einem Aufruf (siehe die Migration
 * 202608310001_submission_reliability.sql).
 *
 * Die Zahlen sind deutlich groszuegiger als vorher und ueber die Umgebung
 * verstellbar: Das Captcha ist der eigentliche Spam-Schutz, das Limit nur die
 * Bremse gegen ein Skript, das ohne Captcha auf die Route eindrischt.
 *
 * Warum 40 je Minute und nicht 30 je fuenf Minuten (Issue #59)? Zwei Gruende,
 * und beide zielen auf ein Reparatur-Cafe:
 *
 * - Die Rate darf hoch sein. In einem Cafe sitzen alle im selben WLAN, also
 *   auf einer IP-Adresse, und in der Stunde nach dem Anschrauben tragen alle
 *   gleichzeitig ein. Dazu zaehlt jeder Versuch mit, auch die verworfenen -
 *   wer sich zweimal vertippt, verbraucht drei Zaehler statt einem.
 * - Die Strafe muss kurz sein. Vorher lief das Fenster fuenf Minuten: Wer
 *   hineinlief, wartete bis zu fuenf Minuten. Ein Fenster von einer Minute
 *   bremst ein Skript genauso - es kommt pro Minute nicht weiter -, laesst
 *   einen falsch getroffenen Menschen aber nach spaetestens einer Minute
 *   weitermachen.
 */

const DEFAULT_LIMIT = 40;
const DEFAULT_WINDOW_SECONDS = 60;

function positiveEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function submissionLimit() {
  return {
    limit: positiveEnv("SUBMISSION_RATE_LIMIT", DEFAULT_LIMIT),
    windowSeconds: positiveEnv("SUBMISSION_RATE_WINDOW_SECONDS", DEFAULT_WINDOW_SECONDS),
  };
}

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Der Schluessel, unter dem gezaehlt wird - ein gesalzener Abdruck, keine
 * Adresse.
 *
 * Das Formular sagt zu, dass die IP-Adresse nicht gespeichert wird. Ein
 * persistentes Limit braucht trotzdem etwas Wiedererkennbares. SHA-256 mit
 * einem Geheimnis loest das: Zwei Anfragen derselben Verbindung ergeben
 * denselben Abdruck, und aus dem Abdruck fuehrt kein Weg zurueck, solange das
 * Salz nicht bekannt ist. Ohne eigenes `SUBMISSION_RATE_SALT` dient der
 * Service-Role-Schluessel als Salz - der ist ohnehin gesetzt und geheim.
 */
export function throttleKey(request: Request) {
  const salt = process.env.SUBMISSION_RATE_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return `repair:${createHash("sha256").update(`${salt}:${clientIp(request)}`).digest("base64url").slice(0, 32)}`;
}

export type SubmissionGate = {
  allowed: boolean;
  retryAfterSeconds: number;
  settings: AppSettings;
  /** False, wenn nur das Notlimit im Arbeitsspeicher gegriffen hat. */
  persisted: boolean;
  /**
   * Wievielter Versuch dieser Verbindung im laufenden Fenster - null, wenn nur
   * das Notlimit im Arbeitsspeicher gegriffen hat.
   *
   * Gebraucht fuer das Fehlerprotokoll: Wenn das Limit greift, soll *ein*
   * Eintrag im Admin-Backend stehen und nicht einer je abgewiesener Anfrage.
   * Mit dem Zaehler laesst sich genau der erste Versuch ueber der Grenze
   * erkennen (siehe app/api/repairs/route.ts).
   */
  hits: number | null;
};

type GateResponse = {
  allowed?: boolean;
  retryAfterSeconds?: number;
  hits?: number;
  settings?: SettingsRow | null;
};

/**
 * Wartezeit in einem Satzteil, den man vorlesen kann.
 *
 * Vorher stand in der Absage immer "in X Minuten", auch bei 20 Sekunden
 * Restzeit - aufgerundet also "in 1 Minuten". Mit einem Fenster von einer
 * Minute ist das jetzt der Normalfall und nicht die Ausnahme.
 */
export function retryHint(seconds: number) {
  if (seconds <= 75) return "in einer Minute";
  const minutes = Math.ceil(seconds / 60);
  return `in ${minutes} Minuten`;
}

/**
 * Prueft das Limit und liefert die Einstellungen.
 *
 * Faellt auf das alte Verhalten zurueck, wenn `submission_gate` fehlt - die
 * Migration wird von Hand ausgerollt, und zwischen Deployment und Migration
 * darf die Einreichung nicht stehenbleiben. Das Notlimit ist dann wieder
 * instanzlokal, aber mit den neuen, groszuegigen Zahlen.
 */
export async function checkSubmissionGate(
  supabase: SupabaseClient | null,
  request: Request,
): Promise<SubmissionGate> {
  const { limit, windowSeconds } = submissionLimit();

  if (supabase) {
    const { data, error } = await supabase.rpc("submission_gate", {
      p_key: throttleKey(request),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (!error && data) {
      const gate = data as GateResponse;
      return {
        allowed: gate.allowed !== false,
        retryAfterSeconds: gate.retryAfterSeconds ?? windowSeconds,
        settings: buildAppSettings(gate.settings ?? null),
        persisted: true,
        hits: typeof gate.hits === "number" ? gate.hits : null,
      };
    }
  }

  const fallback = rateLimit(request, "repair-submission", { limit, windowMs: windowSeconds * 1_000 });
  return {
    allowed: fallback.allowed,
    retryAfterSeconds: fallback.retryAfterSeconds,
    settings: buildAppSettings(await readSettingsRow()),
    persisted: false,
    hits: null,
  };
}
