"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

const categories = [
  { label: "Elektrogeraete", value: "electrical_appliances" },
  { label: "Haushaltsgeraete", value: "household_appliances" },
  { label: "Computer & Kommunikation", value: "computers_and_communication" },
  { label: "Fahrraeder", value: "bicycles" },
  { label: "Moebel", value: "furniture" },
  { label: "Textilien & Kleidung", value: "textiles_and_clothing" },
  { label: "Werkzeuge", value: "tools" },
  { label: "Spielzeug & Freizeit", value: "toys_and_leisure" },
  { label: "Sonstiges", value: "other" },
];

const stories = [
  { category: "Elektrogeraete", title: "Die Kaffeemaschine brueht wieder.", tag: "Repair-Cafe Wuppertal" },
  { category: "Fahrraeder", title: "Aus acht Jahren Stillstand wird eine neue Tour.", tag: "DIY in Remscheid" },
  { category: "Textilien & Kleidung", title: "Ein Lieblingsmantel bleibt in der Familie.", tag: "Schule Solingen" },
];

const categoryQuestions: Record<string, { id: string; label: string; options: string[] }[]> = {
  electrical_appliances: [{ id: "device", label: "Was fuer ein Elektrogeraet?", options: ["Kleingeraet", "Audio oder Video", "Lampe", "Anderes"] }],
  household_appliances: [{ id: "device", label: "Welches Haushaltsgeraet?", options: ["Kueche", "Waschen", "Reinigen", "Anderes"] }],
  computers_and_communication: [{ id: "device", label: "Welches Geraet?", options: ["Computer", "Smartphone", "Netzwerk", "Anderes"] }],
  bicycles: [{ id: "repair", label: "Was wurde repariert?", options: ["Bremse", "Antrieb", "Reifen", "Anderes"] }],
  furniture: [{ id: "material", label: "Woraus besteht das Moebel?", options: ["Holz", "Metall", "Kunststoff", "Anderes"] }],
  textiles_and_clothing: [{ id: "repair", label: "Welche Reparatur war es?", options: ["Naht", "Flicken", "Reissverschluss", "Anderes"] }],
  tools: [{ id: "tool", label: "Welches Werkzeug?", options: ["Elektrowerkzeug", "Handwerkzeug", "Gartengeraet", "Anderes"] }],
  toys_and_leisure: [{ id: "item", label: "Was wurde repariert?", options: ["Spielzeug", "Sport", "Musik", "Anderes"] }],
  other: [{ id: "item", label: "Was wurde repariert?", options: ["Alltagsgegenstand", "Dekoration", "Anderes", "Sonstiges"] }],
};

