import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();

vi.mock("./supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

const { getCachedAppSettings, resetCachedAppSettings, SETTINGS_ROW_TTL_MS } = await import("./app-settings");

beforeEach(() => {
  resetCachedAppSettings();
  maybeSingle.mockReset();
});

describe("getCachedAppSettings", () => {
  it("liest die Zeile innerhalb der Frist nur einmal", async () => {
    maybeSingle.mockResolvedValue({ data: { record_goal: 500 }, error: null });

    const first = await getCachedAppSettings(1_000);
    const second = await getCachedAppSettings(1_000 + SETTINGS_ROW_TTL_MS - 1);

    expect(maybeSingle).toHaveBeenCalledTimes(1);
    expect(first.recordGoal).toBe(500);
    expect(second.recordGoal).toBe(500);
  });

  it("liest nach Ablauf der Frist neu", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { record_goal: 500 }, error: null })
      .mockResolvedValueOnce({ data: { record_goal: 800 }, error: null });

    await getCachedAppSettings(1_000);
    const later = await getCachedAppSettings(1_000 + SETTINGS_ROW_TTL_MS);

    expect(maybeSingle).toHaveBeenCalledTimes(2);
    expect(later.recordGoal).toBe(800);
  });

  it("merkt sich keine fehlgeschlagene Abfrage", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: null, error: { message: "down" } })
      .mockResolvedValueOnce({ data: { record_goal: 800 }, error: null });

    const failed = await getCachedAppSettings(1_000);
    const recovered = await getCachedAppSettings(1_001);

    expect(failed.persisted).toBe(false);
    expect(recovered.recordGoal).toBe(800);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
});
