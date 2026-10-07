import type { CSSProperties, ReactNode } from "react";
import { categoryPictogramSvg } from "@/components/category-pictogram";
import { posterCopy } from "@/lib/poster";
import { successShare, type PublicStats } from "@/lib/public-stats";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import type { SharepicLogos } from "./logos";
import { shareVisualGrounds, type GroundSpec } from "@/lib/share-visual";
import {
  bucketTimeline,
  recapChange,
  recapRange,
  recapSharePercent,
  recapSuccessPercent,
  stackCategories,
  type RecapBar,
  type RecapStats,
} from "@/lib/sharepic-recap";
import {
  autoMilestone,
  countdown,
  formatCount,
  formatDay,
  formatHours,
  formatPeriod,
  formatStand,
  goalPercent,
  kreisStanding,
  rankEntries,
  sharepicFormats,
  sharepicMotifs,
  type SharepicFormat,
  type SharepicLanguage,
  type SharepicRequest,
} from "@/lib/sharepics";

/**
 * Die Motive der Sharepics als JSX fuer Satori (siehe render.tsx).
 *
 * Getrennt von der Route, weil hier nichts vom Server gebraucht wird: Die
 * Route holt Anmeldung, Zahlen und Schrift, diese Datei zeichnet nur. Gebaut
 * mit denselben Mitteln wie das Teilbild einer Reparatur
 * (app/reparatur/[id]/share-image/route.tsx): Papierrand, Karte in einer der
 * vier Grundfarben, Papierraster, leicht gedrehte Aufkleber.
 *
 * Satori kann nur Flexbox. Jedes `div` mit mehr als einem Kind braucht deshalb
 * `display: flex`, sonst bricht das Zeichnen ab.
 */

export type SharepicInput = {
  request: SharepicRequest;
  stats: PublicStats;
  now: Date;
  /** Adresse ohne Protokoll, steht unten auf jedem Bild. */
  domain: string;
  prizeCount: number;
  /** Zahlen der Rueckschau; nur bei den Motiven mit Zeitraum, sonst `null`. */
  recap: RecapStats | null;
  /** Der Ort der Rueckschau Stadt, schon aufgeloest (Platz 1, wenn nichts gewaehlt). */
  recapKreis: string | null;
  /** Die Foerderlogos in Graustufen, als data-URLs (siehe logos.ts). */
  logos: SharepicLogos;
};

const ink = "#101626";
const bg = "#efece5";
const yellow = "#ffc432";
const paperGrain = "repeating-linear-gradient(0deg, transparent 0 6px, rgba(16, 22, 38, .04) 6px 8px)";

const FRAME = 32;
const PAD_X = 64;
/** Breite innerhalb der Karte - dort muss alles hineinpassen. Alle Formate sind 1080 breit. */
const INNER = 1080 - FRAME * 2 - 8 - PAD_X * 2;

const flexCol: CSSProperties = { display: "flex", flexDirection: "column" };
const flexRow: CSSProperties = { display: "flex", flexDirection: "row", alignItems: "center" };

/* --- Bausteine ------------------------------------------------------------ */

/**
 * Bausteine und Motive fuer ein Format.
 *
 * Alle Formate sind gleich breit, aber verschieden hoch. Schriften und
 * Abstaende schrumpfen deshalb mit `px()`, Ranglisten werden kuerzer. Als
 * Funktion statt als Modulzustand, weil Satori die Bausteine erst beim
 * Zeichnen aufruft - da laeuft womoeglich schon das naechste Bild.
 */
