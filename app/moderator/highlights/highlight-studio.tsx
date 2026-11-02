"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { repairCategories } from "@/lib/repair-catalog";
import { HIGHLIGHT_LIMITS, highlightStatusLabels, highlightStatuses, type HighlightStatus } from "@/lib/story-highlights";
import { useJsonResource } from "@/lib/use-json-resource";
import { performedByLabel } from "../repair-types";
import { addHighlight, removeHighlight, updateHighlight, type Highlight, type SearchResponse, type SearchResult } from "./highlight-api";

type View = "bucket" | "search";
type SearchFilters = { q: string; category: string; kreis: string; withImage: boolean; minLength: number; sort: "longest" | "newest" };

const initialFilters: SearchFilters = { q: "", category: "", kreis: "", withImage: false, minLength: 150, sort: "longest" };

/**
 * Highlight-Eimer und Fundgrube.
 *
 * Links der Eimer mit allem, was vorgemerkt ist, rechts die Suche ueber alle
 * freigegebenen Geschichten. Der Weg einer Geschichte: in den Eimer legen,
 * Text glaetten (das Original steht daneben), fuer die Buehne pruefen,
 * spaeter veroeffentlichen.
 */
export default function HighlightStudio() {
  const [view, setView] = useState<View>("bucket");
  const { data, error, isLoading, reload, patch } = useJsonResource<{ highlights: Highlight[] }>("/api/moderation/highlights", "Highlights konnten nicht geladen werden.");
  const highlights = useMemo(() => data?.highlights ?? [], [data]);
  const counts = useMemo(() => Object.fromEntries(highlightStatuses.map((status) => [status, highlights.filter((item) => item.status === status).length])), [highlights]);

  return <>
    <div className="moderator-bar">
      <div>
        <p className="brand-kicker">Highlights</p>
        <h1>{view === "bucket" ? "Highlight-Eimer" : "Geschichten finden"}</h1>
      </div>
      <div className="moderator-bar-actions">
        <Link className="button button-secondary" href="/moderator/buehne" target="_blank">Bühne öffnen <span aria-hidden="true">&#8599;</span></Link>
        <div className="view-switch" role="group" aria-label="Ansicht wechseln">
          <button className={`button ${view === "bucket" ? "button-primary" : "button-secondary"}`} type="button" aria-pressed={view === "bucket"} onClick={() => setView("bucket")}>Eimer ({highlights.length})</button>
          <button className={`button ${view === "search" ? "button-primary" : "button-secondary"}`} type="button" aria-pressed={view === "search"} onClick={() => setView("search")}>Suchen</button>
        </div>
      </div>
    </div>
    <section className="repair-queue highlight-studio" aria-label={view === "bucket" ? "Highlight-Eimer" : "Geschichten finden"}>
      {view === "bucket"
        ? <Bucket highlights={highlights} counts={counts} error={error} isLoading={isLoading} patch={patch} onSearch={() => setView("search")} />
        : <Finder onChanged={reload} />}
    </section>
  </>;
}

type PatchList = (update: (current: { highlights: Highlight[] }) => { highlights: Highlight[] }) => void;

/* Nach dem Speichern wird die Liste vor Ort angepasst statt neu geladen: Ein
   Neuladen leert sie kurz, und der offene Editor verloere seine Meldung. */
function Bucket({ highlights, counts, error, isLoading, patch, onSearch }: {
  highlights: Highlight[];
  counts: Record<string, number>;
  error: string;
  isLoading: boolean;
  patch: PatchList;
  onSearch: () => void;
}) {
  const [filter, setFilter] = useState<HighlightStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = filter ? highlights.filter((item) => item.status === filter) : highlights;

  return <>
    <div className="highlight-filter" role="group" aria-label="Nach Stufe filtern">
      <button type="button" className={filter === "" ? "is-current" : ""} onClick={() => setFilter("")}>Alle <b>{highlights.length}</b></button>
      {highlightStatuses.map((status) => <button key={status} type="button" className={filter === status ? "is-current" : ""} onClick={() => setFilter(status)}>
        {highlightStatusLabels[status]} <b>{counts[status] ?? 0}</b>
      </button>)}
    </div>
    <p className="highlight-hint">Auf die Bühne kommt alles ab „Geprüft“, sortiert nach der Reihenfolge-Zahl. „Veröffentlicht“ erscheint zusätzlich unter /stories.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {isLoading && !highlights.length && <p className="queue-empty">Lädt …</p>}
    {!isLoading && !shown.length && <div className="queue-empty">
      <p>Hier liegt noch nichts.</p>
      <button className="button button-secondary" type="button" onClick={onSearch}>Geschichten suchen</button>
    </div>}
    <ol className="highlight-list">
      {shown.map((highlight) => <li key={highlight.repairId}>
        {openId === highlight.repairId
          ? <HighlightEditor
            highlight={highlight}
            onClose={() => setOpenId(null)}
            onSaved={(changes) => patch((current) => ({ highlights: current.highlights.map((item) => item.repairId === highlight.repairId ? { ...item, ...changes } : item).sort((left, right) => left.sortOrder - right.sortOrder) }))}
            onRemoved={() => patch((current) => ({ highlights: current.highlights.filter((item) => item.repairId !== highlight.repairId) }))}
          />
          : <HighlightRowView highlight={highlight} onOpen={() => setOpenId(highlight.repairId)} />}
      </li>)}
    </ol>
  </>;
}

