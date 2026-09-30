import type { CSSProperties, ReactNode } from "react";
import { categoryPictogramSvg } from "@/components/category-pictogram";
import { posterCopy } from "@/lib/poster";
import { successShare, type PublicStats } from "@/lib/public-stats";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { shareVisualGrounds, type GroundSpec } from "@/lib/share-visual";
import {
  SHAREPIC_SAFE,
  SHAREPIC_SIZE,
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
  sharepicMotifs,
  type SharepicRequest,
} from "@/lib/sharepics";

/**
 * Die Motive der Sharepics als JSX fuer Satori (siehe image/route.tsx).
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
};

const ink = "#101626";
const bg = "#efece5";
const yellow = "#ffc432";
const paperGrain = "repeating-linear-gradient(0deg, transparent 0 6px, rgba(16, 22, 38, .04) 6px 8px)";

const FRAME = 32;
const PAD_X = 64;
/** Breite innerhalb der Karte - dort muss alles hineinpassen. */
const INNER = SHAREPIC_SIZE.width - FRAME * 2 - 8 - PAD_X * 2;

const flexCol: CSSProperties = { display: "flex", flexDirection: "column" };
const flexRow: CSSProperties = { display: "flex", flexDirection: "row", alignItems: "center" };

/* --- Bausteine ------------------------------------------------------------ */

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
  const size = headlineSize(lines, base);
  const rotations = [-1.4, 1.1, -0.7];
  return <div style={{ ...flexCol, alignItems: "flex-start", gap: 12 }}>
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
  return <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: ground.muted }}>{children}</div>;
}

function BigNumber({ value, size = 250, color }: { value: string; size?: number; color: string }) {
  /* Lange Zahlen schrumpfen, damit "12.345" nicht aus der Karte laeuft. */
  const fitted = Math.min(size, Math.floor(INNER / (value.length * 0.6)));
  return <div style={{ display: "flex", fontSize: fitted, fontWeight: 900, lineHeight: 0.95, letterSpacing: -4, color }}>{value}</div>;
}

function Text({ children, size = 48, weight = 700, color, style }: { children: ReactNode; size?: number; weight?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ display: "flex", flexWrap: "wrap", fontSize: size, fontWeight: weight, lineHeight: 1.25, color, ...style }}>{children}</div>;
}

function ProgressBar({ total, goal, ground }: { total: number; goal: number; ground: GroundSpec }) {
  const percent = goalPercent(total, goal);
  const fill = Math.min(100, Math.max(percent, total > 0 ? 2 : 0));
  return <div style={{ ...flexCol, gap: 14 }}>
    <div style={{ display: "flex", height: 56, border: `5px solid ${ground.text}`, background: ground.ground }}>
      <div style={{ display: "flex", width: `${fill}%`, height: "100%", background: ground.text === ink ? ink : yellow }} />
    </div>
    <div style={{ ...flexRow, justifyContent: "space-between", fontSize: 38, fontWeight: 800 }}>
      <span>{formatCount(total)} von {formatCount(goal)}</span>
      <span>{percent} %</span>
    </div>
  </div>;
}

