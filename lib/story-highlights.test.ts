import { describe, expect, it } from "vitest";
import { missingForStatus, parseHighlightUpdate, publicImageExtension, searchRepairs, type HighlightSearch, type SearchableRepair } from "./story-highlights";

function repair(id: string, story: string, extra: Partial<SearchableRepair> = {}): SearchableRepair {
  return { id, category: "other", brand_model: null, story, kreis: "Wuppertal", image_path: `pending/${id}.jpg`, entry_time: "2026-10-01T10:00:00Z", ...extra };
}

const anything: HighlightSearch = { q: "", category: "", kreis: "", withImage: false, minLength: 0, sort: "longest" };

describe("parseHighlightUpdate", () => {
  it("nimmt bekannte Felder und schneidet Leerraum ab", () => {
    expect(parseHighlightUpdate({ status: "ready", title: "  Titel ", sortOrder: 3, unbekannt: 1 })).toEqual({
      ok: true,
      update: { status: "ready", title: "Titel", sortOrder: 3 },
    });
  });

  it("weist falsche Stufen, Typen und zu lange Texte ab", () => {
    expect(parseHighlightUpdate({ status: "live" }).ok).toBe(false);
    expect(parseHighlightUpdate({ title: 4 }).ok).toBe(false);
    expect(parseHighlightUpdate({ title: "x".repeat(121) }).ok).toBe(false);
    expect(parseHighlightUpdate({ sortOrder: 1.5 }).ok).toBe(false);
    expect(parseHighlightUpdate(null).ok).toBe(false);
  });
});

describe("missingForStatus", () => {
  const empty = { title: "", teaser: "", body: "" };

  it("verlangt fuer die Vormerkung nichts", () => {
    expect(missingForStatus("candidate", empty)).toEqual([]);
  });

  it("verlangt fuer die Buehne Titel und Teaser, fuer die Seite auch die Geschichte", () => {
    expect(missingForStatus("ready", empty)).toEqual(["Titel", "Teaser"]);
    expect(missingForStatus("published", { title: "T", teaser: "K", body: " " })).toEqual(["Geschichte"]);
    expect(missingForStatus("published", { title: "T", teaser: "K", body: "Text" })).toEqual([]);
  });
});

describe("searchRepairs", () => {
  const rows = [
    repair("kurz", "Knopf angenäht."),
    repair("lang", "Die Espressomaschine hatte einen Stein im Mahlwerk und brauchte ein neues.", { brand_model: "Sage Barista", kreis: "Köln" }),
    repair("ohne-bild", "Ein Akkordeon mit klemmendem Knopf wieder gerichtet.", { image_path: null, entry_time: "2026-10-20T10:00:00Z" }),
  ];

  it("sortiert nach Laenge und filtert nach Mindestlaenge und Foto", () => {
    expect(searchRepairs(rows, anything).map((row) => row.id)).toEqual(["lang", "ohne-bild", "kurz"]);
    expect(searchRepairs(rows, { ...anything, minLength: 20, withImage: true }).map((row) => row.id)).toEqual(["lang"]);
  });

  it("findet alle Suchwoerter in Text, Modell und Kreis, unabhaengig von der Schreibung", () => {
    expect(searchRepairs(rows, { ...anything, q: "sage KÖLN" }).map((row) => row.id)).toEqual(["lang"]);
    expect(searchRepairs(rows, { ...anything, q: "knopf" }).map((row) => row.id)).toEqual(["ohne-bild", "kurz"]);
  });

  it("sortiert auf Wunsch nach Eingang", () => {
    expect(searchRepairs(rows, { ...anything, sort: "newest" })[0].id).toBe("ohne-bild");
  });
});

describe("publicImageExtension", () => {
  it("kennt nur die Formate des oeffentlichen Buckets", () => {
    expect(publicImageExtension("image/jpeg")).toBe("jpg");
    expect(publicImageExtension("image/heic")).toBeNull();
  });
});
