import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { notifyModerators } from "@/lib/push";
import { extractExif } from "@/lib/exif";
import { anonymizeCoordinates } from "@/lib/geo-anonymize";
import { decideOrigin, ipRegionTag } from "@/lib/origin-check";
import { ipCity, outsideRegionHelp } from "@/lib/outside-region-help";
import { checkSubmissionGate } from "@/lib/submission-gate";
import { logSubmissionFailure } from "@/lib/submission-log";
import { repairCategoryValues } from "@/lib/repair-catalog";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 200 * 1024;

/**
 * Obergrenze fuer die Captcha-Pruefung. Sie hat vorher gefehlt, und ohne sie
 * haengt die Einreichung so lange, wie der fremde Dienst braucht - eine der
 * beiden Beschwerden aus Issue #64.
 */
const CAPTCHA_TIMEOUT_MS = 4_000;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const validPerformedBy = new Set(["alone", "with_support", "by_someone"]);

/**
 * `retry: false` sagt dem Formular, dass ein zweiter Versuch nichts aendert.
 *
 * Gebraucht fuer die Konfigurationsfehler: Sie kommen als 503, weil das der
 * richtige Status fuer "dieser Dienst steht nicht bereit" ist - aber anders als
 * eine Stoerung geht sie kein Wiederholungsversuch weg. Ohne diese Angabe
 * wuerde das Formular dreimal gegen dieselbe fehlende Umgebungsvariable laufen
 * (siehe sendAttempt in components/repair-submission-form.tsx).
 */
function errorResponse(message: string, status: number, retry = true) {
  return Response.json(retry ? { error: message } : { error: message, retry: false }, { status });
}

/**
 * Ergebnis der Captcha-Pruefung, in drei Faellen statt zwei.
 *
 * Der Unterschied zwischen "der Dienst sagt nein" und "der Dienst sagt nichts"
 * war vorher eingeebnet: Beides endete in einer Absage. Ein kurzer Ausfall bei
 * Friendly Captcha hat damit echte Reparaturen gekostet. `unavailable` trennt
 * das jetzt - siehe die Behandlung weiter unten in POST.
 */
type CaptchaOutcome = "valid" | "invalid" | "unavailable" | "unconfigured";

