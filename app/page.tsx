"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { CampaignWindowNotice } from "@/components/campaign-window-notice";
import { FriendlyCaptcha } from "@/components/friendly-captcha";
import { MobileNavigation } from "@/components/mobile-navigation";
import { RepairFormFields } from "@/components/repair-form-fields";
import { repairCategories, repairCategoryLabel, type RepairCategory } from "@/lib/repair-catalog";

const MAX_IMAGE_BYTES = 200 * 1024;
const compressibleImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type GalleryRepair = {
  id: string;
  category: string;
  productName: string | null;
  description: string | null;
  imageAltText: string | null;
  imageUrl: string | null;
};

type RepairStats = {
  total: number;
  categories: Record<string, number>;
};

type CampaignStatus = {
  status: "open" | "before" | "after" | "invalid";
  startAt: string | null;
};

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

function useAnimatedCounter(value: number | null) {
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const previousValue = useRef(value ?? 0);

  useEffect(() => {
    if (value === null) return;
    const startValue = previousValue.current;
    const startedAt = performance.now();
    const duration = 900;
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previousValue.current = value;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return displayValue;
}

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState<RepairCategory>(repairCategories[0].value);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [compressionMessage, setCompressionMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [repairCount, setRepairCount] = useState<number | null>(null);
  const [repairStats, setRepairStats] = useState<RepairStats | null>(null);
  const [statsState, setStatsState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [galleryRepairs, setGalleryRepairs] = useState<GalleryRepair[]>([]);
  const [galleryError, setGalleryError] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [campaign, setCampaign] = useState<CampaignStatus>({ status: "invalid", startAt: null });
  const friendlyCaptchaSiteKey = process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY;
  const animatedRepairCount = useAnimatedCounter(repairCount);

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    async function loadRepairCount() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) {
          throw new Error("Statistik nicht verfuegbar");
        }

        const stats = await response.json() as RepairStats;
        setRepairCount(stats.total);
        setRepairStats(stats);
        setStatsState("ready");
        setStatsUpdatedAt(new Date());
      } catch {
        setStatsState("unavailable");
      }
    }

    void loadRepairCount();
    const interval = window.setInterval(() => void loadRepairCount(), 300_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadGallery() {
      const response = await fetch("/api/gallery");
      if (!response.ok) {
        setGalleryError("Die Galerie wird gerade vorbereitet.");
        return;
      }

      const data = await response.json() as { repairs: GalleryRepair[] };
      setGalleryRepairs(data.repairs);
    }

    void loadGallery();
  }, []);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch("/api/campaign", { cache: "no-store" });
        if (!response.ok) throw new Error("Kampagnenstatus nicht verfuegbar");
        const data = await response.json() as CampaignStatus;
        setCampaign(data);
      } catch {
        setCampaign({ status: "invalid", startAt: null });
      }
    }

    void loadCampaign();
  }, []);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError("");
    setCompressionMessage("");
    setUploadFile(null);

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
      const compressedFile = await createCompressedImage(file);
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

  function closeSubmission() {
    setCaptchaError("");
    setIsFormOpen(false);
  }

  function startSubmission(categoryValue?: RepairCategory) {
    if (categoryValue) setCategory(categoryValue);
    if (campaign.status !== "open") {
      document.getElementById("campaign-window")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setIsFormOpen(true);
  }

  function submitRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fileError || !uploadFile || isCompressing) {
      return;
    }

    if (!friendlyCaptchaSiteKey) {
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
    formData.set("image", uploadFile);
    const captchaResponse = formData.get("frc-captcha-response");
    if (typeof captchaResponse !== "string" || !captchaResponse) {
      setIsSubmitting(false);
      setUploadProgress(null);
      setCaptchaError("Der Spam-Schutz wird noch vorbereitet. Bitte versuche es gleich erneut.");
      return;
    }
    request.send(formData);
  }

  const topCategories = Object.entries(repairStats?.categories ?? {})
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3);

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite">
          <span className="brand-mark">R</span>
          <span>Reparaturrekord<br />NRW</span>
        </Link>
        <nav aria-label="Hauptnavigation">
          <Link href="/stories">Geschichten</Link>
          <Link href="/about">Projekt</Link>
          <Link href="/supporters">Unterstützer</Link>
        </nav>
        <Link className="header-link" href="/stats">Live-Stand</Link>
        <MobileNavigation />
      </header>

      <section id="top" className="hero-grid" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">FAB Region Bergisches Land · Oktober 2026</p>
          <h1 id="hero-title">Reparieren.<br /><span>Zählen.</span><br />Rekord machen.</h1>
          <p className="hero-intro">
            Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein und mache aus einem Gegenstand eine Geschichte.
          </p>
          <button className="button button-primary" type="button" onClick={() => startSubmission()}>
            {campaign.status === "open" ? "Reparatur einreichen" : campaign.status === "before" ? "Countdown ansehen" : "Teilnahmezeitraum ansehen"} <span aria-hidden="true">&#8594;</span>
          </button>
        </div>

        <div className="counter-panel" id="counter">
          <p className="counter-label">Freigegebene Reparaturen</p>
          <div className="counter-sparks" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
          <p className={`counter-number ${animatedRepairCount === null ? "is-loading" : ""}`} aria-live="polite" aria-label={animatedRepairCount === null ? "Freigegebene Reparaturen werden geladen" : `${animatedRepairCount} freigegebene Reparaturen`}>{animatedRepairCount === null ? "..." : animatedRepairCount.toLocaleString("de-DE")}</p>
          <div className="counter-meta">
            <span>Unser Ziel: 10.000</span>
            <span>{((repairCount ?? 0) / 10_000 * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
          </div>
          <div className="progress-track" aria-hidden="true"><span style={{ width: `${Math.min((repairCount ?? 0) / 100, 100)}%` }} /></div>
          <p className="counter-note">{statsState === "unavailable" ? "Der Live-Stand ist gerade nicht verfügbar." : statsUpdatedAt ? `Aktualisiert um ${statsUpdatedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.` : "Live-Stand wird geladen."}</p>
        </div>

        <aside className="hero-stamp" aria-label="Weltrekordversuch NRW">
          <span>Weltrekord<br />versuch</span>
          <strong>NRW<br />2026</strong>
        </aside>
      </section>

      {campaign.status !== "open" && <CampaignWindowNotice status={campaign.status} startAt={campaign.startAt} />}

      <section className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="section-index">Mitmachen</p>
          <h2 id="how-title">Ein Foto. Ein paar Fragen. Ein Zeichen für Reparatur.</h2>
        </div>
        <ol className="steps">
          <li><span className="step-number" aria-hidden="true">01</span><p>Foto deiner Reparatur aufnehmen.</p></li>
          <li><span className="step-number" aria-hidden="true">02</span><p>Gerät und Reparatur kurz beschreiben.</p></li>
          <li><span className="step-number" aria-hidden="true">03</span><p>Nach Prüfung wird dein Beitrag gezählt.</p></li>
        </ol>
      </section>

      <section className="participation-section" aria-labelledby="participation-title">
        <div className="participation-heading"><p className="section-index">Dein Weg zur Reparatur</p><h2 id="participation-title">Mach aus einer Reparatur einen sichtbaren Beitrag.</h2><p>Du musst kein Profi sein. Wichtig ist nur: Die Reparatur ist echt, du beschreibst sie kurz und reichst sie während des Teilnahmezeitraums ein.</p></div>
        <div className="participation-options">
          <article><span className="participation-icon participation-icon-camera" aria-hidden="true" /><h3>Selbst repariert?</h3><p>Mach ein Foto, wähle die Kategorie und erzähle in wenigen Sätzen, was wieder funktioniert.</p><button className="text-button" type="button" onClick={() => startSubmission()}>Reparatur einreichen <span aria-hidden="true">&#8594;</span></button></article>
          <article><span className="participation-icon participation-icon-wrench" aria-hidden="true" /><h3>Du brauchst Hilfe?</h3><p>In Repair Cafés und offenen Werkstätten findest du Menschen, Werkzeuge und Zeit für die nächste Reparatur.</p><a className="text-button" href="https://www.repaircafe.org/en/visit/" target="_blank" rel="noreferrer">Repair Café finden <span aria-hidden="true">&#8599;</span></a></article>
          <article><span className="participation-icon participation-icon-network" aria-hidden="true" /><h3>Ihr seid eine Einrichtung?</h3><p>Werkstätten, Schulen, Vereine und Initiativen können ihre Reparaturen sichtbar machen und das Projekt unterstützen.</p><a className="text-button" href="mailto:mail@gut-einern.org?subject=Reparaturrekord%20NRW%20unterstuetzen">Kontakt aufnehmen <span aria-hidden="true">&#8594;</span></a></article>
        </div>
      </section>

      <section className="home-stats-preview" aria-labelledby="home-stats-title">
        <div><p className="section-index">Live-Auswertung</p><h2 id="home-stats-title">Was gerade repariert wird.</h2><p>Die Auswertung zeigt ausschließlich freigegebene Einreichungen. Aus Datenschutzgründen werden keine Orte auf einer Karte dargestellt.</p><Link className="text-button" href="/stats">Alle Statistiken <span aria-hidden="true">&#8594;</span></Link></div>
        <ol>{topCategories.length > 0 ? topCategories.map(([categoryName, total]) => <li key={categoryName}><span>{repairCategoryLabel(categoryName)}</span><strong>{total.toLocaleString("de-DE")}</strong></li>) : <li className="home-stats-empty">{statsState === "unavailable" ? "Die Statistik wird während des Weltrekordversuchs freigeschaltet." : "Die ersten freigegebenen Reparaturen erscheinen hier."}</li>}</ol>
      </section>

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <p className="section-index">Kategorien</p>
            <h2 id="category-title">Was hast du wieder in Bewegung gebracht?</h2>
          </div>
          <button className="text-button" type="button" onClick={() => startSubmission()}>{campaign.status === "open" ? "Jetzt einreichen" : "Teilnahmezeitraum ansehen"} <span aria-hidden="true">&#8594;</span></button>
        </div>
        <div className="category-grid">
          {repairCategories.map((item, index) => (
            <button className={`category-card category-${index + 1}`} type="button" key={item.value} onClick={() => startSubmission(item.value)}>
              <span>{(repairStats?.categories[item.value] ?? 0).toLocaleString("de-DE")} Reparaturen</span>
              <strong>{item.label}</strong>
              <i aria-hidden="true">&#8599;</i>
            </button>
          ))}
        </div>
      </section>

      <section className="stories-section" id="geschichten" aria-labelledby="stories-title">
        <div className="section-heading">
          <div>
            <p className="section-index">Freigegebene Reparaturen</p>
            <h2 id="stories-title">Gegenstaende mit zweitem Kapitel.</h2>
          </div>
          <Link className="text-button" href="/stories">Alle Geschichten <span aria-hidden="true">&#8594;</span></Link>
        </div>
        {galleryError ? <p className="gallery-empty" role="status">{galleryError}</p> : galleryRepairs.length === 0 ? <p className="gallery-empty">Die ersten freigegebenen Reparaturen erscheinen bald hier.</p> : <div className="gallery-mini-grid">{galleryRepairs.map((repair) => { const categoryIndex = Math.max(repairCategories.findIndex((categoryItem) => categoryItem.value === repair.category), 0) + 1; return <article className="gallery-mini-card" key={repair.id}>{repair.imageUrl ? <>
          {/* Signed URLs from the private bucket cannot use Next.js image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={repair.imageUrl} alt={repair.imageAltText || `Reparatur aus der Kategorie ${repairCategoryLabel(repair.category)}`} />
        </> : <div className={`gallery-placeholder category-${categoryIndex}`} aria-label={`Kein Bild: ${repairCategoryLabel(repair.category)}`} /> }<div><span>{repairCategoryLabel(repair.category)}</span><strong>{repair.productName || "Reparatur aus NRW"}</strong></div></article>; })}</div>}
      </section>

      <section className="project-banner" id="ueber-uns">
        <p>Reparatur ist keine Ausnahme.<br />Sie ist Infrastruktur.</p>
        <Link className="button button-secondary" href="/about">Über das Projekt <span aria-hidden="true">&#8594;</span></Link>
      </section>

      <section className="funding-strip" aria-label="Projekt- und Foerderhinweise">
        <p>Teil der FAB Region Bergisches Staedtedreieck</p>
        <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer"><NextImage src="/funding/fab-region.svg" alt="FAB Region Bergisches Staedtedreieck" width={170} height={56} /></a>
        <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer"><NextImage src="/funding/eu.svg" alt="Kofinanziert von der Europaeischen Union" width={130} height={56} /></a>
        <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer"><NextImage src="/funding/nrw.svg" alt="Ministerium fuer Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen" width={150} height={56} /></a>
      </section>

      <footer className="site-footer">
        <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
        <div><Link href="/privacy">Datenschutz</Link><Link href="/imprint">Impressum</Link><Link href="/accessibility">Barrierefreiheit</Link></div>
        <p>Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region</a></p>
      </footer>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeSubmission}>
          <section className="submission-panel" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button" type="button" aria-label="Formular schliessen" onClick={closeSubmission}>&times;</button>
            {isSubmitted ? (
              <div className="success-state">
                <p className="section-index">Eingereicht</p>
                <h2>Danke. Deine Reparatur wartet auf die Pruefung.</h2>
                <p>Nach der Moderation zaehlt sie zum Rekord.</p>
                <button className="button button-primary" type="button" onClick={() => { setIsSubmitted(false); closeSubmission(); }}>Fertig</button>
              </div>
            ) : (
              <form onSubmit={submitRepair}>
                <p className="section-index">Deine Reparatur / Schritt 1 von 3</p>
                <h2 id="submission-title">Was wurde repariert?</h2>
                <input name="category" type="hidden" value={category} />
                <RepairFormFields category={category} onChange={setCategory} />
                <label>Was war kaputt und was hast du getan?
                  <textarea name="description" required rows={4} maxLength={2000} placeholder="Zum Beispiel: Kabel getauscht, Schalter gereinigt ..." />
                </label>
                <label className="upload-field">Foto hinzufuegen
                  <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={handleImageChange} />
                  <small>JPG, PNG oder WebP · maximal 200 KB · Bild- und Standortdaten werden vor dem Upload entfernt</small>
                </label>
                {isCompressing && <p className="form-notice" aria-live="polite">Bild wird komprimiert ...</p>}
                {previewUrl && (
                  // A blob URL is local to the browser and cannot use Next.js image optimization.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="image-preview" src={previewUrl} alt="Vorschau des ausgewaehlten Reparaturbildes" />
                )}
                {compressionMessage && <p className="form-notice" role="status">{compressionMessage}</p>}
                {fileError && <p className="form-error" role="alert">{fileError}</p>}
                <label className="repair-outcome"><input name="repair_succeeded" type="checkbox" value="false" /> <span>Die Reparatur ist leider nicht gelungen. Auch dieser Versuch zaehlt und darf eingereicht werden.</span></label>
                <label className="consent"><input name="consent" type="checkbox" value="true" required /> <span>Ich bin einverstanden, dass mein Bild nach der Pruefung veroeffentlicht wird.</span></label>
                <p className="geo-notice">Teilnahme ist nur aus Nordrhein-Westfalen moeglich. Der Standort wird beim Absenden ueber die Vercel-Regionserkennung geprueft; die IP-Adresse wird nicht gespeichert.</p>
                {friendlyCaptchaSiteKey ? <div className="captcha-field"><FriendlyCaptcha sitekey={friendlyCaptchaSiteKey} onError={setCaptchaError} /><small>Der Spam-Schutz von Friendly Captcha wird vor dem Absenden automatisch vorbereitet.</small></div> : <p className="form-error" role="alert">Der Spam-Schutz ist noch nicht konfiguriert. Einreichungen bleiben gesperrt.</p>}
                {captchaError && <p className="form-error" role="alert">{captchaError}</p>}
                {uploadProgress !== null && <div className="upload-progress" aria-live="polite"><span>Bild wird hochgeladen: {uploadProgress} %</span><progress value={uploadProgress} max="100" /></div>}
                {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
                <button className="button button-primary" type="submit" disabled={isSubmitting || isCompressing || Boolean(fileError)}>{isSubmitting ? "Wird gesendet ..." : "Zur Pruefung einreichen"} <span aria-hidden="true">&#8594;</span></button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