function kit(format: SharepicFormat, lang: SharepicLanguage) {
  const spec = sharepicFormats[format];
  const px = (value: number) => Math.round(value * spec.scale);
  /** Der Text in der Sprache des Bildes. */
  const t = (de: string, en: string) => (lang === "en" ? en : de);
  const count = (value: number) => formatCount(value, lang);
  const day = (value: string | Date) => formatDay(value, lang);


  /**
   * Schriftgroesse, damit die laengste Aufkleberzeile in die Karte passt.
   *
   * Wie `shareVisualHeadlineSize` in lib/share-visual.ts, aber fuer Nunito im
   * schwarzen Schnitt: Der laeuft breiter als Satoris Standardschrift, mit 0,52
   * em je Zeichen brach "schon gerettet" um.
   */
  function headlineSize(lines: string[], base: number) {
    const longest = Math.max(...lines.map((line) => line.length), 1);
    return Math.min(base, Math.floor((INNER - 90) / (longest * 0.62)));
  }

  function Headline({ lines, ground, base = 104 }: { lines: string[]; ground: GroundSpec; base?: number }) {
    const size = headlineSize(lines, px(base));
    const rotations = [-1.4, 1.1, -0.7];
    return <div style={{ ...flexCol, alignItems: "flex-start", gap: px(12) }}>
      {lines.map((line, index) => <div key={`${line}-${index}`} style={{ display: "flex", marginLeft: index % 2 === 1 ? Math.round(size * 0.4) : 0 }}>
        <div style={{
          display: "flex",
          padding: "4px 26px 12px",
          background: ground.sticker,
          color: ground.stickerText,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          transform: `rotate(${rotations[index % rotations.length]}deg)`,
        }}>{line}</div>
      </div>)}
    </div>;
  }

  function Kicker({ children, ground }: { children: ReactNode; ground: GroundSpec }) {
    return <div style={{ display: "flex", fontSize: px(34), fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: ground.muted }}>{children}</div>;
  }

  function BigNumber({ value, size = 250, color }: { value: string; size?: number; color: string }) {
    /* Lange Zahlen schrumpfen, damit "12.345" nicht aus der Karte laeuft. */
    const fitted = Math.min(px(size), Math.floor(INNER / (value.length * 0.6)));
    return <div style={{ display: "flex", fontSize: fitted, fontWeight: 900, lineHeight: 0.95, letterSpacing: -4, color }}>{value}</div>;
  }

  function Text({ children, size = 48, weight = 700, color, style }: { children: ReactNode; size?: number; weight?: number; color?: string; style?: CSSProperties }) {
    return <div style={{ display: "flex", flexWrap: "wrap", fontSize: px(size), fontWeight: weight, lineHeight: 1.25, color, ...style }}>{children}</div>;
  }

  function ProgressBar({ total, goal, ground }: { total: number; goal: number; ground: GroundSpec }) {
    const percent = goalPercent(total, goal);
    const fill = Math.min(100, Math.max(percent, total > 0 ? 2 : 0));
    return <div style={{ ...flexCol, gap: px(14) }}>
      <div style={{ display: "flex", height: px(56), border: `5px solid ${ground.text}`, background: ground.ground }}>
        <div style={{ display: "flex", width: `${fill}%`, height: "100%", background: ground.text === ink ? ink : yellow }} />
      </div>
      <div style={{ ...flexRow, justifyContent: "space-between", fontSize: px(38), fontWeight: 800 }}>
        <span>{count(total)} {t("von", "of")} {count(goal)}</span>
        <span>{t(`${percent} %`, `${percent}%`)}</span>
      </div>
    </div>;
  }

  function Tile({ label, value, sub, ground, width }: { label: string; value: string; sub?: string; ground: GroundSpec; width: number }) {
    return <div style={{ ...flexCol, gap: px(6), width, padding: "22px 26px 26px", border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText }}>
      <div style={{ display: "flex", fontSize: px(26), fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
      {/* Kleiner statt umbrechen: "Rheinisch-Bergischer Kreis" soll in einer Zeile stehen. */}
      <div style={{ display: "flex", fontSize: Math.min(px(64), Math.floor((width - 62) / (value.length * 0.6))), fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ display: "flex", fontSize: px(28), fontWeight: 700 }}>{sub}</div>}
    </div>;
  }

  function Tiles({ items, ground }: { items: { label: string; value: string; sub?: string }[]; ground: GroundSpec }) {
    const gap = px(24);
    const width = Math.floor((INNER - gap) / 2);
    return <div style={{ display: "flex", flexWrap: "wrap", gap }}>
      {items.map((item) => <Tile key={item.label} {...item} ground={ground} width={width} />)}
    </div>;
  }

  /** Eine Zeile einer Rangliste: Platz oder Zeichen, Name, Balken, Zahl. */
  function RankRow({ badge, name, count, max, ground }: { badge: ReactNode; name: string; count: number; max: number; ground: GroundSpec }) {
    const barMax = INNER - px(72) - px(22);
    return <div style={{ ...flexRow, gap: px(22) }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: px(72), height: px(72), border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText, fontSize: px(38), fontWeight: 900 }}>{badge}</div>
      <div style={{ ...flexCol, gap: px(6), flex: 1 }}>
        <div style={{ ...flexRow, justifyContent: "space-between", fontSize: px(36), fontWeight: 800 }}>
          <span>{name}</span>
          <span>{formatCount(count, lang)}</span>
        </div>
        <div style={{ display: "flex", width: Math.max(12, Math.round((count / Math.max(max, 1)) * barMax)), height: px(14), background: ground.text }} />
      </div>
    </div>;
  }

  function Pictogram({ category, size: base }: { category: string; size: number }) {
    const size = px(base);
    const src = `data:image/svg+xml;base64,${Buffer.from(categoryPictogramSvg(category, ink, size)).toString("base64")}`;
    // eslint-disable-next-line @next/next/no-img-element -- Satori kennt nur <img>.
    return <img src={src} width={size} height={size} alt="" />;
  }

  /** Farben der gestapelten Balken; die erste folgt der Schriftfarbe, damit sie auf Tinte nicht verschwindet. */
  const stackColors = (inkGround: boolean) => [inkGround ? yellow : ink, "#ffffff", "#2f8f6b", "#d62828", "#6b7fd7"];
  const STACK_REST = "#9aa0ab";

  /**
   * Balken je Tag oder Zeitabschnitt. Gestapelt, wenn `keys` gesetzt ist: Dann
   * bekommt jede der genannten Kategorien ein Segment, der Rest ein graues.
   */
  function BarChart({ bars, ground, keys, inkGround }: { bars: RecapBar[]; ground: GroundSpec; keys?: string[]; inkGround: boolean }) {
    const height = px(spec.height > 1500 ? 430 : 400);
    const max = Math.max(...bars.map((bar) => bar.succeeded), 1);
    const colors = stackColors(inkGround);
    return <div style={{ ...flexCol, gap: px(14) }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: px(bars.length > 14 ? 6 : 12), height, borderBottom: `5px solid ${ground.text}` }}>
        {bars.map((bar) => {
          const total = Math.round((bar.succeeded / max) * height);
          if (!keys) return <div key={bar.date} style={{ display: "flex", flex: 1, height: Math.max(total, bar.succeeded > 0 ? 4 : 0), background: ground.text }} />;
          const known = keys.reduce((sum, key) => sum + (bar.categories[key] ?? 0), 0);
          const parts = [...keys.map((key, index) => ({ key, amount: bar.categories[key] ?? 0, color: colors[index % colors.length] })), { key: "rest", amount: Math.max(bar.succeeded - known, 0), color: STACK_REST }];
          return <div key={bar.date} style={{ ...flexCol, justifyContent: "flex-end", flex: 1, height: total }}>
            {[...parts].reverse().map((part) => {
              const segment = bar.succeeded > 0 ? Math.round((part.amount / bar.succeeded) * total) : 0;
              return segment >= 3 ? <div key={part.key} style={{ display: "flex", height: segment, background: part.color, borderTop: `2px solid ${ink}` }} /> : null;
            })}
          </div>;
        })}
      </div>
      <div style={{ ...flexRow, justifyContent: "space-between", fontSize: px(28), fontWeight: 700, color: ground.muted }}>
        <span>{bars[0] ? day(bars[0].date) : ""}</span>
        <span>{bars.length > 1 ? day(bars[bars.length - 1].date) : ""}</span>
      </div>
    </div>;
  }

  function Legend({ items }: { items: { label: string; color: string }[] }) {
    return <div style={{ display: "flex", flexWrap: "wrap", gap: `${px(10)}px ${px(26)}px` }}>
      {items.map((item) => <div key={item.label} style={{ ...flexRow, gap: px(10), fontSize: px(30), fontWeight: 800 }}>
        <div style={{ display: "flex", width: px(30), height: px(30), background: item.color, border: `3px solid ${ink}` }} />
        {item.label}
      </div>)}
    </div>;
  }

  /** Zwei Teile einer Gesamtheit in einem Balken. */
  function SplitBar({ part, rest, ground }: { part: number; rest: number; ground: GroundSpec }) {
    const share = part + rest > 0 ? Math.max(2, Math.min(98, (part / (part + rest)) * 100)) : 0;
    return <div style={{ display: "flex", height: px(64), border: `5px solid ${ground.text}`, background: ground.ground }}>
      <div style={{ display: "flex", width: `${share}%`, height: "100%", background: ground.text === ink ? ink : yellow }} />
    </div>;
  }

  function Steps({ steps, ground }: { steps: string[]; ground: GroundSpec }) {
    return <div style={{ ...flexCol, gap: px(30) }}>
      {steps.map((step, index) => <div key={step} style={{ ...flexRow, gap: px(28), alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: px(96), height: px(96), border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText, fontSize: px(48), fontWeight: 900, transform: `rotate(${index % 2 ? 1.5 : -1.5}deg)` }}>{`0${index + 1}`}</div>
        <Text size={46} weight={800} style={{ flex: 1, paddingTop: px(12) }}>{step}</Text>
      </div>)}
    </div>;
  }

  /** Ein nach unten zeigender Winkel - fuer den Link-Sticker, der dort sitzen soll. */
  function ArrowDown({ color }: { color: string }) {
    return <div style={{ display: "flex", width: px(64), height: px(64), borderRight: `10px solid ${color}`, borderBottom: `10px solid ${color}`, transform: "rotate(45deg)" }} />;
  }


  /**
   * Foerderung und Traegerschaft, wie im Footer (lib/funding.ts), klein und in
   * Graustufen. Die Logos stehen auf einem hellen Streifen, damit sie auf
   * jedem Grund gleich aussehen - auch auf dem dunklen, wo die schwarze
   * Schrift des Ministeriums sonst verschwaende.
   */
  function FundingStrip({ logos }: { logos: SharepicLogos }) {
    /* Nicht ganz so klein wie der Rest: Die Schrift im Ministeriumslogo soll lesbar bleiben. */
    const height = Math.round(52 * Math.max(spec.scale, 0.8));
    const label = (lines: string[]) => <div style={{ ...flexCol, flex: "none", fontSize: px(19), fontWeight: 800, lineHeight: 1.2, letterSpacing: 1, textTransform: "uppercase", color: "rgba(16, 22, 38, .72)" }}>
      {lines.map((line) => <span key={line}>{line}</span>)}
    </div>;
    // eslint-disable-next-line @next/next/no-img-element -- Satori kennt nur <img>.
    const logo = (item: SharepicLogos[number]) => <img key={item.key} src={item.src} width={Math.round(height * item.width / item.height)} height={height} alt="" style={{ flex: "none" }} />;
    const group = (key: "funded-by" | "initiative-by", lines: string[]) => <div style={{ ...flexRow, flex: "none", gap: px(18) }}>
      {label(lines)}
      {logos.filter((item) => item.group === key).map(logo)}
    </div>;
    return <div style={{ ...flexRow, justifyContent: "space-between", padding: `${px(14)}px ${px(22)}px`, background: "#ffffff", border: `4px solid ${ink}`, color: ink }}>
      {group("funded-by", t("Gefördert|von", "Funded|by").split("|"))}
      {group("initiative-by", t("Eine|Initiative von", "An|initiative by").split("|"))}
    </div>;
  }

  /* --- Motive --------------------------------------------------------------- */

  /** `path` haengt an der Adresse unten, etwa `/gewinnspiel`. */
  type MotifBody = { headline: string[]; body: ReactNode; cta?: string; path?: string };


  /**
   * Die Rueckschau, fuer ganz NRW (`recap`) und fuer einen Ort (`recapKreis`).
   *
   * Beide Motive teilen sich Zeitraum und Grafik; nur der Bezug und der Anteil
   * unterscheiden sich. Gezaehlt wird wie beim Rekord - gelungene Reparaturen -,
   * gescheiterte Versuche stehen nur in der Grafik "Geglueckt / gescheitert".
   */
  function recapBody({ request, stats, now, recap, recapKreis }: SharepicInput, ground: GroundSpec): MotifBody {
    const scope = request.motif === "recapKreis" ? recapKreis ?? "NRW" : null;
    const names = {
      "7d": { headline: t("Letzte 7 Tage", "Last 7 days"), before: t("zu den 7 Tagen davor", "vs. the 7 days before") },
      week: { headline: t("Letzte Woche", "Last week"), before: t("zur Vorwoche", "vs. the week before") },
      all: { headline: t("Seit Anfang an", "Since the start"), before: "" },
    }[request.period];
    const headline = [scope ?? t("Rückschau", "Look back"), names.headline];

    if (!recap || recap.succeeded + recap.failed === 0) {
      return {
        headline,
        body: <Text size={52} weight={800}>{t("In diesem Zeitraum wurde noch nichts eingetragen. Das ändert sich mit deiner Reparatur!", "Nothing has been added in this period yet. Your repair can change that!")}</Text>,
      };
    }

    const range = recapRange(request.period, now, stats.campaign.startAt);
    const first = range.start ?? recap.timeline[0]?.date ?? range.end;
    const dates = first === range.end ? day(range.end) : `${day(first)} – ${day(range.end)}`;
    const kicker = <Kicker ground={ground}>{scope ? `${scope} · ${dates}` : dates}</Kicker>;
    const euros = (value: number) => t(`${count(value)} €`, `€${count(value)}`);
    const maxBars = request.period === "all" ? spec.rows * 3 : 7;
    const inkGround = request.ground === "ink";
    const labelOf = (key: string) => repairCategoryLabel(key, lang);

    switch (request.view) {
      case "total": {
        const change = recapChange(recap.succeeded, recap.previousSucceeded);
        return {
          headline,
          body: <div style={{ ...flexCol, gap: px(44) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              {kicker}
              <BigNumber value={count(recap.succeeded)} size={320} color={ground.text} />
              <Text size={64} weight={900}>{t("Reparaturen", "repairs")}</Text>
              {change !== null && <Text size={44} weight={800} color={ground.muted}>{`${change > 0 ? "+" : ""}${count(change)} % ${names.before}`}</Text>}
            </div>
            <Tiles ground={ground} items={[
              { label: t("Gespart", "Saved"), value: euros(recap.valueSavedEuros), sub: t("an Wert", "in value") },
              { label: t("Stunden", "Hours"), value: formatHours(recap.minutesSaved, lang), sub: t("repariert", "repaired") },
            ]} />
          </div>,
        };
      }

      case "success": {
        const percent = recapSuccessPercent(recap.succeeded, recap.failed);
        return {
          headline,
          body: <div style={{ ...flexCol, gap: px(44) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              {kicker}
              <BigNumber value={t(`${percent} %`, `${percent}%`)} size={300} color={ground.text} />
              <Text size={56} weight={900}>{t("der Versuche geglückt", "of attempts succeeded")}</Text>
            </div>
            <SplitBar part={recap.succeeded} rest={recap.failed} ground={ground} />
            <Tiles ground={ground} items={[
              { label: t("Geglückt", "Succeeded"), value: count(recap.succeeded), sub: t("zählen zum Rekord", "count to the record") },
              { label: t("Gescheitert", "Failed"), value: count(recap.failed), sub: t("trotzdem versucht", "tried anyway") },
            ]} />
          </div>,
        };
      }

      case "share": {
        if (scope) {
          const percent = recapSharePercent(recap.succeeded, recap.nrwSucceeded);
          /* Wie viele Kategorien noch Platz haben: Die Story zwei, das Hochformat eine, das Quadrat keine. */
          const top = rankEntries(recap.categories, format === "story" ? 2 : format === "portrait" ? 1 : 0);
          return {
            headline,
            body: <div style={{ ...flexCol, gap: px(40) }}>
              <div style={{ ...flexCol, gap: px(4) }}>
                {kicker}
                <BigNumber value={t(`${String(percent).replace(".", ",")} %`, `${percent}%`)} size={300} color={ground.text} />
                <Text size={54} weight={900}>{t(`aller Reparaturen in NRW kamen aus ${scope}`, `of all repairs in NRW came from ${scope}`)}</Text>
              </div>
              <SplitBar part={recap.succeeded} rest={Math.max(recap.nrwSucceeded - recap.succeeded, 0)} ground={ground} />
              <Text size={38} weight={700} color={ground.muted}>{t(`${count(recap.succeeded)} von ${count(recap.nrwSucceeded)} Reparaturen`, `${count(recap.succeeded)} of ${count(recap.nrwSucceeded)} repairs`)}</Text>
              {top.length > 0 && <div style={{ ...flexCol, gap: px(18) }}>
                {top.map((entry) => <RankRow key={entry.key} badge={<Pictogram category={entry.key} size={48} />} name={`${labelOf(entry.key)} · ${recapSharePercent(entry.count, recap.succeeded)} %`} count={entry.count} max={top[0].count} ground={ground} />)}
              </div>}
            </div>,
          };
        }
        const top = rankEntries(recap.categories, Math.min(6, spec.rows));
        return {
          headline,
          body: <div style={{ ...flexCol, gap: px(24) }}>
            {kicker}
            {top.map((entry) => <RankRow key={entry.key} badge={<Pictogram category={entry.key} size={48} />} name={`${labelOf(entry.key)} · ${recapSharePercent(entry.count, recap.succeeded)} %`} count={entry.count} max={top[0].count} ground={ground} />)}
            <Text size={38} weight={700} color={ground.muted} style={{ marginTop: px(10) }}>{t(`${count(recap.succeeded)} Reparaturen insgesamt`, `${count(recap.succeeded)} repairs in total`)}</Text>
          </div>,
        };
      }

      case "money": {
        const average = recap.succeeded > 0 ? recap.valueSavedEuros / recap.succeeded : 0;
        return {
          headline,
          body: <div style={{ ...flexCol, gap: px(44) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              {kicker}
              <BigNumber value={euros(recap.valueSavedEuros)} size={250} color={ground.text} />
              <Text size={60} weight={900}>{t("gespart statt neu gekauft", "saved instead of buying new")}</Text>
            </div>
            <Tiles ground={ground} items={[
              { label: t("Ø je Reparatur", "Avg. per repair"), value: euros(average) },
              { label: t("Stunden", "Hours"), value: formatHours(recap.minutesSaved, lang), sub: t("Reparaturzeit", "of repair time") },
            ]} />
            <Text size={32} weight={700} color={ground.muted}>{t(`Wert von ${count(recap.succeeded)} reparierten Dingen, wie angegeben.`, `Value of ${count(recap.succeeded)} repaired items, as stated.`)}</Text>
          </div>,
        };
      }

      case "timeline":
      case "stack": {
        const bars = bucketTimeline(recap.timeline, maxBars);
        const best = recap.timeline.reduce((top, entry) => (entry.succeeded > top.succeeded ? entry : top), recap.timeline[0]);
        const keys = request.view === "stack" ? stackCategories(recap.categories, 4) : undefined;
        const colors = stackColors(inkGround);
        return {
          headline,
          body: <div style={{ ...flexCol, gap: px(36) }}>
            <div style={{ ...flexRow, justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ ...flexCol, gap: px(4) }}>
                {kicker}
                <div style={{ ...flexRow, gap: px(20), alignItems: "flex-end" }}>
                  <BigNumber value={count(recap.succeeded)} size={170} color={ground.text} />
                  <Text size={48} weight={900} style={{ paddingBottom: px(14) }}>{t("Reparaturen", "repairs")}</Text>
                </div>
              </div>
            </div>
            <BarChart bars={bars} ground={ground} keys={keys} inkGround={inkGround} />
            {keys
              ? <Legend items={[...keys.map((key, index) => ({ label: labelOf(key), color: colors[index % colors.length] })), { label: t("Weitere", "Others"), color: STACK_REST }]} />
              : best && best.succeeded > 0 && <Text size={40} weight={800}>{t(`Bester Tag: ${day(best.date)} mit ${count(best.succeeded)}`, `Best day: ${day(best.date)} with ${count(best.succeeded)}`)}</Text>}
          </div>,
        };
      }
    }
  }

  function motifBody(input: SharepicInput, ground: GroundSpec): MotifBody {
    const { request, stats, now, prizeCount } = input;
    const { startAt, endAt } = stats.campaign;
    const period = startAt && endAt ? formatPeriod(startAt, endAt, lang) : null;
    const topCategory = rankEntries(stats.categories, 1)[0];
    const topKreis = rankEntries(stats.kreise, 1)[0];

    switch (request.motif) {
      case "recap":
      case "recapKreis":
        return recapBody(input, ground);

      case "launch":
        return {
          headline: t("Heute geht’s|los!", "It starts|today!").split("|"),
          body: <div style={{ ...flexCol, gap: px(56) }}>
            <Text size={56} weight={800}>{t("Ganz NRW repariert – gemeinsam zum Reparatur-Weltrekord.", "All of NRW is repairing – together for a repair world record.")}</Text>
            <div style={{ ...flexCol, gap: px(4) }}>
              <Kicker ground={ground}>{t("Unser Ziel", "Our goal")}</Kicker>
              <BigNumber value={count(stats.goal)} size={230} color={ground.text} />
              <Text size={52} weight={800}>{t("Reparaturen", "repairs")}{period ? t(` vom ${period}`, ` from ${period}`) : ""}</Text>
            </div>
            <Text size={42} weight={700} color={ground.muted}>{t("Repariert? Foto machen, eintragen, fertig – jede Reparatur zählt.", "Fixed something? Take a photo, add it, done – every repair counts.")}</Text>
          </div>,
        };

      case "countdown": {
        const left = countdown(startAt, endAt, now.getTime());
        if (!left || left.target === "over") {
          return {
            headline: [t("Vorbei!", "It’s over!")],
            body: <div style={{ ...flexCol, gap: px(40) }}>
              <Text size={60} weight={800}>{t("Der Rekordversuch ist zu Ende. Danke an alle, die mitgemacht haben!", "The record attempt has ended. Thank you to everyone who took part!")}</Text>
              <ProgressBar total={stats.total} goal={stats.goal} ground={ground} />
            </div>,
            cta: t("Das Ergebnis:", "The result:"),
            path: "/stats",
          };
        }
        return {
          headline: left.target === "start" ? [t("Nur noch", "Only")] : ["Countdown"],
          body: <div style={{ ...flexCol, gap: px(48) }}>
            <div style={{ ...flexRow, gap: px(36), alignItems: "flex-end" }}>
              <BigNumber value={String(left.value)} size={360} color={ground.text} />
              <Text size={96} weight={900} style={{ paddingBottom: px(30) }}>{t(left.unit, { Tage: "days", Tag: "day", Stunden: "hours", Stunde: "hour" }[left.unit])}</Text>
            </div>
            <Text size={56} weight={800}>
              {left.target === "start"
                ? t("bis der Reparaturrekord startet.", "until the repair record starts.")
                : left.unit.startsWith("Stunde")
                  ? t("bis zum Schluss – letzte Chance!", "to go – last chance!")
                  : t("läuft der Reparaturrekord noch.", "left in the repair record.")}
            </Text>
            {left.target === "end" && <ProgressBar total={stats.total} goal={stats.goal} ground={ground} />}
          </div>,
          cta: left.target === "end" ? t("Jetzt noch mitmachen:", "Join in now:") : undefined,
        };
      }

      case "categories": {
        const top = rankEntries(stats.categories, Math.min(6, spec.rows));
        const max = top[0]?.count ?? 1;
        return {
          headline: t("Das repariert|NRW gerade", "What NRW is|repairing").split("|"),
          body: <div style={{ ...flexCol, gap: px(22) }}>
            {top.map((entry) => <RankRow key={entry.key} badge={<Pictogram category={entry.key} size={48} />} name={repairCategoryLabel(entry.key, lang)} count={entry.count} max={max} ground={ground} />)}
            <Text size={38} weight={700} color={ground.muted} style={{ marginTop: px(10) }}>{t(`${count(stats.total)} Reparaturen insgesamt`, `${count(stats.total)} repairs in total`)}</Text>
          </div>,
        };
      }

      case "kreise": {
        const top = rankEntries(stats.kreise, spec.rows);
        const max = top[0]?.count ?? 1;
        const places = rankEntries(stats.kreise).length;
        return {
          headline: t("Wer repariert|am meisten?", "Who repairs|the most?").split("|"),
          body: <div style={{ ...flexCol, gap: px(18) }}>
            {top.map((entry, index) => <RankRow key={entry.key} badge={String(index + 1)} name={entry.key} count={entry.count} max={max} ground={ground} />)}
            <Text size={38} weight={700} color={ground.muted} style={{ marginTop: px(10) }}>{t(`${places} Städte und Kreise sind schon dabei`, `${places} cities and districts have joined`)}</Text>
          </div>,
          cta: t("Bring deine Stadt nach vorn:", "Push your city to the top:"),
        };
      }

      case "today": {
        const leader = rankEntries(stats.todayKreise, 1)[0];
        const record = stats.dayRecord ?? stats.bestDay?.total ?? null;
        const newRecord = record !== null && stats.today > record;
        return {
          headline: newRecord ? t("Neuer|Tagesrekord!", "New daily|record!").split("|") : [t("Heute schon", "Today so far")],
          body: <div style={{ ...flexCol, gap: px(44) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              <Kicker ground={ground}>{day(now)}</Kicker>
              <BigNumber value={count(stats.today)} size={300} color={ground.text} />
              <Text size={60} weight={900}>{t("Reparaturen an einem Tag", "repairs in one day")}</Text>
            </div>
            <Tiles ground={ground} items={[
              { label: t("Bester Tag", "Best day"), value: stats.bestDay ? count(stats.bestDay.total) : "–", sub: stats.bestDay ? day(stats.bestDay.date) : t("noch keiner", "none yet") },
              { label: t("Tagesrekord", "Daily record"), value: stats.dayRecord ? count(stats.dayRecord) : "–", sub: stats.dayRecord ? t("zu knacken", "to beat") : t("noch offen", "still open") },
              ...(leader ? [{ label: t("Vorn heute", "Leading today"), value: leader.key, sub: t(`${count(leader.count)} Reparaturen`, `${count(leader.count)} repairs`) }] : []),
              { label: t("Insgesamt", "In total"), value: count(stats.total), sub: t(`${goalPercent(stats.total, stats.goal)} % vom Ziel`, `${goalPercent(stats.total, stats.goal)}% of the goal`) },
            ]} />
          </div>,
        };
      }

      case "milestone": {
        const value = request.milestone ?? autoMilestone(stats.total);
        return {
          headline: [t("Meilenstein!", "Milestone!")],
          body: <div style={{ ...flexCol, gap: px(48) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              <BigNumber value={count(value)} size={300} color={ground.text} />
              <Text size={68} weight={900}>{t("Reparaturen geschafft!", "repairs done!")}</Text>
            </div>
            <ProgressBar total={stats.total} goal={stats.goal} ground={ground} />
            <Text size={44} weight={700} color={ground.muted}>{t("Danke an alle, die mitmachen. Weiter geht’s!", "Thanks to everyone taking part. Let’s keep going!")}</Text>
          </div>,
        };
      }

      case "impact":
        return {
          headline: t("Das hat NRW|schon gerettet", "What NRW has|saved so far").split("|"),
          body: <div style={{ ...flexCol, gap: px(34) }}>
            {[
              { value: formatHours(stats.minutesSaved, lang), label: t("Stunden Reparaturzeit", "hours of repair time") },
              { value: t(`${count(stats.valueSavedEuros)} €`, `€${count(stats.valueSavedEuros)}`), label: t("an Wert erhalten statt weggeworfen", "in value kept instead of thrown away") },
              { value: t(`${count(successShare(stats.succeeded, stats.attempted, stats.total))} %`, `${count(successShare(stats.succeeded, stats.attempted, stats.total))}%`), label: t("der Reparaturversuche gelungen", "of repair attempts succeeded") },
            ].map((item) => <div key={item.label} style={{ ...flexCol, gap: px(0) }}>
              <BigNumber value={item.value} size={150} color={ground.text} />
              <Text size={46} weight={800}>{item.label}</Text>
            </div>)}
            <Text size={36} weight={700} color={ground.muted}>{t(`Aus ${count(stats.total)} gemeldeten Reparaturen`, `From ${count(stats.total)} reported repairs`)}</Text>
          </div>,
        };

      case "final": {
        const reached = stats.total >= stats.goal;
        const tileWidth = Math.floor((INNER - px(24)) / 2);
        return {
          headline: reached ? t("Ziel|erreicht!", "Goal|reached!").split("|") : [t("Danke, NRW!", "Thank you, NRW!")],
          body: <div style={{ ...flexCol, gap: px(40) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              {period && <Kicker ground={ground}>{period}</Kicker>}
              <BigNumber value={count(stats.total)} size={240} color={ground.text} />
              <Text size={56} weight={900}>{t("Reparaturen", "repairs")}</Text>
              <Text size={40} weight={700} color={ground.muted}>{t(`${goalPercent(stats.total, stats.goal)} % vom Ziel (${count(stats.goal)})`, `${goalPercent(stats.total, stats.goal)}% of the goal (${count(stats.goal)})`)}</Text>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: px(24) }}>
              <Tile ground={ground} width={tileWidth} label={t("Stunden", "Hours")} value={formatHours(stats.minutesSaved, lang)} sub={t("repariert", "repaired")} />
              <Tile ground={ground} width={tileWidth} label={t("Wert", "Value")} value={t(`${count(stats.valueSavedEuros)} €`, `€${count(stats.valueSavedEuros)}`)} sub={t("erhalten", "kept")} />
              <Tile ground={ground} width={tileWidth} label={t("Top-Kategorie", "Top category")} value={topCategory ? repairCategoryLabel(topCategory.key, lang) : "–"} sub={topCategory ? `${count(topCategory.count)}×` : undefined} />
              <Tile ground={ground} width={tileWidth} label={t("Top-Ort", "Top place")} value={topKreis?.key ?? "–"} sub={topKreis ? `${count(topKreis.count)}×` : undefined} />
            </div>
          </div>,
          cta: t("Alle Zahlen:", "All the numbers:"),
          path: "/stats",
        };
      }

      case "kreis": {
        const name = request.kreis ?? topKreis?.key ?? "Wuppertal";
        const standing = kreisStanding(stats, name);
        return {
          headline: [name],
          body: <div style={{ ...flexCol, gap: px(48) }}>
            <div style={{ ...flexCol, gap: px(4) }}>
              <Kicker ground={ground}>{t(`Stand in ${name}`, `Status in ${name}`)}</Kicker>
              <BigNumber value={count(standing.count)} size={320} color={ground.text} />
              <Text size={64} weight={900}>{t("Reparaturen", "repairs")}</Text>
            </div>
            <Tiles ground={ground} items={[
              { label: t("Platz", "Rank"), value: standing.rank ? t(`${standing.rank}.`, `#${standing.rank}`) : "–", sub: standing.of ? t(`von ${standing.of} in NRW`, `of ${standing.of} in NRW`) : t("noch offen", "still open") },
              { label: t("Heute", "Today"), value: count(standing.today), sub: t("Reparaturen", "repairs") },
            ]} />
          </div>,
          cta: t(`Mach mit, ${name}:`, `Join in, ${name}:`),
        };
      }

      case "duel": {
        const ranked = rankEntries(stats.kreise, 2);
        const nameA = request.kreis ?? ranked[0]?.key ?? "Wuppertal";
        const nameB = request.kreisB ?? (ranked.find((entry) => entry.key !== nameA)?.key ?? "Solingen");
        const a = kreisStanding(stats, nameA);
        const b = kreisStanding(stats, nameB);
        const max = Math.max(a.count, b.count, 1);
        const diff = Math.abs(a.count - b.count);
        const leader = a.count > b.count ? nameA : nameB;
        const verdict = diff === 0
          ? t("Gleichstand! Wer legt nach?", "It’s a tie! Who’s next?")
          : t(`${leader} liegt ${count(diff)} Reparaturen vorn.`, `${leader} leads by ${count(diff)} ${diff === 1 ? "repair" : "repairs"}.`);
        const side = (standing: typeof a) => <div style={{ ...flexCol, gap: px(10) }}>
          <Text size={62} weight={900}>{standing.name}</Text>
          <div style={{ ...flexRow, gap: px(24) }}>
            <div style={{ display: "flex", width: Math.max(16, Math.round((standing.count / max) * (INNER - px(300)))), height: px(64), background: ground.text }} />
            <div style={{ display: "flex", fontSize: px(88), fontWeight: 900 }}>{count(standing.count)}</div>
          </div>
        </div>;
        return {
          headline: [t("Stadt-Duell", "City duel")],
          body: <div style={{ ...flexCol, gap: px(40) }}>
            {side(a)}
            <div style={{ display: "flex", alignSelf: "center", padding: "10px 40px 18px", border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText, fontSize: px(80), fontWeight: 900, transform: "rotate(-3deg)" }}>VS</div>
            {side(b)}
            <Text size={46} weight={800} style={{ marginTop: px(16) }}>{verdict}</Text>
          </div>,
          cta: t("Hilf deiner Stadt:", "Help your city:"),
        };
      }

      case "lottery":
        return {
          headline: t("Reparieren|und gewinnen", "Repair|and win").split("|"),
          body: <div style={{ ...flexCol, gap: px(36) }}>
            <Text size={48} weight={800}>{t("Jede Reparatur, die du einreichst, kann an der Verlosung teilnehmen.", "Every repair you submit can enter the prize draw.")}</Text>
            {prizeCount > 0 && <div style={{ ...flexRow, gap: px(28), alignItems: "flex-end" }}>
              <BigNumber value={count(prizeCount)} size={180} color={ground.text} />
              <Text size={72} weight={900} style={{ paddingBottom: px(20) }}>{t("Preise", "prizes")}</Text>
            </div>}
            <Steps ground={ground} steps={lang === "en"
              ? ["Add your repair", "Tick the prize draw box", "Wait for the draw after the record month"]
              : ["Reparatur eintragen", "Häkchen beim Gewinnspiel setzen", "Ziehung nach dem Rekordmonat abwarten"]} />
          </div>,
          cta: t("Alle Infos:", "All the details:"),
          path: "/gewinnspiel",
        };

      case "howto":
        return {
          headline: t("So bist du|dabei", "How to|join in").split("|"),
          body: <div style={{ ...flexCol, gap: px(56) }}>
            <Steps ground={ground} steps={posterCopy[lang].steps} />
            {/* Nur die Story hat einen Link-Sticker, auf den der Pfeil zeigen kann. */}
            {format === "story" && <div style={{ ...flexCol, alignItems: "center", gap: px(28), marginTop: px(20) }}>
              <Text size={46} weight={900}>{t("Link antippen und loslegen", "Tap the link and get started")}</Text>
              <ArrowDown color={ground.text} />
            </div>}
          </div>,
          cta: format === "story" ? t("Oder direkt:", "Or go straight to:") : undefined,
        };

      /* Fuer Werkstaetten und Laeden (Issue #146): ins Schaufenster oder in
         den eigenen Feed. Die Kundschaft traegt selbst ein - deshalb fuehrt
         der Link direkt ins Formular und nicht auf die Seite fuer Betriebe. */
      case "business":
        return {
          headline: t("Bei uns zählt|jede Reparatur", "Every repair|counts here").split("|"),
          body: <div style={{ ...flexCol, gap: px(36) }}>
            <Text size={48} weight={800}>{t("Wir machen mit beim Reparaturrekord NRW. Was wir für dich reparieren, kann mitzählen.", "We’re part of the Repair Record NRW. What we fix for you can count.")}</Text>
            <Steps ground={ground} steps={lang === "en"
              ? ["Pick up your repair", "Open the link below", "Add your repair – done"]
              : ["Reparatur bei uns abholen", "Den Link unten öffnen", "Reparatur eintragen – fertig"]} />
          </div>,
          cta: t("Hier eintragen:", "Add it here:"),
          path: "/mitmachen",
        };
    }
  }

  return { px, spec, t, Headline, FundingStrip, motifBody };
}

/* --- Karte ---------------------------------------------------------------- */

export function SharepicCard(input: SharepicInput) {
  const { request, now, domain } = input;
  const ground = shareVisualGrounds[request.ground];
  const { px, spec, t, Headline, FundingStrip, motifBody } = kit(request.format, request.lang);
  const { headline, body, cta, path = "" } = motifBody(input, ground);
  const live = sharepicMotifs[request.motif].live;
  const story = request.format === "story";

  return <div style={{ width: "100%", height: "100%", display: "flex", padding: FRAME, background: bg, backgroundImage: paperGrain, fontFamily: "Nunito, sans-serif" }}>
    <div style={{
      position: "relative",
      ...flexCol,
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      padding: `${spec.safe.top - FRAME - 4}px ${PAD_X}px ${spec.safe.bottom - FRAME - 4}px`,
      border: `4px solid ${ink}`,
      background: ground.ground,
      backgroundImage: paperGrain,
      color: ground.text,
    }}>
      <div style={{ ...flexCol, gap: px(44) }}>
        <div style={{ ...flexRow, justifyContent: "space-between" }}>
          <div style={{ ...flexRow, gap: px(20), fontSize: px(32), fontWeight: 800, letterSpacing: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: px(76), height: px(76), background: ground.mark, color: ground.markText, fontSize: px(46), fontWeight: 900, transform: "rotate(-2deg)" }}>R</div>
            REPARATURREKORD NRW
          </div>
          {/* Im Feed gibt es keinen verdeckten Rand fuer den Hashtag - er steht oben mit in der Kopfzeile. */}
          {!story && <div style={{ display: "flex", fontSize: px(26), fontWeight: 700, letterSpacing: 2, color: ground.muted }}>#reparaturrekord</div>}
        </div>
        <Headline lines={request.headline ?? headline} ground={ground} />
        {body}
      </div>

      <div style={{ ...flexCol, gap: px(10) }}>
        {live && <div style={{ display: "flex", fontSize: px(28), fontWeight: 700, color: ground.muted }}>{formatStand(now, request.lang)}</div>}
        <div style={{ ...flexRow, gap: px(18), flexWrap: "wrap", fontSize: px(44), fontWeight: 900 }}>
          <span>{cta ?? t("Mach mit:", "Join in:")}</span>
          <div style={{ display: "flex", padding: "2px 18px 8px", background: request.ground === "ink" ? yellow : ink, color: request.ground === "ink" ? ink : bg, transform: "rotate(-1deg)" }}>{`${domain}${path}`}</div>
        </div>
        {input.logos.length > 0 && <div style={{ ...flexCol, marginTop: px(18) }}><FundingStrip logos={input.logos} /></div>}
      </div>

      {/* Im unteren Schutzraum nur, was niemand lesen muss. */}
      {story && <div style={{ position: "absolute", left: PAD_X, right: PAD_X, bottom: 90, display: "flex", justifyContent: "center", fontSize: 26, fontWeight: 700, letterSpacing: 2, color: ground.muted }}>
        #reparaturrekord · Circular Week 2026
      </div>}

      {request.demo && <div style={{ position: "absolute", left: 0, top: Math.round(spec.height * 0.4), width: "100%", display: "flex", justifyContent: "center", fontSize: px(200), fontWeight: 900, color: request.ground === "ink" ? "rgba(255, 196, 50, .35)" : "rgba(214, 40, 40, .3)", transform: "rotate(-24deg)" }}>{t("BEISPIEL", "SAMPLE")}</div>}
    </div>
  </div>;
}