function Thumb({ url, label }: { url: string | null; label: string }) {
  return url
    // eslint-disable-next-line @next/next/no-img-element -- Signierte Adresse aus dem privaten Bucket, keine bekannten Masse.
    ? <img className="highlight-thumb" src={url} alt="" loading="lazy" />
    : <div className="highlight-thumb is-empty" aria-label={label}>Kein Foto</div>;
}

function HighlightRowView({ highlight, onOpen }: { highlight: Highlight; onOpen: () => void }) {
  const { repair } = highlight;
  return <article className="highlight-row">
    <Thumb url={repair.imageUrl} label="Kein Foto" />
    <div>
      <p className="section-index">
        <span className={`highlight-badge is-${highlight.status}`}>{highlightStatusLabels[highlight.status]}</span>
        {" "}#{highlight.sortOrder} · {repair.categoryLabel} · {repair.kreis ?? "ohne Kreis"}
      </p>
      <h3>{highlight.title || repair.brandModel || "Noch ohne Titel"}</h3>
      <p className="highlight-preview">{highlight.teaser || repair.story}</p>
      {highlight.note && <p className="highlight-note">Notiz: {highlight.note}</p>}
    </div>
    <button className="button button-secondary" type="button" onClick={onOpen}>Bearbeiten</button>
  </article>;
}

function HighlightEditor({ highlight, onClose, onSaved, onRemoved }: { highlight: Highlight; onClose: () => void; onSaved: (changes: Partial<Highlight>) => void; onRemoved: () => void }) {
  const { repair } = highlight;
  const [draft, setDraft] = useState({ title: highlight.title, teaser: highlight.teaser, body: highlight.body, note: highlight.note, sortOrder: highlight.sortOrder });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function save(status?: HighlightStatus) {
    setBusy(true);
    setMessage(null);
    const result = await updateHighlight(highlight.repairId, { ...draft, ...(status ? { status } : {}) });
    setBusy(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    setMessage({ tone: "ok", text: status ? `Gespeichert: ${highlightStatusLabels[status]}.` : "Gespeichert." });
    onSaved({ ...draft, title: draft.title.trim(), teaser: draft.teaser.trim(), body: draft.body.trim(), note: draft.note.trim(), ...(status ? { status } : {}) });
  }

  async function remove() {
    if (!window.confirm("Aus dem Eimer nehmen? Der redigierte Text geht verloren, die Reparatur bleibt.")) return;
    setBusy(true);
    const result = await removeHighlight(highlight.repairId);
    setBusy(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    onRemoved();
  }

  const field = (name: "title" | "teaser" | "body" | "note") => ({
    value: draft[name],
    maxLength: HIGHLIGHT_LIMITS[name],
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [name]: event.target.value })),
  });

  return <article className="highlight-editor">
    <header>
      <p className="section-index"><span className={`highlight-badge is-${highlight.status}`}>{highlightStatusLabels[highlight.status]}</span> {repair.categoryLabel} · {repair.kreis ?? "ohne Kreis"} · {performedByLabel(repair.performedBy)} · {repair.repairSucceeded ? "geklappt" : "nicht geklappt"}</p>
      <button className="text-button" type="button" onClick={onClose}>Schließen</button>
    </header>
    <div className="highlight-editor-grid">
      <aside>
        <Thumb url={repair.imageUrl} label="Kein Foto" />
        <p className="section-index">Original{repair.brandModel ? ` · ${repair.brandModel}` : ""}</p>
        <p className="highlight-original">{repair.story}</p>
        <button className="text-button" type="button" onClick={() => setDraft((current) => ({ ...current, body: repair.story }))}>Original in die Geschichte übernehmen</button>
      </aside>
      <div className="metadata-fields highlight-fields">
        <label>Titel <span>{draft.title.length}/{HIGHLIGHT_LIMITS.title}</span><input {...field("title")} placeholder="Kurz und mit Bild im Kopf" /></label>
        <label>Reihenfolge<input type="number" min={0} value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number.parseInt(event.target.value, 10) || 0 }))} /></label>
        <label>Teaser für Bühne und Kachel <span>{draft.teaser.length}/{HIGHLIGHT_LIMITS.teaser}</span><textarea {...field("teaser")} rows={3} /></label>
        <label>Geschichte (geglättet) <span>{draft.body.length}/{HIGHLIGHT_LIMITS.body}</span><textarea {...field("body")} rows={12} /></label>
        <label>Interne Notiz<textarea {...field("note")} rows={2} placeholder="z. B. Name der Tochter rausgenommen" /></label>
        <p className="metadata-hint">Beim Glätten: Rechtschreibung, Absätze und Lesefluss ja; neue Fakten nein. Namen von Kindern und andere persönliche Angaben herausnehmen.</p>
      </div>
    </div>
    {message && <p className={message.tone === "error" ? "form-error" : "form-notice"} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
    <div className="review-actions highlight-actions">
      <button className="button button-secondary" type="button" disabled={busy} onClick={() => save()}>Speichern</button>
      {highlight.status !== "candidate" && <button className="button button-secondary" type="button" disabled={busy} onClick={() => save("candidate")}>Zurück auf vorgemerkt</button>}
      {highlight.status !== "ready" && <button className="button button-primary" type="button" disabled={busy} onClick={() => save("ready")}>Geprüft · auf die Bühne</button>}
      {highlight.status !== "published" && <button className="button button-primary" type="button" disabled={busy} onClick={() => save("published")}>Veröffentlichen</button>}
      <button className="text-button highlight-remove" type="button" disabled={busy} onClick={remove}>Aus dem Eimer nehmen</button>
    </div>
  </article>;
}