function Tile({ label, value, sub, ground, width }: { label: string; value: string; sub?: string; ground: GroundSpec; width: number }) {
  return <div style={{ ...flexCol, gap: 6, width, padding: "22px 26px 26px", border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText }}>
    <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
    {/* Kleiner statt umbrechen: "Rheinisch-Bergischer Kreis" soll in einer Zeile stehen. */}
    <div style={{ display: "flex", fontSize: Math.min(64, Math.floor((width - 62) / (value.length * 0.6))), fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>{value}</div>
    {sub && <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{sub}</div>}
  </div>;
}

function Tiles({ items, ground }: { items: { label: string; value: string; sub?: string }[]; ground: GroundSpec }) {
  const gap = 24;
  const width = Math.floor((INNER - gap) / 2);
  return <div style={{ display: "flex", flexWrap: "wrap", gap }}>
    {items.map((item) => <Tile key={item.label} {...item} ground={ground} width={width} />)}
  </div>;
}

/** Eine Zeile einer Rangliste: Platz oder Zeichen, Name, Balken, Zahl. */
function RankRow({ badge, name, count, max, ground }: { badge: ReactNode; name: string; count: number; max: number; ground: GroundSpec }) {
  const barMax = INNER - 94;
  return <div style={{ ...flexRow, gap: 22 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: 72, height: 72, border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText, fontSize: 38, fontWeight: 900 }}>{badge}</div>
    <div style={{ ...flexCol, gap: 6, flex: 1 }}>
      <div style={{ ...flexRow, justifyContent: "space-between", fontSize: 36, fontWeight: 800 }}>
        <span>{name}</span>
        <span>{formatCount(count)}</span>
      </div>
      <div style={{ display: "flex", width: Math.max(12, Math.round((count / Math.max(max, 1)) * barMax)), height: 14, background: ground.text }} />
    </div>
  </div>;
}

function Pictogram({ category, size }: { category: string; size: number }) {
  const src = `data:image/svg+xml;base64,${Buffer.from(categoryPictogramSvg(category, ink, size)).toString("base64")}`;
  // eslint-disable-next-line @next/next/no-img-element -- Satori kennt nur <img>.
  return <img src={src} width={size} height={size} alt="" />;
}

function Steps({ steps, ground }: { steps: string[]; ground: GroundSpec }) {
  return <div style={{ ...flexCol, gap: 30 }}>
    {steps.map((step, index) => <div key={step} style={{ ...flexRow, gap: 28, alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "none", width: 96, height: 96, border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText, fontSize: 48, fontWeight: 900, transform: `rotate(${index % 2 ? 1.5 : -1.5}deg)` }}>{`0${index + 1}`}</div>
      <Text size={46} weight={800} style={{ flex: 1, paddingTop: 12 }}>{step}</Text>
    </div>)}
  </div>;
}

/** Ein nach unten zeigender Winkel - fuer den Link-Sticker, der dort sitzen soll. */
function ArrowDown({ color }: { color: string }) {
  return <div style={{ display: "flex", width: 64, height: 64, borderRight: `10px solid ${color}`, borderBottom: `10px solid ${color}`, transform: "rotate(45deg)" }} />;
}

/* --- Motive --------------------------------------------------------------- */

/** `path` haengt an der Adresse unten, etwa `/gewinnspiel`. */
type MotifBody = { headline: string[]; body: ReactNode; cta?: string; path?: string };

function motifBody({ request, stats, now, prizeCount }: SharepicInput, ground: GroundSpec): MotifBody {
  const { startAt, endAt } = stats.campaign;
  const period = startAt && endAt ? formatPeriod(startAt, endAt) : null;
  const topCategory = rankEntries(stats.categories, 1)[0];
  const topKreis = rankEntries(stats.kreise, 1)[0];

  switch (request.motif) {
    case "launch":
      return {
        headline: ["Heute geht’s", "los!"],
        body: <div style={{ ...flexCol, gap: 56 }}>
          <Text size={56} weight={800}>Ganz NRW repariert – gemeinsam zum Reparatur-Weltrekord.</Text>
          <div style={{ ...flexCol, gap: 4 }}>
            <Kicker ground={ground}>Unser Ziel</Kicker>
            <BigNumber value={formatCount(stats.goal)} size={230} color={ground.text} />
            <Text size={52} weight={800}>Reparaturen{period ? ` vom ${period}` : ""}</Text>
          </div>
          <Text size={42} weight={700} color={ground.muted}>Repariert? Foto machen, eintragen, fertig – jede Reparatur zählt.</Text>
        </div>,
      };

    case "countdown": {
      const left = countdown(startAt, endAt, now.getTime());
      if (!left || left.target === "over") {
        return {
          headline: ["Vorbei!"],
          body: <div style={{ ...flexCol, gap: 40 }}>
            <Text size={60} weight={800}>Der Rekordversuch ist zu Ende. Danke an alle, die mitgemacht haben!</Text>
            <ProgressBar total={stats.total} goal={stats.goal} ground={ground} />
          </div>,
          cta: "Das Ergebnis:",
          path: "/stats",
        };
      }
      return {
        headline: left.target === "start" ? ["Nur noch"] : ["Countdown"],
        body: <div style={{ ...flexCol, gap: 48 }}>
          <div style={{ ...flexRow, gap: 36, alignItems: "flex-end" }}>
            <BigNumber value={String(left.value)} size={360} color={ground.text} />
            <Text size={96} weight={900} style={{ paddingBottom: 30 }}>{left.unit}</Text>
          </div>
          <Text size={56} weight={800}>
            {left.target === "start" ? "bis der Reparaturrekord startet." : left.unit.startsWith("Stunde") ? "bis zum Schluss – letzte Chance!" : "läuft der Reparaturrekord noch."}
          </Text>
          {left.target === "end" && <ProgressBar total={stats.total} goal={stats.goal} ground={ground} />}
        </div>,
        cta: left.target === "end" ? "Jetzt noch mitmachen:" : undefined,
      };
    }

    case "categories": {
      const top = rankEntries(stats.categories, 6);
      const max = top[0]?.count ?? 1;
      return {
        headline: ["Das repariert", "NRW gerade"],
        body: <div style={{ ...flexCol, gap: 22 }}>
          {top.map((entry) => <RankRow key={entry.key} badge={<Pictogram category={entry.key} size={48} />} name={repairCategoryLabel(entry.key)} count={entry.count} max={max} ground={ground} />)}
          <Text size={38} weight={700} color={ground.muted} style={{ marginTop: 10 }}>{formatCount(stats.total)} Reparaturen insgesamt</Text>
        </div>,
      };
    }

    case "kreise": {
      const top = rankEntries(stats.kreise, 7);
      const max = top[0]?.count ?? 1;
      const places = rankEntries(stats.kreise).length;
      return {
        headline: ["Wer repariert", "am meisten?"],
        body: <div style={{ ...flexCol, gap: 18 }}>
          {top.map((entry, index) => <RankRow key={entry.key} badge={String(index + 1)} name={entry.key} count={entry.count} max={max} ground={ground} />)}
          <Text size={38} weight={700} color={ground.muted} style={{ marginTop: 10 }}>{places} Städte und Kreise sind schon dabei</Text>
        </div>,
        cta: "Bring deine Stadt nach vorn:",
      };
    }

    case "today": {
      const leader = rankEntries(stats.todayKreise, 1)[0];
      const record = stats.dayRecord ?? stats.bestDay?.total ?? null;
      const newRecord = record !== null && stats.today > record;
      return {
        headline: newRecord ? ["Neuer", "Tagesrekord!"] : ["Heute schon"],
        body: <div style={{ ...flexCol, gap: 44 }}>
          <div style={{ ...flexCol, gap: 4 }}>
            <Kicker ground={ground}>{formatDay(now)}</Kicker>
            <BigNumber value={formatCount(stats.today)} size={300} color={ground.text} />
            <Text size={60} weight={900}>Reparaturen an einem Tag</Text>
          </div>
          <Tiles ground={ground} items={[
            { label: "Bester Tag", value: stats.bestDay ? formatCount(stats.bestDay.total) : "–", sub: stats.bestDay ? formatDay(stats.bestDay.date) : "noch keiner" },
            { label: "Tagesrekord", value: stats.dayRecord ? formatCount(stats.dayRecord) : "–", sub: stats.dayRecord ? "zu knacken" : "noch offen" },
            ...(leader ? [{ label: "Vorn heute", value: leader.key, sub: `${formatCount(leader.count)} Reparaturen` }] : []),
            { label: "Insgesamt", value: formatCount(stats.total), sub: `${goalPercent(stats.total, stats.goal)} % vom Ziel` },
          ]} />
        </div>,
      };
    }

    case "milestone": {
      const value = request.milestone ?? autoMilestone(stats.total);
      return {
        headline: ["Meilenstein!"],
        body: <div style={{ ...flexCol, gap: 48 }}>
          <div style={{ ...flexCol, gap: 4 }}>
            <BigNumber value={formatCount(value)} size={300} color={ground.text} />
            <Text size={68} weight={900}>Reparaturen geschafft!</Text>
          </div>
          <ProgressBar total={stats.total} goal={stats.goal} ground={ground} />
          <Text size={44} weight={700} color={ground.muted}>Danke an alle, die mitmachen. Weiter geht’s!</Text>
        </div>,
      };
    }

    case "impact":
      return {
        headline: ["Das hat NRW", "schon gerettet"],
        body: <div style={{ ...flexCol, gap: 34 }}>
          {[
            { value: formatHours(stats.minutesSaved), label: "Stunden Reparaturzeit" },
            { value: `${formatCount(stats.valueSavedEuros)} €`, label: "an Wert erhalten statt weggeworfen" },
            { value: `${formatCount(successShare(stats.succeeded, stats.attempted, stats.total))} %`, label: "der Reparaturversuche gelungen" },
          ].map((item) => <div key={item.label} style={{ ...flexCol, gap: 0 }}>
            <BigNumber value={item.value} size={150} color={ground.text} />
            <Text size={46} weight={800}>{item.label}</Text>
          </div>)}
          <Text size={36} weight={700} color={ground.muted}>Aus {formatCount(stats.total)} gemeldeten Reparaturen</Text>
        </div>,
      };

    case "final": {
      const reached = stats.total >= stats.goal;
      const tileWidth = Math.floor((INNER - 24) / 2);
      return {
        headline: reached ? ["Ziel", "erreicht!"] : ["Danke, NRW!"],
        body: <div style={{ ...flexCol, gap: 40 }}>
          <div style={{ ...flexCol, gap: 4 }}>
            {period && <Kicker ground={ground}>{period}</Kicker>}
            <BigNumber value={formatCount(stats.total)} size={240} color={ground.text} />
            <Text size={56} weight={900}>Reparaturen</Text>
            <Text size={40} weight={700} color={ground.muted}>{goalPercent(stats.total, stats.goal)} % vom Ziel ({formatCount(stats.goal)})</Text>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            <Tile ground={ground} width={tileWidth} label="Stunden" value={formatHours(stats.minutesSaved)} sub="repariert" />
            <Tile ground={ground} width={tileWidth} label="Wert" value={`${formatCount(stats.valueSavedEuros)} €`} sub="erhalten" />
            <Tile ground={ground} width={tileWidth} label="Top-Kategorie" value={topCategory ? repairCategoryLabel(topCategory.key) : "–"} sub={topCategory ? `${formatCount(topCategory.count)}×` : undefined} />
            <Tile ground={ground} width={tileWidth} label="Top-Ort" value={topKreis?.key ?? "–"} sub={topKreis ? `${formatCount(topKreis.count)}×` : undefined} />
          </div>
        </div>,
        cta: "Alle Zahlen:",
        path: "/stats",
      };
    }

    case "kreis": {
      const name = request.kreis ?? topKreis?.key ?? "Wuppertal";
      const standing = kreisStanding(stats, name);
      return {
        headline: [name],
        body: <div style={{ ...flexCol, gap: 48 }}>
          <div style={{ ...flexCol, gap: 4 }}>
            <Kicker ground={ground}>Stand in {name}</Kicker>
            <BigNumber value={formatCount(standing.count)} size={320} color={ground.text} />
            <Text size={64} weight={900}>Reparaturen</Text>
          </div>
          <Tiles ground={ground} items={[
            { label: "Platz", value: standing.rank ? `${standing.rank}.` : "–", sub: standing.of ? `von ${standing.of} in NRW` : "noch offen" },
            { label: "Heute", value: formatCount(standing.today), sub: "Reparaturen" },
          ]} />
        </div>,
        cta: `Mach mit, ${name}:`,
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
      const verdict = diff === 0 ? "Gleichstand! Wer legt nach?" : `${a.count > b.count ? nameA : nameB} liegt ${formatCount(diff)} Reparaturen vorn.`;
      const side = (standing: typeof a) => <div style={{ ...flexCol, gap: 10 }}>
        <Text size={62} weight={900}>{standing.name}</Text>
        <div style={{ ...flexRow, gap: 24 }}>
          <div style={{ display: "flex", width: Math.max(16, Math.round((standing.count / max) * (INNER - 300))), height: 64, background: ground.text }} />
          <div style={{ display: "flex", fontSize: 88, fontWeight: 900 }}>{formatCount(standing.count)}</div>
        </div>
      </div>;
      return {
        headline: ["Stadt-Duell"],
        body: <div style={{ ...flexCol, gap: 40 }}>
          {side(a)}
          <div style={{ display: "flex", alignSelf: "center", padding: "10px 40px 18px", border: `5px solid ${ink}`, background: ground.sticker, color: ground.stickerText, fontSize: 80, fontWeight: 900, transform: "rotate(-3deg)" }}>VS</div>
          {side(b)}
          <Text size={46} weight={800} style={{ marginTop: 16 }}>{verdict}</Text>
        </div>,
        cta: "Hilf deiner Stadt:",
      };
    }

    case "lottery":
      return {
        headline: ["Reparieren", "und gewinnen"],
        body: <div style={{ ...flexCol, gap: 36 }}>
          <Text size={48} weight={800}>Jede Reparatur, die du einreichst, kann an der Verlosung teilnehmen.</Text>
          {prizeCount > 0 && <div style={{ ...flexRow, gap: 28, alignItems: "flex-end" }}>
            <BigNumber value={formatCount(prizeCount)} size={180} color={ground.text} />
            <Text size={72} weight={900} style={{ paddingBottom: 20 }}>Preise</Text>
          </div>}
          <Steps ground={ground} steps={["Reparatur eintragen", "Häkchen beim Gewinnspiel setzen", "Ziehung nach dem Rekordmonat abwarten"]} />
        </div>,
        cta: "Alle Infos:",
        path: "/gewinnspiel",
      };

    case "howto":
      return {
        headline: ["So bist du", "dabei"],
        body: <div style={{ ...flexCol, gap: 56 }}>
          <Steps ground={ground} steps={posterCopy.de.steps} />
          <div style={{ ...flexCol, alignItems: "center", gap: 28, marginTop: 20 }}>
            <Text size={46} weight={900}>Link antippen und loslegen</Text>
            <ArrowDown color={ground.text} />
          </div>
        </div>,
        cta: "Oder direkt:",
      };
  }
}

/* --- Karte ---------------------------------------------------------------- */

export function SharepicCard(input: SharepicInput) {
  const { request, now, domain } = input;
  const ground = shareVisualGrounds[request.ground];
  const { headline, body, cta, path = "" } = motifBody(input, ground);
  const live = sharepicMotifs[request.motif].live;

  return <div style={{ width: "100%", height: "100%", display: "flex", padding: FRAME, background: bg, backgroundImage: paperGrain, fontFamily: "Nunito, sans-serif" }}>
    <div style={{
      position: "relative",
      ...flexCol,
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      padding: `${SHAREPIC_SAFE.top - FRAME - 4}px ${PAD_X}px ${SHAREPIC_SAFE.bottom - FRAME - 4}px`,
      border: `4px solid ${ink}`,
      background: ground.ground,
      backgroundImage: paperGrain,
      color: ground.text,
    }}>
      <div style={{ ...flexCol, gap: 44 }}>
        <div style={{ ...flexRow, justifyContent: "space-between" }}>
          <div style={{ ...flexRow, gap: 20, fontSize: 32, fontWeight: 800, letterSpacing: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, background: ground.mark, color: ground.markText, fontSize: 46, fontWeight: 900, transform: "rotate(-2deg)" }}>R</div>
            REPARATURREKORD NRW
          </div>
        </div>
        <Headline lines={request.headline ?? headline} ground={ground} />
        {body}
      </div>

      <div style={{ ...flexCol, gap: 10 }}>
        {live && <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: ground.muted }}>{formatStand(now)}</div>}
        <div style={{ ...flexRow, gap: 18, flexWrap: "wrap", fontSize: 44, fontWeight: 900 }}>
          <span>{cta ?? "Mach mit:"}</span>
          <div style={{ display: "flex", padding: "2px 18px 8px", background: request.ground === "ink" ? yellow : ink, color: request.ground === "ink" ? ink : bg, transform: "rotate(-1deg)" }}>{`${domain}${path}`}</div>
        </div>
      </div>

      {/* Im unteren Schutzraum nur, was niemand lesen muss. */}
      <div style={{ position: "absolute", left: PAD_X, right: PAD_X, bottom: 90, display: "flex", justifyContent: "center", fontSize: 26, fontWeight: 700, letterSpacing: 2, color: ground.muted }}>
        #reparaturrekord · Circular Week 2026
      </div>

      {request.demo && <div style={{ position: "absolute", left: 0, top: 780, width: "100%", display: "flex", justifyContent: "center", fontSize: 200, fontWeight: 900, color: request.ground === "ink" ? "rgba(255, 196, 50, .35)" : "rgba(214, 40, 40, .3)", transform: "rotate(-24deg)" }}>BEISPIEL</div>}
    </div>
  </div>;
}
