"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { hashString, nrwHubs, nrwKreise, nrwOutline, positionForId, projectToUnitSquare, randomPointInKreis, rhineCourse, seededRandom, type OriginCell } from "@/lib/nrw-map";

/**
 * Punktwolke aller Reparaturen ueber der Karte von Nordrhein-Westfalen.
 *
 * Statt zehntausend DOM-Knoten oder Bildern zeichnet eine einzige Canvas alles.
 * Die Partikeldaten liegen in typisierten Arrays, damit auch bei 10.000 Punkten
 * pro Frame nichts allokiert wird. Neue Reparaturen "landen" sichtbar mit einem
 * Ring, und alle 20 Sekunden zoomt die Kamera auf einen Punkt, waehrend darueber
 * der Spotlight das zugehoerige Bild zeigt.
 *
 * Beim Oeffnen faellt die ganze Wolke einmal als Sternschnuppenregen ein, statt
 * fertig dazustehen. Danach bleibt jeder Punkt, wo und wie er ist - Position,
 * Groesse und Farbe haengen allein an der Kennung der Reparatur.
 *
 * Unter der Wolke liegen die 53 Kreise. Ihre Fuellung richtet sich nach der Zahl
 * der Reparaturen darin - die Karte ist damit selbst eine Auswertung. Zeigt die
 * Maus auf einen Kreis, meldet die Komponente das nach oben; die Zahlen dazu
 * rendert die Seite als Sprechblase.
 *
 * Die Karte wird nicht ueber den ganzen Bildschirm gezeichnet, sondern in die
 * Buehnenspalte. Ganzflaechig verdecken die Panels links und rechts je ein
 * Viertel des Landes - und damit die Merkmale, an denen man es erkennt.
 */

export type CloudFocus = { id: string } | null;

/** Kreis unter dem Zeiger, in Bildschirmkoordinaten fuer die Sprechblase. */
export type KreisHover = { name: string; x: number; y: number } | null;

type Props = {
  /** Gesamtzahl der Reparaturen (bestimmt die Punktdichte). */
  total: number;
  /**
   * Neu hinzugekommene Reparaturen seit dem letzten Render, mit Kreis, wenn
   * bekannt (siehe `DashboardHighlight.mapKreis`) - damit landet der Punkt
   * dort, statt aus dem Zellen-Aggregat eine beliebige Zelle zu erben.
   */
  arrivals: { id: string; kreis: string | null }[];
  /** Punkt, auf den die Kamera zoomen soll. */
  focusId: string | null;
  /** Zielerreichung: loest einen Konfetti-Ausbruch aus. */
  celebrating: boolean;
  /** Anonymisierte Herkunftszellen; leer heisst symbolische Verteilung. */
  cells: OriginCell[];
  /**
   * Reparaturen je Kreis; steuert die Helligkeit und die Sprechblase.
   *
   * Muss stabil referenziert sein (useMemo), sonst werden die Fuellfarben in
   * jedem Frame neu gebaut.
   */
  kreisCounts: Record<string, number>;
  /** Element, in dessen Flaeche die Karte gezeichnet wird. */
  frameRef: RefObject<HTMLElement | null>;
  /**
   * Beamer-Modus: reines Schwarz als Grund. Die Canvas malt ihren Hintergrund
   * selbst, deshalb genuegt eine CSS-Klasse hier nicht.
   */
  beamer: boolean;
};

/**
 * CI-Palette. Jeder Punkt behaelt seine Farbe, solange die Seite offen ist: Sie
 * haengt allein an der Kennung der Reparatur, wird also aus dem Datensatz
 * abgeleitet und weder gespeichert noch nachgeladen. Frueher schob die
 * Zeichenschleife zusaetzlich die ganze Palette alle sechs Sekunden um eine
 * Farbe weiter - aus zehn Metern sah das aus, als blinke die Karte.
 */
const palette = ["#ffc432", "#95d4bb", "#00b072", "#ec424c", "#465eab", "#f7f5f0"];

