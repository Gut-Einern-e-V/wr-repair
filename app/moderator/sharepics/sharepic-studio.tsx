"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { posterBackgrounds } from "@/lib/poster";
import { shareVisualGroundOrder, type ShareVisualGround } from "@/lib/share-visual";
import { HEADLINE_MAX_CHARS, HEADLINE_MAX_LINES, sharepicMotifOrder, sharepicMotifs, type SharepicMotif } from "@/lib/sharepics";

const groups = ["Start", "Laufend", "Finale", "Extras"] as const;

/** Wie lange nach dem letzten Tastendruck die Vorschau neu gezeichnet wird. */
const TYPING_DELAY_MS = 450;

export function SharepicStudio({ kreise }: { kreise: string[] }) {
  const [motif, setMotif] = useState<SharepicMotif>("launch");
  const [ground, setGround] = useState<ShareVisualGround>(sharepicMotifs.launch.ground);
  const [kreis, setKreis] = useState("");
  const [kreisB, setKreisB] = useState("");
  const [milestone, setMilestone] = useState("");
  const [headline, setHeadline] = useState("");
  const [demo, setDemo] = useState(false);
  /* Die Uhrzeit gehoert in die Adresse, damit "Neu laden" wirklich den
     aktuellen Stand holt und nicht das Bild aus dem Browser-Speicher. */
  const [stamp, setStamp] = useState(0);
  /* Welche Adresse zuletzt fertig geladen bzw. gescheitert ist - daraus
     ergibt sich, ob die Vorschau gerade laedt, ohne eigenen Zustand. */
  const [loadedSrc, setLoadedSrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");

  const spec = sharepicMotifs[motif];

  const query = useMemo(() => {
    const params = new URLSearchParams({ motif, ground });
    if (spec.params.includes("kreis") && kreis) params.set("kreis", kreis);
    if (spec.params.includes("kreisB") && kreisB) params.set("kreisB", kreisB);
    if (spec.params.includes("milestone") && milestone) params.set("milestone", milestone);
    if (headline.trim()) params.set("headline", headline);
    if (demo) params.set("demo", "1");
    return params.toString();
  }, [motif, ground, kreis, kreisB, milestone, headline, demo, spec.params]);

  /* Tippen soll nicht bei jedem Buchstaben ein neues Bild anfordern. */
  const [previewQuery, setPreviewQuery] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewQuery(query), TYPING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const previewSrc = `/moderator/sharepics/image?${previewQuery}&t=${stamp}`;
  const loading = loadedSrc !== previewSrc && failedSrc !== previewSrc;
  const failed = failedSrc === previewSrc;

  function chooseMotif(value: SharepicMotif) {
    setMotif(value);
    setGround(sharepicMotifs[value].ground);
    setHeadline("");
  }

  return <main className="poster-page sharepic-page" data-reveal="off">
    <section className="poster-intro">
      <p className="brand-kicker">Moderation</p>
      <h1 className="sticker-head is-mint"><span className="sticker">Sharepics</span><span className="sticker">für Storys</span></h1>
      <p>
        Motiv wählen, Vorschau ansehen, herunterladen. Die Zahlen sind der Live-Stand in dem Moment, in dem du das Bild
        lädst – unten auf dem Bild steht, wann das war. Format 1080 × 1920 für Instagram-Storys; oben und unten bleibt Platz
        für die Bedienelemente von Instagram und den Link-Sticker.
      </p>
      <p className="link-row"><Link className="text-button" href="/moderator"><span aria-hidden="true">&#8592;</span> Zurück zur Moderation</Link></p>
    </section>

    <div className="sharepic-layout">
      <form className="poster-controls" onSubmit={(event) => event.preventDefault()}>
        {groups.map((group) => <fieldset key={group}>
          <legend>{group}</legend>
          <div className="poster-choices">
            {sharepicMotifOrder.filter((value) => sharepicMotifs[value].group === group).map((value) => <label key={value}>
              <input type="radio" name="sharepic-motif" value={value} checked={motif === value} onChange={() => chooseMotif(value)} />
              <span>{sharepicMotifs[value].label}<small>{sharepicMotifs[value].hint}</small></span>
            </label>)}
          </div>
        </fieldset>)}

        <fieldset>
          <legend>Hintergrund</legend>
          <div className="poster-choices">
            {shareVisualGroundOrder.map((value) => <label key={value}>
              <input type="radio" name="sharepic-ground" value={value} checked={ground === value} onChange={() => setGround(value)} />
              <i className={`poster-swatch bg-${value}`} aria-hidden="true" />
              <span>{posterBackgrounds[value].label}</span>
            </label>)}
          </div>
        </fieldset>

        {(spec.params.length > 0) && <fieldset>
          <legend>Angaben</legend>
          <div className="sharepic-fields">
            {spec.params.includes("kreis") && <label>
              <span>{spec.params.includes("kreisB") ? "Erste Stadt" : "Stadt oder Kreis"}</span>
              <select value={kreis} onChange={(event) => setKreis(event.target.value)}>
                <option value="">Automatisch: Platz 1</option>
                {kreise.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>}
            {spec.params.includes("kreisB") && <label>
              <span>Zweite Stadt</span>
              <select value={kreisB} onChange={(event) => setKreisB(event.target.value)}>
                <option value="">Automatisch: die nächste in der Rangliste</option>
                {kreise.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>}
            {spec.params.includes("milestone") && <label>
              <span>Meilenstein</span>
              <input type="number" min={1} step={1} inputMode="numeric" placeholder="Automatisch aus dem Stand" value={milestone} onChange={(event) => setMilestone(event.target.value)} />
            </label>}
          </div>
        </fieldset>}

        <fieldset>
          <legend>Text</legend>
          <div className="sharepic-fields">
            <label>
              <span>Eigene Überschrift <small>Optional. Eine Zeile je Aufkleber, höchstens {HEADLINE_MAX_LINES} mit je {HEADLINE_MAX_CHARS} Zeichen.</small></span>
              <textarea rows={3} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Leer lassen für die Vorgabe" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Vorschau</legend>
          <div className="poster-toggles">
            <label>
              <input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} />
              <span>Beispielzahlen verwenden<small>Solange es noch keine echten gibt. Das Bild trägt dann „Beispiel“ quer darüber.</small></span>
            </label>
          </div>
        </fieldset>

        <div className="poster-actions">
          <a className="button button-primary" href={`/moderator/sharepics/image?${query}&download=1`} download>Herunterladen</a>
          <button type="button" className="button button-secondary" onClick={() => setStamp(Date.now())}>Stand neu laden</button>
        </div>
      </form>

      <div className="sharepic-preview" aria-live="polite">
        {/* eslint-disable-next-line @next/next/no-img-element -- ein vom Server gezeichnetes PNG, der Bildoptimierer braucht es nicht. */}
        <img
          src={previewSrc}
          width={1080}
          height={1920}
          alt={`Vorschau: ${spec.label}`}
          className={loading ? "is-loading" : ""}
          onLoad={() => setLoadedSrc(previewSrc)}
          onError={() => setFailedSrc(previewSrc)}
        />
        {failed && <p className="form-error" role="alert">Das Bild konnte nicht gezeichnet werden. Bist du noch angemeldet?</p>}
      </div>
    </div>
  </main>;
}
