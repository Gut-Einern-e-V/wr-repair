"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CategoryMotif } from "@/components/category-motif";
import { FriendlyCaptcha } from "@/components/friendly-captcha";
import { RepairCategorySelect } from "@/components/repair-form-fields";
import { repairCategories, type RepairCategory } from "@/lib/repair-catalog";
import { anonymizeCoordinates, coarsenCoordinates, type AnonymizedPoint } from "@/lib/geo-anonymize";
import type { OutsideRegionHelp } from "@/lib/outside-region-help";
import { nrwKreiseList } from "@/lib/nrw-kreise-list";

const MAX_IMAGE_BYTES = 200 * 1024;
const compressibleImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Wiederholungsversuche einer Einreichung (Issue #64).
 *
 * Beim ersten User-Test sind Einreichungen fehlgeschlagen, und das Formular hat
 * bei jedem Wackler in der Mobilfunkverbindung sofort aufgegeben - obwohl genau
 * dort ein zweiter Versuch fast immer durchgeht. Drei Versuche mit wachsender
 * Pause sind der Kompromiss: lang genug, um eine Funkloch-Sekunde zu
 * ueberbruecken, kurz genug, dass niemand vor einem scheinbar haengenden
 * Formular sitzt.
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_200, 3_000];
/**
 * Eigene Frist statt der des Browsers. Ohne sie wartet ein angefangener,
 * nie beantworteter Sendeversuch bis zum Timeout des Betriebssystems - und
 * genau das war das "hat sehr lange gedauert" aus dem Issue.
 */
const REQUEST_TIMEOUT_MS = 45_000;
/** Ab hier wird der Hinweis eingeblendet, dass es dauert, aber noch laeuft. */
const SLOW_NOTICE_AFTER_MS = 8_000;

function delay(ms: number) {
  return new Promise((resolve) => { window.setTimeout(resolve, ms); });
}

/**
 * Schluessel eines Sendevorgangs, den der Server als Wiedererkennungsmerkmal
 * nutzt: Kommt derselbe Schluessel zweimal an, weil die Antwort des ersten
 * Versuchs verlorenging, entsteht trotzdem nur eine Einreichung (siehe
 * `client_key` in app/api/repairs/route.ts).
 */
function createSubmissionKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Ergebnis eines einzelnen Sendeversuchs. */
type AttemptResult =
  | { kind: "success"; id: string }
  | { kind: "outside"; help: OutsideRegionHelp }
  /** Endgueltig: Der Server hat inhaltlich entschieden, ein zweiter Versuch aendert nichts. */
  | { kind: "rejected"; message: string }
  /** Ein zweiter Versuch kann helfen. `reachedServer` sagt, ob das Captcha-Token verbraucht ist. */
  | { kind: "retryable"; message: string; reachedServer: boolean };

/**
 * Liest die Aufnahmeposition aus dem Originalbild und gibt sie sofort
 * gerastert zurueck.
 *
 * Der Ablauf ist bewusst so geschnitten, dass die Rohkoordinate das Geraet nie
 * verlaesst: Sie existiert nur innerhalb dieser Funktion, wird direkt in eine
 * zufaellig verschobene, grobe Koordinate uebersetzt und danach verworfen. Anschliessend entfernt
 * {@link createCompressedImage} beim Neu-Encodieren ohnehin saemtliche
 * EXIF-Segmente aus der Datei, die hochgeladen wird.
 */
async function readAnonymizedOrigin(file: File): Promise<AnonymizedPoint | null> {
  try {
    // Dynamisch geladen, damit der EXIF-Parser nicht im Haupt-Bundle landet.
    const exifr = await import("exifr");
    const parse = (exifr as unknown as {
      parse(input: Blob, options: object): Promise<Record<string, unknown> | undefined>;
    }).parse;

    const result = await parse(file, { gps: true, tiff: false, ifd1: false, exif: false });
    if (!result) return null;

    return anonymizeCoordinates(result["latitude"], result["longitude"]);
  } catch {
    // Fehlendes oder kaputtes EXIF ist der Normalfall, kein Fehlerzustand.
    return null;
  }
}

function createCompressedImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);

    image.onload = async () => {
      URL.revokeObjectURL(sourceUrl);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Bildkomprimierung ist in diesem Browser nicht verfügbar."));
        return;
      }

      let longestSide = Math.max(image.naturalWidth, image.naturalHeight, 1);
      let quality = 0.82;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const scale = Math.min(1, longestSide / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolveBlob) => {
          canvas.toBlob(resolveBlob, "image/jpeg", quality);
        });

        if (blob && blob.size <= MAX_IMAGE_BYTES) {
          resolve(new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.jpg`, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          }));
          return;
        }

        quality = Math.max(0.42, quality - 0.12);
        longestSide = Math.round(longestSide * 0.78);
      }

      reject(new Error("Das Bild konnte nicht klein genug komprimiert werden. Bitte wähle ein anderes Bild."));
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("Dieses Bildformat kann nicht komprimiert werden."));
    };

    image.src = sourceUrl;
  });
}

type RepairSubmissionFormProps = {
  initialCategory?: RepairCategory;
  /** Ueberschrift des Formulars; im Danke-Bildschirm wird sie ersetzt. */
  heading?: string;
  headingId?: string;
  /** Beschriftung der Aktion, die den Danke-Bildschirm schliesst. */
  doneLabel?: string;
  onDone?: () => void;
};

/**
 * Einziges Einreichungsformular der Anwendung. Modal (Startseite) und
 * Schnell-Eintragung (/mitmachen) rendern dieselbe Komponente, damit Felder,
 * Validierung und Danke-Bildschirm nie auseinanderlaufen.
 */
export function RepairSubmissionForm({
  initialCategory,
  heading = "Reparatur einreichen",
  headingId = "submission-title",
  doneLabel = "Fertig",
  onDone,
}: RepairSubmissionFormProps) {
  const [category, setCategory] = useState<RepairCategory>(initialCategory ?? repairCategories[0].value);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedRepairId, setSubmittedRepairId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [outsideRegion, setOutsideRegion] = useState<OutsideRegionHelp | null>(null);
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [anonymizedOrigin, setAnonymizedOrigin] = useState<AnonymizedPoint | null>(null);
  /**
   * Woher der aktuelle Standort stammt. Ein Foto ohne GPS darf eine bewusste
   * GPS-/Kreis-Wahl nicht stillschweigend loeschen - nur ein weiteres Foto
   * (oder gar keine Wahl bisher) darf den Standort wieder auf "keiner" setzen.
   *
   * "ip-suggestion" ist ein automatisch vorausgefuellter, aber unbestaetigter
   * Vorschlag aus der IP-Herkunft - deutlich unsicherer als Foto/GPS/manuelle
   * Wahl, siehe requestIpSuggestion(). Jede der anderen drei Quellen ersetzt
   * ihn kommentarlos.
   */
  const [locationSource, setLocationSource] = useState<"photo" | "gps" | "manual" | "ip-suggestion" | null>(null);
  const locationSourceRef = useRef(locationSource);
  useEffect(() => {
    locationSourceRef.current = locationSource;
  }, [locationSource]);
  const [selectedKreis, setSelectedKreis] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [compressionMessage, setCompressionMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  /**
   * Wo der Sendevorgang steht. Vorher gab es dazu nur den Fortschritt des
   * Bild-Uploads: Stand der bei 100 Prozent, verschwand jede Rueckmeldung,
   * obwohl der Server noch Herkunft, Spam-Schutz und Speicherung vor sich
   * hatte. Genau diese Luecke war das "hat sehr lange gedauert" aus Issue #64.
   */
  const [submitPhase, setSubmitPhase] = useState<"sending" | "processing" | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  /**
   * Ob der Spam-Schutz schon geladen werden darf (Issue #73).
   *
   * Friendly Captcha loest seine Aufgabe, sobald das Widget im Dokument steht.
   * Stand es von Anfang an da, entstand fuer jedes geoeffnete Formular eine
   * Anfrage - auch fuer die vielen, die nie abgeschickt werden. Es wird
   * deshalb erst eingehaengt, wenn alle Pflichtangaben stehen.
   *
   * Bewusst eine Sperrklinke: einmal wahr, bleibt wahr. Sonst wuerde jede
   * kurzzeitig unvollstaendige Eingabe - eine geleerte Auswahl, eine Zahl
   * ausserhalb ihres Bereichs - das Widget aus- und wieder einhaengen und
   * damit genau die Anfragen erzeugen, die hier eingespart werden sollen.
   */
  const [isCaptchaArmed, setIsCaptchaArmed] = useState(false);
  /**
   * Bleibt ueber alle Wiederholungsversuche derselben Einreichung gleich, damit
   * der Server einen doppelt angekommenen Versuch erkennt statt eine zweite
   * Reparatur anzulegen. Nach einer erfolgreichen Einreichung wieder null: Die
   * naechste Reparatur ist ein neuer Vorgang.
   */
  const submissionKeyRef = useRef<string | null>(null);
  const resetCaptchaRef = useRef<(() => void) | null>(null);
  const [enterLottery, setEnterLottery] = useState(false);
  /**
   * Eine belegte, nicht geratene Herkunft (Issue #76). Der Vorschlag aus der
   * IP-Verbindung zaehlt ausdruecklich nicht dazu: Er ist eine Vermutung, und
   * genau dann lohnt die Standortabfrage noch.
   */
  const hasLocation = locationSource === "photo" || locationSource === "gps";
  const friendlyCaptchaSiteKey = process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY;
  const captchaEnabled = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED !== "false";

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  /**
   * Unbestaetigter Kreis-Vorschlag aus der IP-Herkunft, direkt beim Oeffnen
   * des Formulars geladen - sichtbar im Dropdown statt fuer die einreichende
   * Person unsichtbar erst beim Absenden zu greifen. Foto-EXIF oder die
   * Standortabfrage sind praeziser und ersetzen den Vorschlag, sobald sie
   * etwas finden; eine manuelle Wahl tut es sowieso.
   */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/geo/kreis")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { kreis: string | null; lat: number | null; lon: number | null } | null) => {
        if (cancelled || !data?.kreis || data.lat === null || data.lon === null) return;
        if (locationSourceRef.current !== null) return;

        setAnonymizedOrigin({ lat: data.lat, lon: data.lon });
        setLocationSource("ip-suggestion");
        setSelectedKreis(data.kreis);
        setLocationStatus(`Vorschlag anhand deiner Internetverbindung: "${data.kreis}". Bitte bestätigen oder unten korrigieren.`);
      })
      .catch(() => {
        // Ohne Vorschlag bleibt das Feld leer - kein Beinbruch, nur weniger komfortabel.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Fragt den erkannten Kreis fuer einen bereits anonymisierten Punkt ab, rein zur Anzeige im Dropdown. */
  async function resolveKreisLabel(point: AnonymizedPoint): Promise<string | null> {
    try {
      const response = await fetch(`/api/geo/kreis?lat=${point.lat}&lon=${point.lon}`);
      if (!response.ok) return null;
      const data = await response.json() as { kreis: string | null };
      return data.kreis;
    } catch {
      return null;
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError("");
    setCompressionMessage("");
    setUploadFile(null);
    setAnonymizedOrigin(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setPreviewUrl("");
      return;
    }

    if (!compressibleImageTypes.has(file.type)) {
      setFileError("Bitte wähle ein JPG, PNG oder WebP. Dieses Format kann nicht datenschutzsicher verarbeitet werden.");
      setPreviewUrl("");
      event.target.value = "";
      return;
    }

    setIsCompressing(true);
    try {
      // Reihenfolge ist wichtig: Erst die Herkunft aus dem Originalbild
      // rastern, danach komprimieren. Das Komprimat enthaelt kein EXIF mehr.
      const origin = await readAnonymizedOrigin(file);
      const compressedFile = await createCompressedImage(file);
      if (origin) {
        setAnonymizedOrigin(origin);
        setLocationSource("photo");
        setSelectedKreis("");
        /* Der Hinweis gehoert in die Standortzeile und nicht zur
           Bildmeldung: Dort steht der Knopf, der jetzt nicht mehr gebraucht
           wird, und dort liegt auch die Korrekturmoeglichkeit (Issue #76). */
        setLocationStatus("Standort aus den Bilddaten übernommen. Für die Karte wird nur ein zufällig verschobener Punkt übertragen, nicht der genaue Ort.");
        void resolveKreisLabel(origin).then((kreis) => {
          if (kreis) setSelectedKreis(kreis);
        });
      } else if (locationSource === "photo" || locationSource === null) {
        setAnonymizedOrigin(null);
        setLocationSource(null);
      }
      setUploadFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
      /* Nur noch das Bild selbst - was mit einer gefundenen Herkunft
         passiert, steht seit Issue #76 in der Standortzeile darunter. */
      setCompressionMessage(compressedFile.size < file.size
        ? `Bild wurde von ${Math.ceil(file.size / 1024)} KB auf ${Math.ceil(compressedFile.size / 1024)} KB komprimiert. Metadaten wurden entfernt.`
        : "Bilddaten wurden vor dem Upload bereinigt. EXIF- und Standortdaten wurden entfernt.");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Das Bild konnte nicht verarbeitet werden.");
      event.target.value = "";
    } finally {
      setIsCompressing(false);
    }
  }

  /**
   * Standort per Browser-Geolocation-API. Deutlich praeziser als der IP-Fallback
   * und unabhaengig davon, ob ueberhaupt ein Foto mit GPS-Daten existiert. Wird
   * genau wie die Foto-Herkunft direkt im Browser gerastert, bevor irgendetwas
   * an den Server geht - die rohe Koordinate verlaesst das Geraet nie.
   */
  function requestBrowserLocation() {
    setLocationStatus("");

    if (!("geolocation" in navigator)) {
      setLocationStatus("Dein Browser unterstützt keine Standortabfrage.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const anonymized = anonymizeCoordinates(position.coords.latitude, position.coords.longitude);
        if (!anonymized) {
          setLocationStatus("Der Standort konnte nicht verarbeitet werden.");
          return;
        }
        setAnonymizedOrigin(anonymized);
        setLocationSource("gps");
        setSelectedKreis("");
        setLocationStatus("Standort erkannt. Für die Karte wird nur ein zufällig verschobener Punkt übertragen, nicht der genaue Ort.");
        void resolveKreisLabel(anonymized).then((kreis) => {
          if (kreis) setSelectedKreis(kreis);
        });
      },
      (error) => {
        setIsLocating(false);
        setLocationStatus(
          error.code === error.PERMISSION_DENIED
            ? "Standortzugriff wurde nicht erlaubt."
            : "Der Standort konnte nicht ermittelt werden.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  /** Manuelle Kreis-Wahl fuer alle, die keinen Standortzugriff erlauben moechten. */
  function handleKreisSelect(event: ChangeEvent<HTMLSelectElement>) {
    const name = event.target.value;
    setSelectedKreis(name);
    setLocationStatus("");

    if (!name) {
      if (locationSource === "manual" || locationSource === "ip-suggestion") {
        setAnonymizedOrigin(null);
        setLocationSource(null);
      }
      return;
    }

    const kreis = nrwKreiseList.find((item) => item.name === name);
    if (!kreis) return;

    // Zufaelliger Versatz um den Kreis-Referenzpunkt: Eine manuelle Wahl sagt
    // nur den Kreis, also wird der Punkt ueber ihn gestreut, statt alle
    // Eintraege auf denselben Referenzpunkt zu legen. radiusKm ist je Kreis so
    // gewaehlt, dass die Streuung nie in einen Nachbarkreis rutscht (siehe
    // lib/nrw-kreise-list.ts). Danach nur noch runden und nicht zusaetzlich
    // verschieben: Der Versatz koennte den Punkt ueber die Kreisgrenze
    // schieben, und dann stuende an der Einreichung ein anderer Kreis als der
    // ausgewaehlte.
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * kreis.radiusKm;
    const jitteredLat = kreis.lat + (Math.sin(angle) * distance) / 111.32;
    const jitteredLon = kreis.lon + (Math.cos(angle) * distance) / (111.32 * Math.cos((kreis.lat * Math.PI) / 180));
    const anonymized = coarsenCoordinates(jitteredLat, jitteredLon);
    if (!anonymized) return;

    setAnonymizedOrigin(anonymized);
    setLocationSource("manual");
    setLocationStatus(`"${name}" ausgewählt. Für die Karte wird nur ein ungefährer Punkt im Kreis übertragen.`);
  }

  /**
   * Nach jeder Eingabe pruefen, ob das Formular vollstaendig ist (Issue #73).
   *
   * `checkValidity()` statt einer eigenen Liste der Pflichtfelder: Es kennt
   * jedes `required` im Formular, auch die Verlosungsfelder, die erst mit dem
   * Haeckchen dazukommen - und es bleibt richtig, wenn spaeter ein Feld
   * hinzukommt. Es zeigt dabei keine Browser-Meldungen an, das taete erst
   * `reportValidity()`.
   */
  function armCaptchaWhenComplete(form: HTMLFormElement) {
    if (isCaptchaArmed || !form.checkValidity()) return false;
    setIsCaptchaArmed(true);
    return true;
  }

  /** Aktuelles Captcha-Token aus dem versteckten Feld, das das Widget setzt. */
  function currentCaptchaToken(form: HTMLFormElement) {
    const field = form.elements.namedItem("frc-captcha-response");
    return field instanceof HTMLInputElement ? field.value : "";
  }

  /**
   * Holt ein frisches Captcha-Token.
   *
   * Notwendig, weil ein Token von Friendly Captcha einmalig ist: Hat ein
   * Sendeversuch den Server erreicht und ist erst danach gescheitert, ist das
   * Token verbraucht. Ohne diesen Schritt bekaeme der Wiederholungsversuch eine
   * Absage vom Spam-Schutz - der Versuch waere also gar keiner.
   */
  async function refreshCaptcha(form: HTMLFormElement, usedToken: string) {
    const reset = resetCaptchaRef.current;
    if (!reset) return;

    reset();
    for (let waited = 0; waited < 10_000; waited += 250) {
      await delay(250);
      const token = currentCaptchaToken(form);
      if (token && token !== usedToken) return;
    }
  }

  /**
   * Baut die Formulardaten fuer *einen* Versuch.
   *
   * Bewusst je Versuch neu und nicht einmal vorab: Ein Wiederholungsversuch
   * soll das inzwischen erneuerte Captcha-Token mitnehmen, nicht das
   * verbrauchte.
   */
  function buildFormData(form: HTMLFormElement) {
    const formData = new FormData(form);
    if (uploadFile) {
      formData.set("image", uploadFile);
    }
    if (anonymizedOrigin) {
      // Bereits gerastert. Der Server prueft das nach und verwirft alles,
      // was nicht exakt auf einem Zellpunkt liegt.
      formData.set("origin_lat", String(anonymizedOrigin.lat));
      formData.set("origin_lon", String(anonymizedOrigin.lon));
      /* Woher die Angabe stammt, geht mit: Fuer die Moderation ist der
         Unterschied zwischen einem Foto mit GPS und einem angeklickten
         Dropdown die eigentliche Information. Der Vorschlag aus der
         IP-Herkunft ist keine Angabe der einreichenden Person - er heisst
         beim Server deshalb "ip". */
      formData.set("origin_source", locationSource === "ip-suggestion" ? "ip" : locationSource ?? "manual");
    }
    return formData;
  }

  /**
   * Ein einzelner Sendeversuch.
   *
   * Bleibt bei XMLHttpRequest statt fetch, weil nur damit der Fortschritt des
   * Bild-Uploads ablesbar ist - `upload.onprogress` hat in fetch keine
   * Entsprechung.
   */
  function sendAttempt(formData: FormData, submissionKey: string, attempt: number): Promise<AttemptResult> {
    return new Promise((resolve) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/repairs");
      request.responseType = "json";
      request.timeout = REQUEST_TIMEOUT_MS;
      request.setRequestHeader("X-Submission-Key", submissionKey);
      request.setRequestHeader("X-Submission-Attempt", String(attempt));

      request.upload.onprogress = (progressEvent) => {
        if (progressEvent.lengthComputable) {
          setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      };
      /* Der Upload ist durch, der Server arbeitet. Ab hier zeigt das Formular
         "wird geprueft und gespeichert" statt eines Balkens, der auf 100 Prozent
         stehenbleibt. */
      request.upload.onload = () => {
        setUploadProgress(null);
        setSubmitPhase("processing");
      };

      request.onload = () => {
        const status = request.status;
        const body = request.response as { id?: unknown; error?: unknown; outsideRegion?: unknown; retry?: unknown } | null;

        if (status >= 200 && status < 300) {
          resolve({ kind: "success", id: typeof body?.id === "string" ? body.id : "" });
          return;
        }

        /* Die Absage fuer Einreichungen von ausserhalb ist keine Fehlermeldung,
           sondern ein Angebot - deshalb eigener Zustand statt form-error. */
        if (status === 403 && body?.outsideRegion) {
          resolve({ kind: "outside", help: body.outsideRegion as OutsideRegionHelp });
          return;
        }

        const message = typeof body?.error === "string" ? body.error : "Die Einreichung konnte nicht gesendet werden.";

        /* Nur Serverfehler sind einen zweiten Versuch wert. Bei 4xx hat der
           Server inhaltlich entschieden - auch beim Limit (429), dessen Meldung
           bereits sagt, wie lange zu warten ist. Ein automatischer Versuch
           dagegen waere nur ein weiterer Treffer auf dasselbe Limit.

           `retry: false` widerspricht dem ausdruecklich: So markiert der Server
           die Konfigurationsfehler, gegen die auch der dritte Versuch nichts
           ausrichtet. */
        const retryable = (status >= 500 || status === 0) && body?.retry !== false;
        resolve(retryable
          ? { kind: "retryable", message, reachedServer: status >= 500 }
          : { kind: "rejected", message });
      };

      request.onerror = () => {
        // Die Anfrage hat den Server nicht erreicht, das Captcha-Token ist also
        // unverbraucht und der naechste Versuch kann es weiterverwenden.
        resolve({ kind: "retryable", message: "Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.", reachedServer: false });
      };
      request.ontimeout = () => {
        resolve({ kind: "retryable", message: "Die Verbindung hat zu lange gebraucht. Bitte versuche es erneut.", reachedServer: false });
      };

      request.send(formData);
    });
  }

  async function submitRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Vor dem ersten await festhalten: React gibt currentTarget danach frei.
    const form = event.currentTarget;

    if (fileError || isCompressing) {
      return;
    }

    if (captchaEnabled && !friendlyCaptchaSiteKey) {
      setSubmissionError("Der Spam-Schutz ist noch nicht konfiguriert.");
      return;
    }

    /* Falls das Formular vollstaendig ist, ohne dass eine Eingabe das gemeldet
       hat - wiederhergestellte Felder nach einem Zurueck im Browser etwa -,
       startet der Spam-Schutz hier. Ohne diesen Notausgang bliebe das Widget
       ungeladen und die Einreichung dauerhaft haengen (Issue #73). */
    if (captchaEnabled && !isCaptchaArmed) {
      armCaptchaWhenComplete(form);
      setCaptchaError("Der Spam-Schutz startet jetzt. Bitte sende gleich noch einmal.");
      return;
    }

    if (captchaEnabled && !currentCaptchaToken(form)) {
      setCaptchaError("Der Spam-Schutz wird noch vorbereitet. Bitte versuche es gleich erneut.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");
    setOutsideRegion(null);
    setUploadProgress(0);
    setSubmitPhase("sending");
    setIsSlow(false);

    const slowTimer = window.setTimeout(() => setIsSlow(true), SLOW_NOTICE_AFTER_MS);
    submissionKeyRef.current ??= createSubmissionKey();
    const submissionKey = submissionKeyRef.current;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        setAttemptNumber(attempt);
        const usedToken = currentCaptchaToken(form);
        const result = await sendAttempt(buildFormData(form), submissionKey, attempt);

        if (result.kind === "success") {
          setSubmittedRepairId(result.id);
          setIsSubmitted(true);
          // Der Vorgang ist abgeschlossen; eine weitere Reparatur ist ein neuer.
          submissionKeyRef.current = null;
          return;
        }

        if (result.kind === "outside") {
          setOutsideRegion(result.help);
          return;
        }

        if (result.kind === "rejected") {
          setSubmissionError(result.message);
          return;
        }

        if (attempt === MAX_ATTEMPTS) {
          setSubmissionError(`${result.message} Wir haben es ${MAX_ATTEMPTS} Mal versucht. Deine Angaben stehen noch im Formular.`);
          return;
        }

        setSubmitPhase("sending");
        setUploadProgress(0);
        if (result.reachedServer && captchaEnabled) {
          await refreshCaptcha(form, usedToken);
        }
        await delay(RETRY_DELAYS_MS[attempt - 1]);
      }
    } finally {
      window.clearTimeout(slowTimer);
      setIsSubmitting(false);
      setUploadProgress(null);
      setSubmitPhase(null);
      setAttemptNumber(0);
      setIsSlow(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="success-state">
        {/* Das Motiv der gewaehlten Kategorie: Der Danke-Bildschirm bestaetigt
            damit nebenbei, was eingereicht wurde. */}
        <CategoryMotif category={category} size={88} />
        <p className="section-index">Eingereicht</p>
        <h2 id={headingId}>Danke. Deine Reparatur wird geprüft und zählt dann zum Rekord!</h2>
        <p>Sobald die Moderation deine Reparatur freigegeben hat, zählt sie zum Rekord und du kannst sie teilen.</p>
        {submittedRepairId && (
          <div className="success-share">
            <p className="success-share-hint">
              Merke dir diesen Link: Dort siehst du den Stand deiner Reparatur. Teilen kannst du sie, sobald die Moderation sie freigegeben hat.
            </p>
            <Link className="button button-primary" href={`/reparatur/${submittedRepairId}`}>
              Status ansehen <span aria-hidden="true">&#8594;</span>
            </Link>
          </div>
        )}
        {onDone && (
          <button className="text-button" type="button" onClick={onDone}>{doneLabel}</button>
        )}
      </div>
    );
  }

  return (
    <form className="repair-form" onSubmit={submitRepair} onChange={(event) => armCaptchaWhenComplete(event.currentTarget)}>
      <h2 id={headingId}>{heading}</h2>

      <RepairCategorySelect category={category} onChange={setCategory} label="Kategorie" />

      <label>Marke und Modell <small>(optional, soweit bekannt)</small>
        <input name="brand_model" type="text" maxLength={200} placeholder="z.B. Bosch Akkuschrauber GSR 18V" />
      </label>

      <label>Geschätzte Dauer der Reparatur in Minuten
        <input name="duration_minutes" type="number" inputMode="numeric" min={1} max={9999} placeholder="z.B. 45" />
      </label>

      <label>Geschätzter Wert des Gegenstands in Euro
        <input name="item_value_euros" type="number" inputMode="decimal" min={0} max={999999} step="0.01" placeholder="z.B. 120" />
      </label>

      <fieldset className="choice-group">
        <legend>Reparatur durchgeführt</legend>
        <label className="choice"><input name="performed_by" type="radio" value="alone" required /> <span>Allein</span></label>
        <label className="choice"><input name="performed_by" type="radio" value="with_support" /> <span>Gemeinsam mit Unterstützung</span></label>
        <label className="choice"><input name="performed_by" type="radio" value="by_someone" /> <span>Hat jemand für mich repariert</span></label>
      </fieldset>

      <label className="upload-field">Foto hinzufügen <small>(optional)</small>
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleImageChange} />
        <small>Lade gerne ein Bild von deinem Erfolgserlebnis und gerne auch von dir hoch. Wir zeigen die Fotos so, wie sie ankommen – wir verpixeln keine Gesichter. Sind andere Personen darauf zu erkennen, frag sie bitte vorher. JPG, PNG oder WebP · maximal 200 KB · Bild- und Standortdaten werden vor dem Upload entfernt.</small>
      </label>
      {isCompressing && <p className="form-notice" aria-live="polite">Bild wird komprimiert ...</p>}
      {previewUrl && (
        // A blob URL is local to the browser and cannot use Next.js image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="image-preview" src={previewUrl} alt="Vorschau des ausgewaehlten Reparaturbildes" />
      )}
      {compressionMessage && <p className="form-notice" role="status">{compressionMessage}</p>}
      {fileError && <p className="form-error" role="alert">{fileError}</p>}

      <div className="location-picker">
        <p className="location-picker-label">Standort <small>(optional, hilft der Karte bei der Zuordnung)</small></p>
        <div className="location-picker-actions">
          {/* Liegt der Standort schon fest - aus den Bilddaten oder aus der
              Standortfreigabe -, ist der Knopf erledigt und sagt das auch
              (Issue #76). Ein zweiter Druck brauchte eine Berechtigung, die
              nichts mehr beitraegt. Stimmt die Angabe nicht, bleibt die
              Kreisauswahl daneben der Weg zur Korrektur. */}
          <button className="button button-secondary" type="button" onClick={requestBrowserLocation} disabled={isLocating || hasLocation}>
            {isLocating ? "Standort wird ermittelt …" : locationSource === "photo" ? "Standort aus dem Foto erkannt" : locationSource === "gps" ? "Standort erkannt" : "Standort verwenden"}
          </button>
          <select
            value={selectedKreis}
            onChange={handleKreisSelect}
            aria-label="Kreis manuell auswählen"
            className={locationSource === "ip-suggestion" ? "is-suggestion" : undefined}
          >
            <option value="">Kreis manuell wählen</option>
            {nrwKreiseList.map((kreis) => <option key={kreis.name} value={kreis.name}>{kreis.name}</option>)}
          </select>
        </div>
        {locationStatus && (
          <p className={locationSource === "ip-suggestion" ? "geo-notice" : "form-notice"} role="status">
            {locationStatus}
          </p>
        )}
      </div>

      <label className="choice repair-outcome"><input name="repair_succeeded" type="checkbox" value="false" /> <span><strong>Die Reparatur ist leider nicht gelungen.</strong> Super, dass du es versucht hast! Für den Rekord zählen nur gelungene Reparaturen – am Gewinnspiel kannst du trotzdem teilnehmen, und dein Versuch fließt in die Erfolgsquote ein.</span></label>

      <label>Meine Reparaturgeschichte <small>(optional)</small>
        <textarea name="story" rows={4} maxLength={2000} placeholder="Deine Reparatur war besonders anstrengend, lustig, herzerwärmend, frustrierend etc.? Erzähl uns gerne davon!" />
      </label>

      {/* Mit Foto ist die Einwilligung eine andere als ohne: Ein Bild, auf dem
          jemand zu erkennen ist, wird nicht anonym veroeffentlicht - und
          niemand soll etwas abnicken, was auf ihn nicht zutrifft. Der Zusatz
          steht deshalb nur da, wenn wirklich ein Foto dabei ist (Issue #49). */}
      <label className="choice consent"><input name="consent" type="checkbox" value="true" required /> <span>
        Ich bin einverstanden, dass meine Angaben nach der Prüfung anonym veröffentlicht werden.
        {uploadFile && <> Mein Foto darf dabei auf dieser Website gezeigt und dafür verkleinert gespeichert werden. Sind Personen darauf zu erkennen, sind sie damit einverstanden. Das Foto kann ich später jederzeit <Link href="/privacy" target="_blank">löschen lassen</Link>.</>}
      </span></label>

      <label className="choice lottery-opt-in"><input type="checkbox" checked={enterLottery} onChange={(event) => setEnterLottery(event.target.checked)} /> <span>Ich möchte am <Link href="/gewinnspiel" target="_blank">Gewinnspiel</Link> teilnehmen <small>(Daten nur für die Verlosung / wird nicht veröffentlicht)</small></span></label>
      {enterLottery && (
        <fieldset className="lottery-fields">
          <legend>Angaben für die Verlosung</legend>
          <label>Name
            <input name="lottery_name" type="text" required maxLength={200} placeholder="Dein Name" />
          </label>
          <label>E-Mail
            <input name="lottery_email" type="email" required maxLength={254} placeholder="deine@email.de" />
          </label>
          <label className="choice consent"><input name="lottery_privacy" type="checkbox" value="true" required /> <span>Ich habe die <Link href="/privacy" target="_blank">Datenschutzerklärung</Link> gelesen und stimme der Verarbeitung meiner Daten für die Verlosung zu.</span></label>
        </fieldset>
      )}

      <p className="geo-notice">Teilnahme ist nur aus {process.env.NEXT_PUBLIC_REGION_LABEL ?? "Nordrhein-Westfalen"} möglich. Der Standort wird beim Absenden über die Vercel-Regionserkennung geprüft; die IP-Adresse wird nicht gespeichert.</p>
      {captchaEnabled ? friendlyCaptchaSiteKey ? isCaptchaArmed ? <div className="captcha-field"><FriendlyCaptcha sitekey={friendlyCaptchaSiteKey} onError={setCaptchaError} resetRef={resetCaptchaRef} /><small>Der Spam-Schutz von Friendly Captcha wird vor dem Absenden automatisch vorbereitet.</small></div> : <p className="form-notice" role="status">Der Spam-Schutz startet, sobald alle Pflichtangaben ausgefüllt sind.</p> : <p className="form-error" role="alert">Der Spam-Schutz ist noch nicht konfiguriert. Einreichungen bleiben gesperrt.</p> : <p className="form-notice" role="status">Der Spam-Schutz ist vorübergehend deaktiviert.</p>}
      {captchaError && <p className="form-error" role="alert">{captchaError}</p>}
      {/* Eine Anzeige fuer den ganzen Vorgang statt nur fuer den Upload: erst der
          Balken des Bildes, danach der Hinweis, dass der Server noch arbeitet.
          Ohne den zweiten Teil sah ein langsamer Server wie ein eingefrorenes
          Formular aus (Issue #64). */}
      {submitPhase && (
        <div className="upload-progress" aria-live="polite">
          {submitPhase === "sending" && uploadProgress !== null && uploadProgress < 100 ? <>
            <span>Bild wird hochgeladen: {uploadProgress} %</span>
            <progress value={uploadProgress} max="100" />
          </> : <>
            <span>Einreichung wird geprüft und gespeichert …</span>
            <progress />
          </>}
          {attemptNumber > 1 && <small>Der erste Versuch kam nicht durch. Versuch {attemptNumber} von {MAX_ATTEMPTS} – bitte das Formular offen lassen.</small>}
          {isSlow && attemptNumber <= 1 && <small>Das dauert länger als sonst. Bitte warte noch einen Moment, wir versuchen es weiter.</small>}
        </div>
      )}
      {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
      {outsideRegion && (
        <div className="outside-region-notice" role="alert">
          <h3>{outsideRegion.headline}</h3>
          <p>{outsideRegion.message}</p>
          <a className="button button-secondary" href={outsideRegion.href} target="_blank" rel="noreferrer">
            {outsideRegion.linkLabel} <span aria-hidden="true">&#8599;</span>
          </a>
          <p className="outside-region-hint">{outsideRegion.hint}</p>
        </div>
      )}
      <button className="button button-primary form-submit" type="submit" disabled={isSubmitting || isCompressing || Boolean(fileError)}>{isSubmitting ? submitPhase === "processing" ? "Wird gespeichert ..." : "Wird gesendet ..." : "Zur Prüfung einreichen"} <span aria-hidden="true">&#8594;</span></button>
    </form>
  );
}