/**
 * Wie haeufig eine Farbe vorkommt. Gleichverteilt ueber alle sechs ergibt die
 * Wolke einen Weihnachtsbaum; so tragen Mint, Gruen und Creme die Flaeche, und
 * Gold, Rot und Blau sitzen als Akzente darin.
 */
const toneWeights = [2, 4, 3, 1, 1, 3];
const toneBag = toneWeights.flatMap((weight, index) => Array<number>(weight).fill(index));

/** Bilder, ueber die sich der Eroeffnungsregen verteilt - rund zwei Sekunden. */
const INTRO_FRAMES = 120;

/** Mehr Punkte bringen optisch nichts, kosten aber Rechenzeit. */
const MAX_PARTICLES = 9_000;

/** Schritt je Frame des Anflugs; ergibt bei 60 Hz gut anderthalb Sekunden. */
const FLIGHT_STEP = 0.011;

const outlineUnit = nrwOutline.map(projectToUnitSquare);
const rhineUnit = rhineCourse.map(projectToUnitSquare);
const kreiseUnit = nrwKreise.map((kreis) => ({ name: kreis.name, ring: kreis.outline.map(projectToUnitSquare) }));

/**
 * Staedte mit Namen auf der Karte.
 *
 * Der Reihe nach die groessten, aber nur solange sie genug Abstand zu einer schon
 * gesetzten Beschriftung haben. Ohne diese Sperre ueberlagern sich im Ruhrgebiet
 * ein Dutzend Namen zu einem unlesbaren Block.
 *
 * Alle uebrigen Orte hatten frueher einen Punkt ohne Namen. Neben tausenden
 * Reparaturpunkten war der nicht mehr als Ort zu erkennen - er sah aus wie eine
 * Reparatur, die keine ist. Deshalb ist er weg: Jeder Punkt auf der Karte steht
 * fuer genau eine Reparatur, Orte gibt es nur noch mit Namen.
 */
const cityPoints = [...nrwHubs]
  .sort((left, right) => right.weight - left.weight)
  .map((hub) => ({ name: hub.name, ...projectToUnitSquare(hub) }));

const labelledCities = cityPoints.reduce<{ name: string; x: number; y: number }[]>((placed, city) => {
  const crowded = placed.some((other) => Math.hypot(other.x - city.x, other.y - city.y) < 0.052);
  if (!crowded && placed.length < 26) placed.push(city);
  return placed;
}, []);

/** Strahlverfahren im projizierten Raum - fuer das Zeigen auf die Karte. */
function ringContains(point: { x: number; y: number }, ring: { x: number; y: number }[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    if (a.y > point.y !== b.y > point.y && point.x < a.x + ((point.y - a.y) / (b.y - a.y)) * (b.x - a.x)) {
      inside = !inside;
    }
  }
  return inside;
}