async function verifyCaptcha(token: string): Promise<{ outcome: CaptchaOutcome; detail?: string }> {
  const apiKey = process.env.FRIENDLY_CAPTCHA_API_KEY;
  const sitekey = process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY;
  if (!apiKey || !sitekey) {
    return { outcome: "unconfigured" };
  }

  try {
    const response = await fetch("https://global.frcapi.com/api/v2/captcha/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ response: token, sitekey }),
      cache: "no-store",
      signal: AbortSignal.timeout(CAPTCHA_TIMEOUT_MS),
    });

    // Ein Serverfehler auf der Gegenseite ist keine Aussage ueber diese
    // Einreichung, sondern eine Stoerung.
    if (response.status >= 500) {
      return { outcome: "unavailable", detail: `HTTP ${response.status}` };
    }

    const result = await response.json() as { success?: boolean };
    return { outcome: response.ok && result.success === true ? "valid" : "invalid" };
  } catch (error) {
    return { outcome: "unavailable", detail: error instanceof Error ? error.message : "fetch failed" };
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const timings: string[] = [];
  /* Laufzeit je Abschnitt, als Server-Timing-Kopfzeile. Nach dem User-Test war
     nicht feststellbar, welcher Abschnitt die Wartezeit verursacht hat; mit
     diesen Werten steht es in den Entwicklerwerkzeugen und in den
     Vercel-Protokollen. */
  function mark(name: string, since: number) {
    timings.push(`${name};dur=${Date.now() - since}`);
  }
  function withTimings(response: Response) {
    response.headers.set("Server-Timing", timings.join(", "));
    return response;
  }

  /* Der Schluessel des Sendevorgangs kommt als Kopfzeile, nicht im Formular:
     Er muss vor dem Einlesen des Bildes verfuegbar sein, damit eine abgelehnte
     Anfrage nicht erst einen Upload abwartet. Er bleibt ueber alle
     Wiederholungsversuche des Browsers gleich (siehe submitRepair in
     components/repair-submission-form.tsx), weshalb ein doppelt angekommener
     Versuch am eindeutigen Index scheitert statt eine zweite Zeile anzulegen. */
  const clientKeyHeader = request.headers.get("x-submission-key");
  const clientKey = clientKeyHeader && /^[a-zA-Z0-9-]{8,64}$/.test(clientKeyHeader) ? clientKeyHeader : null;
  const attemptNumber = Number.parseInt(request.headers.get("x-submission-attempt") ?? "1", 10) || 1;

  let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    // Kein Abbruch: Der Torwaechter faellt auf das Limit im Arbeitsspeicher und
    // die Umgebungsvorgaben zurueck und die Route sagt gleich unten sauber ab.
  }

  const gateStartedAt = Date.now();
  const gate = await checkSubmissionGate(supabase, request);
  mark("gate", gateStartedAt);
  const settings = gate.settings;

  if (settings.submissionWindow.status !== "open") {
    return withTimings(errorResponse("Einreichungen sind derzeit nicht geoeffnet.", 403));
  }

  if (!gate.allowed) {
    return withTimings(Response.json(
      {
        error: `Gerade wurden von dieser Internetverbindung sehr viele Einreichungen gesendet. Bitte versuche es in ${Math.ceil(gate.retryAfterSeconds / 60)} Minuten erneut.`,
      },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    ));
  }

  if (!supabase) {
    return withTimings(errorResponse("Der Einreichungsdienst ist noch nicht konfiguriert.", 503, false));
  }

  /* Ob die Wiedererkennung ueberhaupt zur Verfuegung steht.

     `persisted` ist false, wenn `submission_gate` nicht geantwortet hat - und
     Funktion, Zaehltabelle und die Spalte `client_key` stammen aus derselben
     Migration. Fehlt die eine, fehlt auch die andere. Ohne diese Bremse wuerde
     der Insert eine Spalte setzen, die es noch nicht gibt, und Postgres wiese
     *jede* Einreichung ab: Zwischen Deployment und Migration stuende die
     Aktion still, statt nur ohne Wiedererkennung zu laufen. */
  const canRecogniseRetry = gate.persisted;

  /* Wiederholungsversuch: Steht die Einreichung schon, ist hier Schluss.
     Diese Abfrage muss *vor* der Captcha-Pruefung stehen, und der Grund ist
     nicht Geschwindigkeit. Ein Token von Friendly Captcha ist einmalig. Kam der
     erste Versuch durch und ging nur seine Antwort auf dem Rueckweg verloren -
     der Normalfall im wackligen Mobilfunk -, dann ist das Token verbraucht und
     der Browser weiss nicht, dass er es erneuern muesste. Stuende die Pruefung
     zuerst, bekaeme dieser Mensch eine Absage vom Spam-Schutz fuer eine
     Reparatur, die laengst gespeichert ist.

     Nur bei Wiederholungen, damit der Normalfall keine zusaetzliche Abfrage
     traegt. */
  if (canRecogniseRetry && clientKey && attemptNumber > 1) {
    const lookupStartedAt = Date.now();
    const { data: existing } = await supabase
      .from("repairs")
      .select("id")
      .eq("client_key", clientKey)
      .maybeSingle();
    mark("lookup", lookupStartedAt);

    if (existing?.id) {
      return withTimings(Response.json({ id: existing.id, status: "pending", duplicate: true }, { status: 200 }));
    }
  }

  const formStartedAt = Date.now();
  const formData = await request.formData();
  mark("form", formStartedAt);
  const category = formData.get("category");
  const brandModel = formData.get("brand_model");
  const durationMinutes = formData.get("duration_minutes");
  const itemValueEuros = formData.get("item_value_euros");
  const performedBy = formData.get("performed_by");
  const story = formData.get("story");
  const consent = formData.get("consent");
  let image = formData.get("image");
  const captchaToken = formData.get("frc-captcha-response");
  const repairSucceeded = formData.get("repair_succeeded") !== "false";

  const lotteryName = formData.get("lottery_name");
  const lotteryEmail = formData.get("lottery_email");
  const lotteryPrivacy = formData.get("lottery_privacy");
  const wantsLottery = typeof lotteryName === "string" && lotteryName.trim().length > 0
    && typeof lotteryEmail === "string" && lotteryEmail.trim().length > 0;

  if (typeof category !== "string" || !(repairCategoryValues as string[]).includes(category)) {
    return withTimings(errorResponse("Bitte waehle eine gueltige Kategorie.", 400));
  }

  if (typeof performedBy !== "string" || !validPerformedBy.has(performedBy)) {
    return withTimings(errorResponse("Bitte gib an, wer die Reparatur durchgefuehrt hat.", 400));
  }

  if (consent !== "true") {
    return withTimings(errorResponse("Die Zustimmung zur Veroeffentlichung ist erforderlich.", 400));
  }

  if (wantsLottery && lotteryPrivacy !== "true") {
    return withTimings(errorResponse("Bitte stimme der Datenschutzerklaerung fuer die Verlosung zu.", 400));
  }

  if (image instanceof File && image.size > 0) {
    if (!(image.type in imageExtensions)) {
      return withTimings(errorResponse("Erlaubt sind JPG, PNG und WebP.", 400));
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return withTimings(errorResponse("Das Bild darf maximal 200 KB gross sein.", 400));
    }
  }

  /* Ergebnis der Captcha-Pruefung, das an die Moderation weitergegeben wird:
     Eine Einreichung, die nur durchkam, weil der Spam-Schutz nicht antwortete,
     soll als solche im Fehlerprotokoll stehen. */
  let captchaUnavailable: string | null = null;

  if (process.env.NEXT_PUBLIC_CAPTCHA_ENABLED !== "false") {
    if (typeof captchaToken !== "string" || !captchaToken) {
      return withTimings(errorResponse("Bitte bestaetige zuerst den Spam-Schutz.", 403));
    }

    const captchaStartedAt = Date.now();
    const captcha = await verifyCaptcha(captchaToken);
    mark("captcha", captchaStartedAt);

    if (captcha.outcome === "unconfigured") {
      return withTimings(errorResponse("Der Spam-Schutz ist noch nicht konfiguriert.", 503, false));
    }

    if (captcha.outcome === "invalid") {
      return withTimings(errorResponse("Der Spam-Schutz konnte nicht bestaetigt werden. Bitte versuche es erneut.", 403));
    }

    /* Zeitueberschreitung oder Stoerung bei Friendly Captcha: annehmen und
       aufschreiben, statt absagen.

       Das ist eine Abwaegung und keine Nachlaessigkeit. Der Einreichungszeitraum
       ist befristet, jede Einreichung geht ohnehin durch die Moderation, bevor
       sie zaehlt - ein Spam-Eintrag kostet dort einen Klick. Eine verworfene
       echte Reparatur ist dagegen endgueltig verloren, und genau das ist beim
       User-Test passiert. Der Vorgang landet im Fehlerprotokoll, damit ein
       laengerer Ausfall im Admin-Backend auffaellt. */
    if (captcha.outcome === "unavailable") {
      captchaUnavailable = captcha.detail ?? "keine Antwort";
    }
  }

  const repairId = crypto.randomUUID();

  /* Herkunft pruefen, bevor irgendetwas gespeichert wird.
     Reihenfolge mit Absicht: Erst wenn feststeht, dass die Einreichung
     angenommen wird, wandert das Bild in den Storage. Eine Absage kostet so
     weder Speicher noch eine Aufraeumrunde. */
  let origin = decideOrigin(request, formData, settings.region);

  /* Letzte Gelegenheit vor der Absage: das EXIF des Bildes.
     Normalerweise rastert schon der Browser die Foto-Koordinate und schickt
     nur das Ergebnis (siehe components/repair-submission-form.tsx). Schlaegt
     das fehl - alte Browser, blockierte Skripte -, waere eine echte Reparatur
     aus dem Gebiet sonst abgewiesen worden, obwohl der Beleg im Bild steckt.
     Der Buffer wird ohnehin gebraucht und danach fuer den Upload wiederverwendet. */
  if (!origin.allowed && image instanceof File && image.size > 0 && image.type === "image/jpeg") {
    const exifStartedAt = Date.now();
    const buffer = await image.arrayBuffer();
    const exif = await extractExif(buffer);
    const exifPoint = anonymizeCoordinates(exif.latitude, exif.longitude);
    origin = decideOrigin(request, formData, settings.region, exifPoint);
    // Aus dem Buffer neu aufgebaut, damit die Originalbytes erhalten bleiben.
    image = new File([buffer], image.name, { type: image.type });
    mark("exif", exifStartedAt);
  }

  if (!origin.allowed) {
    const ipCountry = request.headers.get("x-vercel-ip-country");
    const ipRegion = ipRegionTag(request);
    const city = ipCity(request);

    /* Nur zaehlen, nichts aufheben: Zeitpunkt und grobe Gegend, damit sich
       spaeter sagen laesst, wie viele Menschen von ausserhalb mitmachen
       wollten. Kein Inhalt, kein Bild, kein Bezug zu einer Person.

       Nach der Antwort, nicht davor: Die Absage steht bereits fest, und der
       Mensch vor dem Formular soll nicht darauf warten, dass wir sie zaehlen. */
    after(async () => {
      const { error } = await supabase.from("blocked_submissions").insert({
        ip_country: ipCountry,
        ip_region: ipRegion,
        ip_city: city,
      });
      if (error) {
        await logSubmissionFailure(supabase, request, { stage: "blocked", reason: "count_failed", detail: error.message });
      }
    });

    return withTimings(Response.json(
      { error: "Diese Reparatur zaehlt leider nicht fuer den Rekord.", outsideRegion: outsideRegionHelp(request, settings.region.label) },
      { status: 403 },
    ));
  }

  const uploadImage = image instanceof File && image.size > 0 ? image : null;
  const imagePath = uploadImage ? `pending/${repairId}.${imageExtensions[uploadImage.type]}` : null;

  const parsedDuration = durationMinutes ? parseInt(String(durationMinutes), 10) : null;
  const parsedValue = itemValueEuros ? parseFloat(String(itemValueEuros)) : null;

  /* Die Zeile zuerst, das Bild danach.
     Vorher lag der Upload in den Storage vor dem Insert, und beides zusammen
     bestimmte die Wartezeit bis zur Antwort. Jetzt ist die Einreichung
     gesichert, sobald die Zeile steht - das Bild folgt in `after`, und wenn es
     nicht ankommt, verliert die Einreichung ihr Foto und nicht sich selbst.

     `image_path` bleibt dabei zunaechst leer und wird erst nach dem
     erfolgreichen Upload nachgetragen. Der umgekehrte Weg - Pfad sofort
     eintragen, Datei spaeter - hinterliesse einen toten Verweis, sobald der
     Nachlauf gar nicht mehr zum Zug kommt, und die Moderation saehe dauerhaft
     ein kaputtes Bild. So ist der schlechteste Fall eine Einreichung ohne
     Foto, und die ist in sich richtig. */
  const insertStartedAt = Date.now();
  const { error: insertError } = await supabase.from("repairs").insert({
    id: repairId,
    ...(canRecogniseRetry ? { client_key: clientKey } : {}),
    category,
    brand_model: typeof brandModel === "string" && brandModel.trim() ? brandModel.trim() : null,
    duration_minutes: parsedDuration && parsedDuration > 0 ? parsedDuration : null,
    item_value_euros: parsedValue !== null && !Number.isNaN(parsedValue) && parsedValue >= 0 ? parsedValue : null,
    performed_by: performedBy,
    story: typeof story === "string" && story.trim() ? story.trim() : null,
    repair_succeeded: repairSucceeded,
    image_path: null,
    consent_publication: true,
    location_region: origin.regionLabel,
    location_lat: origin.point?.lat ?? null,
    location_lon: origin.point?.lon ?? null,
    kreis: origin.kreis,
    // Belege fuer die Moderation: woher die Ortsangabe stammt und was die
    // Verbindung dazu sagt (siehe lib/origin-check.ts).
    origin_source: origin.source,
    origin_ip_region: origin.ipRegion,
    status: "pending",
  });
  mark("insert", insertStartedAt);

  if (insertError) {
    /* 23505 ist die Verletzung des eindeutigen Index auf `client_key`: Dieser
       Sendevorgang ist schon angekommen, der Browser wiederholt ihn nur, weil
       die Antwort verlorenging. Die richtige Antwort darauf ist die des ersten
       Versuchs - eine zweite Zeile waere ein Fehler, eine Fehlermeldung eine
       Luege. */
    if (insertError.code === "23505" && canRecogniseRetry && clientKey) {
      const { data: existing } = await supabase
        .from("repairs")
        .select("id")
        .eq("client_key", clientKey)
        .maybeSingle();

      if (existing?.id) {
        return withTimings(Response.json({ id: existing.id, status: "pending", duplicate: true }, { status: 200 }));
      }
    }

    await logSubmissionFailure(supabase, request, { stage: "insert", reason: "insert_failed", detail: insertError.message });
    return withTimings(errorResponse("Die Einreichung konnte nicht gespeichert werden. Bitte versuche es erneut.", 502));
  }

  /* Alles, was nach der gesicherten Zeile noch zu tun ist, laeuft hinter der
     Antwort (Issue #43 fuer die Benachrichtigungen, Issue #64 fuer den Rest).
     `after` startet erst, wenn die Antwort raus ist: Wer eine Reparatur
     eintraegt, wartet nicht auf Storage, Verlosung und drei Push-Dienste.

     Die Reihenfolge darin ist nicht beliebig - das Bild geht *vor* der
     Benachrichtigung hoch, damit die Moderation die Einreichung nicht in der
     Sekunde oeffnet, in der das Foto noch fehlt. */
  after(async () => {
    if (uploadImage && imagePath) {
      // `upsert`, damit ein Wiederholungsversuch nicht an der bereits
      // vorhandenen Datei desselben Vorgangs scheitert.
      const { error: uploadError } = await supabase.storage
        .from("repair-images")
        .upload(imagePath, uploadImage, { contentType: uploadImage.type, upsert: true });

      if (uploadError) {
        await logSubmissionFailure(supabase, request, {
          stage: "image",
          reason: "upload_failed",
          detail: uploadError.message,
          repairId,
        });
      } else {
        const { error: linkError } = await supabase.from("repairs").update({ image_path: imagePath }).eq("id", repairId);
        if (linkError) {
          /* Die Datei liegt, die Zeile weiss es nicht. Aufraeumen statt eine
             verwaiste Datei liegenlassen: Ohne Verweis kaeme sie nie zur
             Moderation und nie zur Loeschung. */
          await supabase.storage.from("repair-images").remove([imagePath]);
          await logSubmissionFailure(supabase, request, {
            stage: "image",
            reason: "link_failed",
            detail: linkError.message,
            repairId,
          });
        }
      }
    }

    if (wantsLottery) {
      const { error: lotteryError } = await supabase.from("lottery_entries").insert({
        repair_id: repairId,
        name: (lotteryName as string).trim(),
        email: (lotteryEmail as string).trim().toLowerCase(),
      });

      /* Vorher wurde dieser Fehler nicht einmal angesehen. Eine verlorene
         Gewinnspielteilnahme faellt niemandem auf, bis jemand nach der
         Verlosung fragt - deshalb steht sie jetzt im Protokoll. */
      if (lotteryError) {
        await logSubmissionFailure(supabase, request, {
          stage: "lottery",
          reason: "insert_failed",
          detail: lotteryError.message,
          repairId,
        });
      }
    }

    /* Sichtbar machen, dass die Wiedererkennung fehlt: In diesem Fenster kann
       ein Wiederholungsversuch des Browsers eine zweite Reparatur anlegen. Die
       Fehlertabelle stammt aus derselben Migration und nimmt den Eintrag noch
       nicht an - in den Serverprotokollen steht er trotzdem, und genau da wird
       er zwischen Deployment und Migration gesucht. */
    if (!canRecogniseRetry && clientKey) {
      await logSubmissionFailure(supabase, request, {
        stage: "gate",
        reason: "idempotency_unavailable",
        detail: "submission_gate fehlt - Migration 202608310001 noch nicht ausgerollt?",
        repairId,
      });
    }

    if (captchaUnavailable) {
      await logSubmissionFailure(supabase, request, {
        stage: "captcha",
        reason: "captcha_unavailable",
        detail: captchaUnavailable,
        repairId,
      });
    }

    /* Mitgeschickt wird die Zahl der offenen Einreichungen, nicht diese eine.
       Alle Nachrichten teilen im Service Worker denselben tag und ersetzen sich
       gegenseitig, daher steht in der einen sichtbaren Benachrichtigung immer
       der aktuelle Stand statt "1". */
    try {
      const { count } = await supabase
        .from("repairs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      await notifyModerators({
        title: "Neue Eintragung",
        count: count ?? 1,
        url: "/moderator",
      });
    } catch (error) {
      // Die Einreichung ist gespeichert, das ist der Vertrag mit der
      // eintragenden Person. Ein fehlgeschlagener Push aendert daran nichts -
      // aufgeschrieben wird er trotzdem.
      await logSubmissionFailure(supabase, request, { stage: "notify", reason: "push_failed", detail: error, repairId });
    }
  });

  mark("total", startedAt);
  return withTimings(Response.json({ id: repairId, status: "pending" }, { status: 201 }));
}
