"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FriendlyCaptcha } from "@/components/friendly-captcha";
import { RepairCategorySelect } from "@/components/repair-form-fields";
import { repairCategories, type RepairCategory } from "@/lib/repair-catalog";
import { anonymizeCoordinates, type AnonymizedPoint } from "@/lib/geo-anonymize";

const MAX_IMAGE_BYTES = 200 * 1024;
const compressibleImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Liest die Aufnahmeposition aus dem Originalbild und gibt sie sofort
 * gerastert zurueck.
 *
 * Der Ablauf ist bewusst so geschnitten, dass die Rohkoordinate das Geraet nie
 * verlaesst: Sie existiert nur innerhalb dieser Funktion, wird direkt in eine
 * ~5-km-Zelle uebersetzt und danach verworfen. Anschliessend entfernt
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
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [anonymizedOrigin, setAnonymizedOrigin] = useState<AnonymizedPoint | null>(null);
  const [compressionMessage, setCompressionMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const [enterLottery, setEnterLottery] = useState(false);
  const friendlyCaptchaSiteKey = process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY;
  const captchaEnabled = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED !== "false";

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

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
      setAnonymizedOrigin(origin);
      setUploadFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
      setCompressionMessage(
        compressedFile.size < file.size
          ? `Bild wurde von ${Math.ceil(file.size / 1024)} KB auf ${Math.ceil(compressedFile.size / 1024)} KB komprimiert. Metadaten wurden entfernt.`
          : "Bilddaten wurden vor dem Upload bereinigt. EXIF- und Standortdaten wurden entfernt.",
      );
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Das Bild konnte nicht verarbeitet werden.");
      event.target.value = "";
    } finally {
      setIsCompressing(false);
    }
  }

  function submitRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fileError || isCompressing) {
      return;
    }

    if (captchaEnabled && !friendlyCaptchaSiteKey) {
      setSubmissionError("Der Spam-Schutz ist noch nicht konfiguriert.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");
    setUploadProgress(0);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/repairs");
    request.responseType = "json";
    request.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable) {
        setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
      }
    };
    request.onload = () => {
      setIsSubmitting(false);
      setUploadProgress(null);

      if (request.status >= 200 && request.status < 300) {
        setSubmittedRepairId(typeof request.response?.id === "string" ? request.response.id : "");
        setIsSubmitted(true);
        return;
      }

      setSubmissionError(request.response?.error ?? "Die Einreichung konnte nicht gesendet werden.");
    };
    request.onerror = () => {
      setIsSubmitting(false);
      setUploadProgress(null);
      setSubmissionError("Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.");
    };
    const formData = new FormData(event.currentTarget);
    if (uploadFile) {
      formData.set("image", uploadFile);
    }
    if (anonymizedOrigin) {
      // Bereits gerastert. Der Server prueft das nach und verwirft alles,
      // was nicht exakt auf einem Zellpunkt liegt.
      formData.set("origin_lat", String(anonymizedOrigin.lat));
      formData.set("origin_lon", String(anonymizedOrigin.lon));
    }
    if (captchaEnabled) {
      const captchaResponse = formData.get("frc-captcha-response");
      if (typeof captchaResponse !== "string" || !captchaResponse) {
        setIsSubmitting(false);
        setUploadProgress(null);
        setCaptchaError("Der Spam-Schutz wird noch vorbereitet. Bitte versuche es gleich erneut.");
        return;
      }
    }
    request.send(formData);
  }

  if (isSubmitted) {
    return (
      <div className="success-state">
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
    <form className="repair-form" onSubmit={submitRepair}>
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
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
        <small>Lade gerne ein Bild von deinem Erfolgserlebnis und gerne auch von dir hoch. JPG, PNG oder WebP · maximal 200 KB · Bild- und Standortdaten werden vor dem Upload entfernt.</small>
      </label>
      {isCompressing && <p className="form-notice" aria-live="polite">Bild wird komprimiert ...</p>}
      {previewUrl && (
        // A blob URL is local to the browser and cannot use Next.js image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="image-preview" src={previewUrl} alt="Vorschau des ausgewaehlten Reparaturbildes" />
      )}
      {compressionMessage && <p className="form-notice" role="status">{compressionMessage}</p>}
      {fileError && <p className="form-error" role="alert">{fileError}</p>}

      <label className="choice repair-outcome"><input name="repair_succeeded" type="checkbox" value="false" /> <span><strong>Die Reparatur ist leider nicht gelungen.</strong> Super, dass du es versucht hast! Du kannst trotzdem am Gewinnspiel teilnehmen!</span></label>

      <label>Meine Reparaturgeschichte <small>(optional)</small>
        <textarea name="story" rows={4} maxLength={2000} placeholder="Deine Reparatur war besonders anstrengend, lustig, herzerwärmend, frustrierend etc.? Erzähl uns gerne davon!" />
      </label>

      <label className="choice consent"><input name="consent" type="checkbox" value="true" required /> <span>Ich bin einverstanden, dass meine Angaben nach der Prüfung anonym veröffentlicht werden.</span></label>

      <label className="choice lottery-opt-in"><input type="checkbox" checked={enterLottery} onChange={(event) => setEnterLottery(event.target.checked)} /> <span>Ich möchte am Gewinnspiel teilnehmen <small>(Daten nur für die Verlosung / wird nicht veröffentlicht)</small></span></label>
      {enterLottery && (
        <fieldset className="lottery-fields">
          <legend>Angaben für die Verlosung</legend>
          <label>Name
            <input name="lottery_name" type="text" required maxLength={200} placeholder="Dein Name" />
          </label>
          <label>E-Mail
            <input name="lottery_email" type="email" required maxLength={254} placeholder="deine@email.de" />
          </label>
          <label className="choice consent"><input name="lottery_privacy" type="checkbox" required /> <span>Ich habe die <Link href="/privacy" target="_blank">Datenschutzerklärung</Link> gelesen und stimme der Verarbeitung meiner Daten für die Verlosung zu.</span></label>
        </fieldset>
      )}

      <p className="geo-notice">Teilnahme ist nur aus {process.env.NEXT_PUBLIC_REGION_LABEL ?? "Nordrhein-Westfalen"} möglich. Der Standort wird beim Absenden über die Vercel-Regionserkennung geprüft; die IP-Adresse wird nicht gespeichert.</p>
      {captchaEnabled ? friendlyCaptchaSiteKey ? <div className="captcha-field"><FriendlyCaptcha sitekey={friendlyCaptchaSiteKey} onError={setCaptchaError} /><small>Der Spam-Schutz von Friendly Captcha wird vor dem Absenden automatisch vorbereitet.</small></div> : <p className="form-error" role="alert">Der Spam-Schutz ist noch nicht konfiguriert. Einreichungen bleiben gesperrt.</p> : <p className="form-notice" role="status">Der Spam-Schutz ist vorübergehend deaktiviert.</p>}
      {captchaError && <p className="form-error" role="alert">{captchaError}</p>}
      {uploadProgress !== null && <div className="upload-progress" aria-live="polite"><span>Bild wird hochgeladen: {uploadProgress} %</span><progress value={uploadProgress} max="100" /></div>}
      {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
      <button className="button button-primary form-submit" type="submit" disabled={isSubmitting || isCompressing || Boolean(fileError)}>{isSubmitting ? "Wird gesendet ..." : "Zur Prüfung einreichen"} <span aria-hidden="true">&#8594;</span></button>
    </form>
  );
}
