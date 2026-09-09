import { describe, expect, it } from "vitest";
import { buildPrizeViews, readPrizes, type EntryRow, type PrizeRow } from "./lottery-store";

function prize(overrides: Partial<PrizeRow> & { id: string; title: string }): PrizeRow {
  return {
    description: null,
    sponsor_name: null,
    sponsor_kind: "organisation",
    sponsor_website: null,
    logo_path: null,
    image_path: null,
    quantity: 1,
    is_main: false,
    sort_order: 0,
    ...overrides,
  };
}

function entry(overrides: Partial<EntryRow> & { id: string }): EntryRow {
  return {
    repair_id: `repair-${overrides.id}`,
    name: "Testperson",
    email: `${overrides.id}@example.org`,
    winner: false,
    excluded_at: null,
    prize_id: null,
    drawn_at: null,
    created_at: "2026-10-01T10:00:00.000Z",
    repairs: {
      id: `repair-${overrides.id}`,
      status: "approved",
      category: "fahrrad",
      kreis: "Wuppertal",
      brand_model: "Hollandrad",
      story: "Kette wieder dran.",
      repair_succeeded: true,
    },
    ...overrides,
  };
}

describe("Preise mit ihren Gewinner*innen", () => {
  it("zaehlt offene Exemplare herunter", () => {
    const [view] = buildPrizeViews(
      [prize({ id: "p1", title: "Werkzeugkoffer", quantity: 3 })],
      [entry({ id: "a", winner: true, prize_id: "p1", drawn_at: "2026-11-01T10:00:00.000Z" })],
    );

    expect(view.winners).toHaveLength(1);
    expect(view.open).toBe(2);
  });

  it("ordnet jede Ziehung ihrem eigenen Preis zu", () => {
    const views = buildPrizeViews(
      [prize({ id: "p1", title: "Erster" }), prize({ id: "p2", title: "Zweiter" })],
      [
        entry({ id: "a", winner: true, prize_id: "p1", drawn_at: "2026-11-01T10:00:00.000Z" }),
        entry({ id: "b", winner: true, prize_id: "p2", drawn_at: "2026-11-01T10:05:00.000Z" }),
      ],
    );

    expect(views[0].winners.map((winner) => winner.entryId)).toEqual(["a"]);
    expect(views[1].winners.map((winner) => winner.entryId)).toEqual(["b"]);
  });

  it("zeigt die Ziehungen in der Reihenfolge, in der sie passiert sind", () => {
    const [view] = buildPrizeViews(
      [prize({ id: "p1", title: "Gutschein", quantity: 2 })],
      [
        entry({ id: "spaet", winner: true, prize_id: "p1", drawn_at: "2026-11-01T12:00:00.000Z" }),
        entry({ id: "frueh", winner: true, prize_id: "p1", drawn_at: "2026-11-01T09:00:00.000Z" }),
      ],
    );

    expect(view.winners.map((winner) => winner.entryId)).toEqual(["frueh", "spaet"]);
  });

  it("nimmt Anmeldungen ohne Gewinn nicht in die Liste", () => {
    const [view] = buildPrizeViews([prize({ id: "p1", title: "Preis" })], [entry({ id: "offen" })]);
    expect(view.winners).toHaveLength(0);
    expect(view.open).toBe(1);
  });

  it("reicht Herkunft und Geschichte der Reparatur mit durch - sie stehen in der Mail und auf der Buehne", () => {
    const [view] = buildPrizeViews(
      [prize({ id: "p1", title: "Preis" })],
      [entry({ id: "a", winner: true, prize_id: "p1", drawn_at: "2026-11-01T10:00:00.000Z" })],
    );

    expect(view.winners[0].repair).toMatchObject({ kreis: "Wuppertal", category: "fahrrad", story: "Kette wieder dran." });
  });

  it("kommt mit einer Reparatur als Liste zurecht, wie PostgREST sie auch liefern kann", () => {
    const row = entry({ id: "a", winner: true, prize_id: "p1", drawn_at: "2026-11-01T10:00:00.000Z" });
    const [view] = buildPrizeViews([prize({ id: "p1", title: "Preis" })], [{ ...row, repairs: [row.repairs as never] }]);
    expect(view.winners[0].repair?.kreis).toBe("Wuppertal");
  });

  it("bleibt ohne Reparatur stehen, statt die Ziehung zu verlieren", () => {
    const [view] = buildPrizeViews(
      [prize({ id: "p1", title: "Preis" })],
      [entry({ id: "a", winner: true, prize_id: "p1", drawn_at: "2026-11-01T10:00:00.000Z", repairs: null })],
    );

    expect(view.winners).toHaveLength(1);
    expect(view.winners[0].repair).toBeNull();
  });
});

/**
 * Der Ausfall, den Issue #99 beschreibt: Die Preise erscheinen nicht - weil
 * die Abfrage stillschweigend scheitert und nicht, weil keine eingetragen
 * sind. Zwischen Deployment und Migration fehlt die Spalte `image_path`; das
 * darf die ganze Liste nicht kosten.
 */
function fakeSupabase(responses: { data: unknown; error: { code?: string; message: string } | null }[]) {
  const asked: string[] = [];
  const client = {
    from() {
      return {
        select(columns: string) {
          asked.push(columns);
          const chain = {
            order: () => chain,
            then: (resolve: (value: unknown) => unknown) => Promise.resolve(responses.shift()).then(resolve),
          };
          return chain;
        },
      };
    },
  };
  return { client: client as never, asked };
}

describe("readPrizes", () => {
  it("liest die Preise samt Foto", async () => {
    const { client, asked } = fakeSupabase([{ data: [{ id: "p1", image_path: "p1.jpg" }], error: null }]);
    const { rows, error } = await readPrizes(client);

    expect(error).toBeNull();
    expect(rows).toEqual([{ id: "p1", image_path: "p1.jpg" }]);
    expect(asked[0]).toContain("image_path");
  });

  it("liest die Preise ohne Foto weiter, wenn die Spalte noch fehlt", async () => {
    const { client, asked } = fakeSupabase([
      { data: null, error: { code: "42703", message: "column lottery_prizes.image_path does not exist" } },
      { data: [{ id: "p1", title: "Preis" }], error: null },
    ]);
    const { rows, error } = await readPrizes(client);

    expect(error).toBeNull();
    expect(rows).toEqual([{ id: "p1", title: "Preis", image_path: null }]);
    expect(asked).toHaveLength(2);
    expect(asked[1]).not.toContain("image_path");
  });

  it("gibt jeden anderen Fehler weiter", async () => {
    const { client, asked } = fakeSupabase([
      { data: null, error: { code: "42P01", message: "relation lottery_prizes does not exist" } },
    ]);
    const { rows, error } = await readPrizes(client);

    expect(rows).toBeNull();
    expect(error?.message).toContain("does not exist");
    expect(asked).toHaveLength(1);
  });
});