function Finder({ onChanged }: { onChanged: () => void }) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => (current.q === q ? current : { ...current, q })), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ q: filters.q, category: filters.category, kreis: filters.kreis, minLength: String(filters.minLength), sort: filters.sort });
    if (filters.withImage) params.set("withImage", "1");
    return `/api/moderation/highlights/search?${params}`;
  }, [filters]);
  const { data, error, isLoading, patch } = useJsonResource<SearchResponse>(url, "Die Suche ist fehlgeschlagen.");
  const [actionError, setActionError] = useState("");

  async function add(result: SearchResult) {
    setActionError("");
    const response = await addHighlight(result.id);
    if (!response.ok) {
      setActionError(response.error);
      return;
    }
    patch((current) => ({ ...current, results: current.results.map((item) => item.id === result.id ? { ...item, highlightStatus: "candidate" } : item) }));
    onChanged();
  }

  const set = <Key extends keyof SearchFilters>(key: Key, value: SearchFilters[Key]) => setFilters((current) => ({ ...current, [key]: value }));

  return <>
    <div className="highlight-search">
      <label className="filter-label highlight-search-q">Suche<input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="z. B. Kaffee, Oma, 3D-Drucker" /></label>
      <label className="filter-label">Kategorie<select value={filters.category} onChange={(event) => set("category", event.target.value)}>
        <option value="">Alle</option>
        {repairCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
      <label className="filter-label">Kreis<select value={filters.kreis} onChange={(event) => set("kreis", event.target.value)}>
        <option value="">Alle</option>
        {(data?.kreise ?? []).map((kreis) => <option key={kreis} value={kreis}>{kreis}</option>)}
      </select></label>
      <label className="filter-label">Mindestlänge<select value={filters.minLength} onChange={(event) => set("minLength", Number(event.target.value))}>
        {[0, 80, 150, 250, 400].map((value) => <option key={value} value={value}>{value ? `${value} Zeichen` : "Egal"}</option>)}
      </select></label>
      <label className="filter-label">Sortierung<select value={filters.sort} onChange={(event) => set("sort", event.target.value as SearchFilters["sort"])}>
        <option value="longest">Längste zuerst</option>
        <option value="newest">Neueste zuerst</option>
      </select></label>
      <label className="highlight-check"><input type="checkbox" checked={filters.withImage} onChange={(event) => set("withImage", event.target.checked)} /> Nur mit Foto</label>
    </div>
    {(error || actionError) && <p className="form-error" role="alert">{actionError || error}</p>}
    {data && <p className="highlight-hint">{data.total} Treffer unter {data.withText} freigegebenen Geschichten mit Zustimmung{data.total > data.results.length ? ` · die ersten ${data.results.length} stehen hier` : ""}.</p>}
    {isLoading && !data && <p className="queue-empty">Sucht …</p>}
    <ol className="highlight-list">
      {(data?.results ?? []).map((result) => <li key={result.id}>
        <article className="highlight-row">
          <Thumb url={result.imageUrl} label="Kein Foto" />
          <div>
            <p className="section-index">{result.categoryLabel} · {result.kreis ?? "ohne Kreis"} · {performedByLabel(result.performedBy)} · {result.story.length} Zeichen</p>
            <h3>{result.brandModel || "Ohne Produktangabe"}</h3>
            <details className="highlight-story">
              <summary>{result.story.length > 220 ? `${result.story.slice(0, 220)} …` : result.story}</summary>
              {result.story.length > 220 && <p>{result.story}</p>}
            </details>
          </div>
          {result.highlightStatus
            ? <span className={`highlight-badge is-${result.highlightStatus}`}>{highlightStatusLabels[result.highlightStatus]}</span>
            : <button className="button button-primary" type="button" onClick={() => add(result)}>In den Eimer</button>}
        </article>
      </li>)}
    </ol>
  </>;
}