export function RepairCloud({ total, arrivals, focusId, celebrating, cells, kreisCounts, frameRef, beamer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Der Zeigezustand bleibt in dieser Komponente. Landete er in der Seite,
  // wuerde jede Mausbewegung das ganze Dashboard neu rendern - Kategorien,
  // Zeitachse und Laufband inklusive.
  const [hover, setHover] = useState<KreisHover>(null);
  // Die Animationsschleife laeuft ausserhalb von React und liest den aktuellen
  // Stand deshalb aus Refs, die nach jedem Render nachgezogen werden.
  const stateRef = useRef({ total, focusId, celebrating, beamer });
  useEffect(() => {
    stateRef.current.total = total;
    stateRef.current.focusId = focusId;
    stateRef.current.celebrating = celebrating;
    stateRef.current.beamer = beamer;
  }, [total, focusId, celebrating, beamer]);

  const countsRef = useRef(kreisCounts);
  useEffect(() => {
    countsRef.current = kreisCounts;
  }, [kreisCounts]);

  // Zellen kommen erst mit dem ersten Snapshot an. Bereits gesetzte Punkte
  // bleiben, wo sie sind - ein Umspringen der ganzen Wolke waere unruhiger als
  // die wenigen symbolisch platzierten Punkte der ersten Sekunden.
  const cellsRef = useRef(cells);
  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  // Neuzugaenge werden nur einmal eingespielt, deshalb ueber eine Queue.
  const queueRef = useRef<{ id: string; kreis: string | null }[]>([]);
  const seenRef = useRef(new Set<string>());
  useEffect(() => {
    for (const arrival of arrivals) {
      if (!seenRef.current.has(arrival.id)) {
        seenRef.current.add(arrival.id);
        queueRef.current.push(arrival);
      }
    }
  }, [arrivals]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasContext = canvas.getContext("2d", { alpha: false });
    if (!canvasContext) return;
    // Lokale Bindung, damit die Verengung auch in den Hilfsfunktionen gilt.
    const context = canvasContext;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    /** Flaeche der Karte innerhalb der Canvas. */
    const frame = { left: 0, top: 0, width: 0, height: 0 };

    const resize = () => {
      // clientWidth/-Height statt getBoundingClientRect(): Im erzwungenen
      // Widescreen-Modus auf dem Smartphone ist die Buehne um 90 Grad gedreht.
      // Das Rect meldet dann die Masse *nach* der Transformation, also
      // vertauscht - die Layoutmasse hier sind die richtigen.
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      // Ueber 4K bringt eine hoehere Pixeldichte nichts mehr, kostet aber
      // quadratisch Fuellrate. Deshalb zusaetzlich zur Geraetedichte deckeln.
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 3_840 / width);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      // offsetLeft/-Top statt Rect, aus demselben Grund: beides sind Layoutwerte
      // und damit unabhaengig von der Drehung der Buehne.
      const stage = frameRef.current;
      frame.left = stage?.offsetLeft ?? 0;
      frame.top = stage?.offsetTop ?? 0;
      frame.width = stage?.offsetWidth ?? width;
      frame.height = stage?.offsetHeight ?? height;
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const stage = frameRef.current;
    if (stage) observer.observe(stage);

    // --- Fuellfarben der Kreise -------------------------------------------
    // Nur neu berechnet, wenn sich die Zahlen aendern: 53 Farbstrings pro Frame
    // waeren reine Verschwendung.
    let styledCounts: Record<string, number> | null = null;
    let kreisFill: string[] = [];

    /**
     * Kurzes Aufleuchten eines Kreises, wenn dort gerade eine Reparatur
     * eintrifft - Wert 1 beim Start, klingt jeden Frame ab. Eigene Map statt
     * React-State: das ist reine Canvas-Optik, kein Rerender noetig.
     */
    const kreisFlash = new Map<string, number>();

    function refreshKreisFills() {
      const counts = countsRef.current;
      if (counts === styledCounts) return;
      styledCounts = counts;

      const max = Math.max(1, ...kreiseUnit.map((kreis) => counts[kreis.name] ?? 0));
      kreisFill = kreiseUnit.map((kreis) => {
        // Wurzel statt linear: Ohne sie verschwinden alle Kreise neben dem
        // Ruhrgebiet im Dunkeln, sobald dort ein Vielfaches zusammenkommt.
        const intensity = Math.sqrt((counts[kreis.name] ?? 0) / max);
        // Deckel bei 0.3: Darueber uebertoent die Flaeche die Punktwolke, und
        // die Punkte sind die eigentliche Aussage der Karte.
        return `rgba(0, 176, 114, ${(0.03 + intensity * 0.27).toFixed(3)})`;
      });
    }

    // --- Partikelspeicher -------------------------------------------------
    let count = 0;
    /** Der Eroeffnungsregen laeuft genau einmal, direkt nach dem Oeffnen. */
    let introDone = reduceMotion;
    const baseX = new Float32Array(MAX_PARTICLES);
    const baseY = new Float32Array(MAX_PARTICLES);
    const phase = new Float32Array(MAX_PARTICLES);
    const drift = new Float32Array(MAX_PARTICLES);
    const size = new Float32Array(MAX_PARTICLES);
    const tone = new Uint8Array(MAX_PARTICLES);
    /** Landeanimation: 1 = gerade eingetroffen, 0 = eingereiht. */
    const landing = new Float32Array(MAX_PARTICLES);
    /**
     * Anflug einer neuen Reparatur: 1 = gerade gestartet, 0 = angekommen.
     *
     * Bisher tauchte ein neuer Punkt einfach an seiner Stelle auf. Jetzt kommt
     * er von ausserhalb der Karte hereingeflogen und schlaegt dort ein - auf
     * einer Buehne ist der Weg die halbe Nachricht.
     */
    const flight = new Float32Array(MAX_PARTICLES);
    const fromX = new Float32Array(MAX_PARTICLES);
    const fromY = new Float32Array(MAX_PARTICLES);
    /**
     * Punkte des Eroeffnungsregens. Sie fliegen wie Neuzugaenge herein, bekommen
     * aber weder Landering noch gezeichneten Schweif: Bei tausenden gleichzeitig
     * waere die Karte sonst eine weisse Flaeche - und die Nachleuchtspur der
     * Canvas zieht den Schweif ohnehin von selbst.
     */
    const introFlight = new Uint8Array(MAX_PARTICLES);
    const indexById = new Map<string, number>();

    /**
     * `still` erscheint ohne Bewegung, `arrival` fliegt mit Ring und Schweif
     * ein, `intro` gehoert zum Eroeffnungsregen.
     */
    function addParticle(id: string, entry: "still" | "arrival" | "intro", kreis: string | null = null) {
      if (count >= MAX_PARTICLES) return;
      // Ist der Kreis dieser konkreten Reparatur bekannt, landet sie darin -
      // statt aus dem Zellen-Aggregat eine beliebige, nach Haeufigkeit
      // gewichtete Zelle zu erben, die mit dieser Reparatur nichts zu tun hat.
      const point = (kreis && randomPointInKreis(id, kreis)) || positionForId(id, cellsRef.current);
      const random = seededRandom(hashString(`${id}:wobble`));
      const index = count;
      baseX[index] = point.x;
      baseY[index] = point.y;
      phase[index] = random() * Math.PI * 2;
      drift[index] = 0.15 + random() * 0.85;
      size[index] = 0.9 + random() * 1.5;
      tone[index] = toneBag[Math.floor(random() * toneBag.length)];

      // Der Ring kommt erst beim Aufschlag; waehrend des Flugs waere er nur ein
      // Kreis, der ueber die Karte wandert.
      landing[index] = 0;
      const flies = entry !== "still" && !reduceMotion;
      flight[index] = flies ? 1 : 0;
      introFlight[index] = entry === "intro" ? 1 : 0;
      if (flies) {
        // Start weit ausserhalb des Kartenquadrats, Richtung zufaellig.
        const angle = random() * Math.PI * 2;
        fromX[index] = 0.5 + Math.cos(angle) * 1.25;
        fromY[index] = 0.5 + Math.sin(angle) * 1.25;
        // Werte ueber 1 sind Wartezeit am Startpunkt: Ohne sie zoege der Regen
        // in sauberen Reihen herein, weil die Punkte je Bild gebuendelt starten.
        if (entry === "intro") flight[index] = 1 + random() * 0.55;
      } else if (entry === "arrival") {
        landing[index] = 1;
      }

      indexById.set(id, index);
      count += 1;
    }

    // --- Kamera -----------------------------------------------------------
    const camera = { x: 0.5, y: 0.5, zoom: 1 };
    const target = { x: 0.5, y: 0.5, zoom: 1 };
    let scale = 1;

    // --- Zeigen auf die Karte ---------------------------------------------
    let hoveredKreis: string | null = null;

    const onPointerMove = (event: PointerEvent) => {
      // Der Zeiger kommt vom Buehnenelement, dessen linke obere Ecke genau
      // frame.left/frame.top entspricht - offsetX/-Y sind also schon die
      // Position innerhalb der Kartenflaeche.
      const unit = {
        x: (event.offsetX - frame.width / 2) / scale + camera.x,
        y: (event.offsetY - frame.height / 2) / scale + camera.y,
      };
      const name = kreiseUnit.find((kreis) => ringContains(unit, kreis.ring))?.name ?? null;
      if (name === hoveredKreis) return;

      hoveredKreis = name;
      // Nur beim Wechsel des Kreises neu rendern; die Blase bleibt danach an
      // der Stelle stehen, an der der Kreis betreten wurde.
      setHover(name ? { name, x: event.clientX, y: event.clientY } : null);
    };

    const onPointerLeave = () => {
      if (hoveredKreis === null) return;
      hoveredKreis = null;
      setHover(null);
    };

    if (stage) {
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerleave", onPointerLeave);
    }

    // --- Konfetti fuer die Zielerreichung ---------------------------------
    const confetti = { active: 0, x: new Float32Array(240), y: new Float32Array(240), vx: new Float32Array(240), vy: new Float32Array(240), tone: new Uint8Array(240) };
    function burstConfetti() {
      confetti.active = confetti.x.length;
      for (let index = 0; index < confetti.active; index += 1) {
        const angle = (index / confetti.active) * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        confetti.x[index] = 0.5;
        confetti.y[index] = 0.5;
        confetti.vx[index] = Math.cos(angle) * speed;
        confetti.vy[index] = Math.sin(angle) * speed - 3;
        confetti.tone[index] = index % palette.length;
      }
    }
    let wasCelebrating = false;

    let frameHandle = 0;
    let lastFocus: string | null = null;
    let start = performance.now();

    function project(unitX: number, unitY: number) {
      return {
        x: frame.left + frame.width / 2 + (unitX - camera.x) * scale,
        y: frame.top + frame.height / 2 + (unitY - camera.y) * scale,
      };
    }

    /** Zieht einen Pfad aus Einheitskoordinaten. */
    function tracePath(points: { x: number; y: number }[], close: boolean) {
      context.beginPath();
      points.forEach((point, index) => {
        const screen = project(point.x, point.y);
        if (index === 0) context.moveTo(screen.x, screen.y);
        else context.lineTo(screen.x, screen.y);
      });
      if (close) context.closePath();
    }

    /**
     * Ortsnamen ueber der Wolke.
     *
     * Sie lagen frueher unter den Punkten und waren neben tausenden davon nicht
     * mehr zu lesen. Jetzt kommen sie zuletzt - und statt eines Balkens
     * bekommt jeder Name einen dunklen Saum. Der Balken haette die Karte genau
     * dort zugedeckt, wo die meisten Reparaturen liegen; der Saum kostet nur
     * die Punkte, die den Buchstaben ohnehin im Weg stehen.
     */
    function drawPlaces(alpha: number) {
      if (alpha <= 0.02) return;

      const labelSize = Math.max(9, Math.min(19, scale / 68));
      const ground = stateRef.current.beamer ? "0, 0, 0" : "8, 11, 20";
      const gap = labelSize * 0.55;
      const dot = Math.max(1.8, labelSize / 6);

      context.font = `600 ${labelSize}px "Nunito", "Segoe UI", system-ui, sans-serif`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      // Ohne das Deckeln ziehen spitze Winkel - das V in Leverkusen etwa - lange
      // Zacken aus dem Saum heraus.
      context.miterLimit = 2;

      for (const city of labelledCities) {
        const screen = project(city.x, city.y);

        context.globalAlpha = alpha * 0.92;
        context.strokeStyle = `rgba(${ground}, 0.92)`;
        context.lineWidth = Math.max(3, labelSize / 3.2);
        context.beginPath();
        context.arc(screen.x, screen.y, dot, 0, Math.PI * 2);
        context.stroke();
        context.strokeText(city.name, screen.x + gap, screen.y);

        context.globalAlpha = alpha * 0.82;
        context.fillStyle = "#f7f5f0";
        context.beginPath();
        context.arc(screen.x, screen.y, dot, 0, Math.PI * 2);
        context.fill();
        context.fillText(city.name, screen.x + gap, screen.y);
      }
      context.globalAlpha = 1;
    }

    function draw(now: number) {
      const time = (now - start) / 1000;
      // Auf einem Handydisplay waeren 9.000 Punkte nur noch Rauschen und kosten
      // Akku; auf einer 4K-Wand duerfen es alle sein.
      const budgetForArea = Math.round((frame.width * frame.height) / 70);
      const desired = Math.min(stateRef.current.total, MAX_PARTICLES, Math.max(600, budgetForArea));

      // Fehlende Punkte auffuellen: fuer noch unbekannte Einreichungen wird ein
      // stabiler Ersatz-Seed benutzt, damit die Wolke die Gesamtzahl abbildet.
      //
      // Der erste Schwung ist der Eroeffnungsregen: Alle Punkte fliegen einmal
      // von aussen ein. Die Rate richtet sich nach der Punktzahl, damit der
      // Regen immer rund zwei Sekunden dauert - mit festen 60 je Bild waere er
      // auf einer kleinen Buehne nach einem Wimpernschlag vorbei.
      let budget = introDone ? 60 : Math.max(8, Math.ceil(desired / INTRO_FRAMES));
      while (count < desired && budget > 0) {
        addParticle(`fill:${count}`, introDone ? "still" : "intro");
        budget -= 1;
      }
      if (count >= desired) introDone = true;

      let pending = queueRef.current.shift();
      while (pending) {
        if (!indexById.has(pending.id)) {
          addParticle(pending.id, "arrival", pending.kreis);
          if (pending.kreis) kreisFlash.set(pending.kreis, 1);
        }
        pending = queueRef.current.shift();
      }

      // Kameraziel bestimmen.
      const focus = stateRef.current.focusId;
      if (focus !== lastFocus) {
        lastFocus = focus;
        const index = focus ? indexById.get(focus) : undefined;
        if (index !== undefined) {
          target.x = baseX[index];
          target.y = baseY[index];
          target.zoom = 3.4;
        } else {
          target.x = 0.5;
          target.y = 0.5;
          target.zoom = 1;
        }
      }

      const ease = reduceMotion ? 1 : 0.035;
      camera.x += (target.x - camera.x) * ease;
      camera.y += (target.y - camera.y) * ease;
      camera.zoom += (target.zoom - camera.zoom) * ease;
      scale = Math.min(frame.width, frame.height) * 0.94 * camera.zoom;

      refreshKreisFills();

      // Nachleuchtender Hintergrund: erzeugt weiche Spuren auf dem Beamer. Im
      // Beamer-Modus reines Schwarz, damit der Projektor dort gar nicht leuchtet.
      const ground = stateRef.current.beamer ? "0, 0, 0" : "8, 11, 20";
      context.fillStyle = reduceMotion ? `rgb(${ground})` : `rgba(${ground}, 0.34)`;
      context.fillRect(0, 0, width, height);

      // Kreise: Fuellung nach Zahl der Reparaturen, feine Trennlinien darueber.
      context.lineJoin = "round";
      const kreisLine = Math.max(0.5, scale / 1_400);
      kreiseUnit.forEach((kreis, index) => {
        tracePath(kreis.ring, true);
        const isHovered = kreis.name === hoveredKreis;
        // Kurzes Aufleuchten, wenn dort gerade eine Reparatur eingetroffen ist -
        // dieselbe Goldfarbe wie Landering und Anflug-Schweif, damit "hier ist
        // etwas passiert" ueberall gleich aussieht.
        const flash = kreisFlash.get(kreis.name) ?? 0;
        if (isHovered) {
          context.fillStyle = "rgba(255, 196, 50, 0.3)";
        } else if (flash > 0) {
          context.fillStyle = `rgba(255, 196, 50, ${(0.12 + flash * 0.35).toFixed(3)})`;
        } else {
          context.fillStyle = kreisFill[index];
        }
        context.fill();
        context.lineWidth = isHovered ? Math.max(1.4, kreisLine * 3) : flash > 0 ? Math.max(1, kreisLine * (1 + flash * 2)) : kreisLine;
        context.strokeStyle = isHovered
          ? "rgba(255, 196, 50, 0.95)"
          : flash > 0
            ? `rgba(255, 196, 50, ${(0.4 + flash * 0.55).toFixed(3)})`
            : "rgba(149, 212, 187, 0.22)";
        context.stroke();
        if (flash > 0) kreisFlash.set(kreis.name, Math.max(0, flash - 0.012));
      });

      // Landesgrenze zweimal: breit und weich als Schein, darueber schmal und klar.
      tracePath(outlineUnit, true);
      context.lineWidth = Math.max(4, scale / 150);
      context.strokeStyle = "rgba(149, 212, 187, 0.1)";
      context.stroke();
      context.lineWidth = Math.max(1.2, scale / 620);
      context.strokeStyle = "rgba(149, 212, 187, 0.75)";
      context.stroke();

      // Rhein als Orientierungslinie.
      tracePath(rhineUnit, false);
      context.lineWidth = Math.max(1.5, scale / 330);
      context.strokeStyle = "rgba(120, 205, 220, 0.5)";
      context.stroke();

      // Beim Zoom auf ein Bild blenden die Ortsnamen aus, damit der Spotlight
      // nicht auf beschrifteten Punkten liegt. Gezeichnet werden sie erst nach
      // der Wolke, siehe drawPlaces().
      const labelAlpha = Math.max(0, 1 - (camera.zoom - 1) * 1.4);

      // Punkte, nach Farbe gruppiert, damit fillStyle selten wechselt.
      const wobble = reduceMotion ? 0 : 1;
      // Ohne diese Skalierung waeren die Punkte auf einer 4K-Wand halb so gross
      // wie auf 1080p und die Wolke wirkte ausgeduennt.
      const pointScale = Math.max(0.75, Math.min(frame.width, frame.height) / 760);
      for (let group = 0; group < palette.length; group += 1) {
        context.fillStyle = palette[group];
        for (let index = 0; index < count; index += 1) {
          if (tone[index] !== group) continue;

          const swing = wobble * 0.0032 * drift[index];
          let unitX = baseX[index] + Math.sin(time * 0.35 * drift[index] + phase[index]) * swing;
          let unitY = baseY[index] + Math.cos(time * 0.29 * drift[index] + phase[index] * 1.7) * swing;

          // Anflug: von aussen auf die eigene Position, mit Schwung am Anfang
          // und weichem Auslaufen. Am Ende uebernimmt der Landering.
          const incoming = flight[index];
          if (incoming > 0) {
            const next = Math.max(0, incoming - FLIGHT_STEP);
            flight[index] = next;
            if (next === 0 && introFlight[index] === 0) landing[index] = 1;

            // Ueber 1 wartet der Punkt am Startpunkt, also deckeln.
            const held = Math.min(1, next);
            const eased = held * held * held;
            unitX += (fromX[index] - baseX[index]) * eased;
            unitY += (fromY[index] - baseY[index]) * eased;
          }

          const screen = project(unitX, unitY);
          if (screen.x < -20 || screen.y < -20 || screen.x > width + 20 || screen.y > height + 20) continue;

          let radius = size[index] * pointScale * Math.min(camera.zoom, 2.2);
          if (incoming > 0) {
            // Sichtbar groesser und heller als die ruhende Wolke - ein Punkt in
            // Bewegung muss aus zehn Metern auffallen.
            radius += Math.min(1, incoming) * 7 * pointScale;
            context.globalAlpha = 1;
          } else if (landing[index] > 0) {
            landing[index] = Math.max(0, landing[index] - 0.006);
            radius += landing[index] * 9 * pointScale;
            context.globalAlpha = 0.55 + landing[index] * 0.45;
          } else {
            context.globalAlpha = 0.82;
          }

          context.fillRect(screen.x - radius / 2, screen.y - radius / 2, radius, radius);
        }
      }
      context.globalAlpha = 1;

      // Schweif der anfliegenden Punkte: eine kurze Linie entgegen der
      // Flugrichtung. Billiger als echte Zwischenbilder und deutlicher.
      context.lineCap = "round";
      for (let index = 0; index < count; index += 1) {
        const incoming = flight[index];
        if (incoming <= 0 || introFlight[index] === 1) continue;

        const eased = incoming * incoming * incoming;
        const tail = 0.06;
        const head = project(
          baseX[index] + (fromX[index] - baseX[index]) * eased,
          baseY[index] + (fromY[index] - baseY[index]) * eased,
        );
        const back = project(
          baseX[index] + (fromX[index] - baseX[index]) * Math.min(1, eased + tail),
          baseY[index] + (fromY[index] - baseY[index]) * Math.min(1, eased + tail),
        );

        context.beginPath();
        context.moveTo(head.x, head.y);
        context.lineTo(back.x, back.y);
        context.lineWidth = Math.max(1.5, 3 * pointScale);
        context.strokeStyle = `rgba(255, 196, 50, ${(0.15 + incoming * 0.5).toFixed(3)})`;
        context.stroke();
      }

      // Landeringe der Neuzugaenge.
      context.lineWidth = 2;
      for (let index = 0; index < count; index += 1) {
        if (landing[index] <= 0) continue;
        const screen = project(baseX[index], baseY[index]);
        const progress = 1 - landing[index];
        context.beginPath();
        context.arc(screen.x, screen.y, 6 + progress * 60, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 196, 50, ${landing[index] * 0.7})`;
        context.stroke();
      }

      drawPlaces(labelAlpha);

      // Fokuspunkt hervorheben.
      const focusIndex = focus ? indexById.get(focus) : undefined;
      if (focusIndex !== undefined) {
        const screen = project(baseX[focusIndex], baseY[focusIndex]);
        const pulse = 10 + Math.sin(time * 3) * 4;
        context.beginPath();
        context.arc(screen.x, screen.y, pulse, 0, Math.PI * 2);
        context.strokeStyle = "rgba(255, 196, 50, 0.9)";
        context.lineWidth = 2.5;
        context.stroke();
      }

      if (stateRef.current.celebrating && !wasCelebrating) burstConfetti();
      wasCelebrating = stateRef.current.celebrating;

      if (confetti.active > 0) {
        let alive = 0;
        for (let index = 0; index < confetti.active; index += 1) {
          confetti.vy[index] += 0.12;
          confetti.x[index] += confetti.vx[index] / width;
          confetti.y[index] += confetti.vy[index] / height;
          if (confetti.y[index] < 1.2) alive += 1;
          context.fillStyle = palette[confetti.tone[index]];
          context.fillRect(confetti.x[index] * width, confetti.y[index] * height, 6, 10);
        }
        if (alive === 0) confetti.active = 0;
      }

      frameHandle = requestAnimationFrame(draw);
    }

    start = performance.now();
    frameHandle = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameHandle);
      } else {
        start = performance.now();
        frameHandle = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frameHandle);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (stage) {
        stage.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [frameRef]);

  const hovered = hover ? kreisCounts[hover.name] ?? 0 : 0;
  const share = hover && total > 0 ? (hovered / total) * 100 : 0;

  return (
    <>
      <canvas className="cloud-canvas" ref={canvasRef} aria-hidden="true" />
      {hover && (
        <figure className="kreis-tip" style={{ left: hover.x, top: hover.y }}>
          <figcaption>{hover.name}</figcaption>
          <strong>{hovered.toLocaleString("de-DE")}</strong>
          <span>
            {hovered === 0
              ? "noch keine Reparatur in der Auswertung"
              : `Reparaturen · ${share.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % des Rekords`}
          </span>
        </figure>
      )}
    </>
  );
}