const MAX_IMAGE_BYTES = 200 * 1024;
const compressibleImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function createCompressedImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);

    image.onload = async () => {
      URL.revokeObjectURL(sourceUrl);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Bildkomprimierung ist in diesem Browser nicht verfuegbar."));
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

      reject(new Error("Das Bild konnte nicht klein genug komprimiert werden. Bitte waehle ein anderes Bild."));
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("Dieses Bildformat kann nicht komprimiert werden."));
    };

    image.src = sourceUrl;
  });
}

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState(categories[0].value);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [compressionMessage, setCompressionMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [repairCount, setRepairCount] = useState(1287);
  const activeQuestions = categoryQuestions[category] ?? [];

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    async function loadRepairCount() {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        return;
      }

      const stats = await response.json() as { total: number };
      setRepairCount(stats.total);
    }

    void loadRepairCount();
    const interval = window.setInterval(() => void loadRepairCount(), 300_000);
    return () => window.clearInterval(interval);
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
      setFileError("Bitte waehle ein JPG, PNG oder WebP. Dieses Format kann nicht datenschutzsicher verarbeitet werden.");
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

  function submitRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fileError || !uploadFile || isCompressing) {
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
      setSubmissionError("Netzwerkfehler. Bitte pruefe deine Verbindung und versuche es erneut.");
    };
    const formData = new FormData(event.currentTarget);
    formData.set("image", uploadFile);
    request.send(formData);
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Reparaturrekord NRW Startseite">
          <span className="brand-mark">R</span>
          <span>Reparaturrekord<br />NRW</span>
        </a>
        <nav aria-label="Hauptnavigation">
          <a href="#geschichten">Geschichten</a>
          <a href="#ueber-uns">Projekt</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
        <a className="header-link" href="#counter">Live-Stand</a>
      </header>

      <section id="top" className="hero-grid" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">FAB Region Bergisches Land · Oktober 2026</p>
          <h1 id="hero-title">Reparieren.<br /><span>Zaehlen.</span><br />Rekord machen.</h1>
          <p className="hero-intro">
            Ganz NRW zeigt, was noch funktioniert. Reiche deine Reparatur ein und mache aus einem Gegenstand eine Geschichte.
          </p>
          <button className="button button-primary" type="button" onClick={() => setIsFormOpen(true)}>
            Reparatur einreichen <span aria-hidden="true">&#8594;</span>
          </button>
        </div>

        <div className="counter-panel" id="counter">
          <p className="counter-label">Freigegebene Reparaturen</p>
          <p className="counter-number" aria-label={`${repairCount} freigegebene Reparaturen`}>{repairCount.toLocaleString("de-DE")}</p>
          <div className="counter-meta">
            <span>Unser Ziel: 10.000</span>
            <span>{(repairCount / 10_000 * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
          </div>
          <div className="progress-track" aria-hidden="true"><span style={{ width: `${Math.min(repairCount / 100, 100)}%` }} /></div>
          <p className="counter-note">Jede Reparatur zaehlt. Auch wenn sie nicht gelungen ist.</p>
        </div>

        <aside className="hero-stamp" aria-label="Weltrekordversuch NRW">
          <span>Weltrekord<br />versuch</span>
          <strong>NRW<br />2026</strong>
        </aside>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="section-index">01 / Mitmachen</p>
          <h2 id="how-title">Ein Foto. Ein paar Fragen. Ein Zeichen fuer Reparatur.</h2>
        </div>
        <ol className="steps">
          <li><span>01</span><p>Foto deiner Reparatur aufnehmen.</p></li>
          <li><span>02</span><p>Gerat und Reparatur kurz beschreiben.</p></li>
          <li><span>03</span><p>Nach Pruefung wird dein Beitrag gezaehlt.</p></li>
        </ol>
      </section>

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <p className="section-index">02 / Alles bleibt</p>
            <h2 id="category-title">Was hast du wieder in Bewegung gebracht?</h2>
          </div>
          <button className="text-button" type="button" onClick={() => setIsFormOpen(true)}>Jetzt einreichen <span aria-hidden="true">&#8594;</span></button>
        </div>
        <div className="category-grid">
          {categories.map((item, index) => (
            <button className={`category-card category-${index + 1}`} type="button" key={item.value} onClick={() => { setCategory(item.value); setIsFormOpen(true); }}>
              <span>0{index + 1}</span>
              <strong>{item.label}</strong>
              <i aria-hidden="true">&#8599;</i>
            </button>
          ))}
        </div>
      </section>

      <section className="stories-section" id="geschichten" aria-labelledby="stories-title">
        <div className="section-heading">
          <div>
            <p className="section-index">03 / Reparaturgeschichten</p>
            <h2 id="stories-title">Gegenstaende mit zweitem Kapitel.</h2>
          </div>
          <a className="text-button" href="#kontakt">Alle Geschichten <span aria-hidden="true">&#8594;</span></a>
        </div>
        <div className="story-grid">
          {stories.map((story, index) => (
            <article className={`story-card story-${index + 1}`} key={story.title}>
              <div className="story-art" aria-hidden="true"><span>{index === 0 ? "KM" : index === 1 ? "RAD" : "TXT"}</span></div>
              <p>{story.tag}</p>
              <h3>{story.title}</h3>
              <a href="#kontakt" aria-label={`${story.title} lesen`}>Lesen <span aria-hidden="true">&#8594;</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="project-banner" id="ueber-uns">
        <p>Reparatur ist keine Ausnahme.<br />Sie ist Infrastruktur.</p>
        <a className="button button-secondary" href="#kontakt">Ueber das Projekt <span aria-hidden="true">&#8594;</span></a>
      </section>

      <footer id="kontakt" className="site-footer">
        <p><strong>Reparaturrekord NRW</strong><br />Ein Projekt der FAB Region Bergisches Land.</p>
        <div><a href="#kontakt">Datenschutz</a><a href="#kontakt">Impressum</a><a href="#kontakt">Barrierefreiheit</a></div>
        <p>Gefordert durch<br />EFRE · NRW · Europa</p>
      </footer>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsFormOpen(false)}>
          <section className="submission-panel" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button" type="button" aria-label="Formular schliessen" onClick={() => setIsFormOpen(false)}>&times;</button>
            {isSubmitted ? (
              <div className="success-state">
                <p className="section-index">Eingereicht</p>
                <h2>Danke. Deine Reparatur wartet auf die Pruefung.</h2>
                <p>Nach der Moderation zaehlt sie zum Rekord.</p>
                <button className="button button-primary" type="button" onClick={() => { setIsSubmitted(false); setIsFormOpen(false); }}>Fertig</button>
              </div>
            ) : (
              <form onSubmit={submitRepair}>
                <p className="section-index">Deine Reparatur / Schritt 1 von 3</p>
                <h2 id="submission-title">Was wurde repariert?</h2>
                <label>Geraetekategorie
                  <select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>Was war kaputt und was hast du getan?
                  <textarea name="description" required rows={4} maxLength={2000} placeholder="Zum Beispiel: Kabel getauscht, Schalter gereinigt ..." />
                </label>
                {activeQuestions.map((question) => (
                  <label key={question.id}>{question.label}
                    <select name={`answer_${question.id}`} required>
                      <option value="">Bitte waehlen</option>
                      {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                ))}
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
