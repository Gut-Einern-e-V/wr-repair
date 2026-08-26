"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { hashString, nrwHubs, nrwKreise, nrwOutline, positionForId, projectToUnitSquare, rhineCourse, seededRandom, type OriginCell } from "@/lib/nrw-map";

/**
 * Punktwolke aller Reparaturen ueber der Karte von Nordrhein-Westfalen.
 *
 * Statt zehntausend DOM-Knoten oder Bildern zeichnet eine einzige Canvas alles.
 * Die Partikeldaten liegen in typisierten Arrays, damit auch bei 10.000 Punkten
 * pro Frame nichts allokiert wird. Neue Reparaturen "landen" sichtbar mit einem
 * Ring, und alle 20 Sekunden zoomt die Kamera auf einen Punkt, waehrend darueber
 * der Spotlight das zugehoerige Bild zeigt.
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
  /** IDs, die seit dem letzten Render neu hinzugekommen sind. */
  arrivals: string[];
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

/** CI-Palette; die Punkte wandern langsam durch diese Farben. */
const palette = ["#ffc432", "#95d4bb", "#00b072", "#ec424c", "#465eab", "#f7f5f0"];

/** Mehr Punkte bringen optisch nichts, kosten aber Rechenzeit. */
const MAX_PARTICLES = 9_000;

const outlineUnit = nrwOutline.map(projectToUnitSquare);
const rhineUnit = rhineCourse.map(projectToUnitSquare);
const kreiseUnit = nrwKreise.map((kreis) => ({ name: kreis.name, ring: kreis.outline.map(projectToUnitSquare) }));

/**
 * Staedte mit Namen auf der Karte.
 *
 * Der Reihe nach die groessten, aber nur solange sie genug Abstand zu einer schon
 * gesetzten Beschriftung haben. Ohne diese Sperre ueberlagern sich im Ruhrgebiet
 * ein Dutzend Namen zu einem unlesbaren Block. Alle uebrigen Orte bekommen einen
 * Punkt ohne Namen - das ergibt ein dichtes Ortsnetz, das trotzdem lesbar ist.
 */
const cityPoints = [...nrwHubs]
  .sort((left, right) => right.weight - left.weight)
  .map((hub) => ({ name: hub.name, ...projectToUnitSquare(hub) }));

const labelledCities = cityPoints.reduce<{ name: string; x: number; y: number }[]>((placed, city) => {
  const crowded = placed.some((other) => Math.hypot(other.x - city.x, other.y - city.y) < 0.052);
  if (!crowded && placed.length < 26) placed.push(city);
  return placed;
}, []);

const labelledNames = new Set(labelledCities.map((city) => city.name));
const plainCities = cityPoints.filter((city) => !labelledNames.has(city.name));

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
  const queueRef = useRef<string[]>([]);
  const seenRef = useRef(new Set<string>());
  useEffect(() => {
    for (const id of arrivals) {
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id);
        queueRef.current.push(id);
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
    const baseX = new Float32Array(MAX_PARTICLES);
    const baseY = new Float32Array(MAX_PARTICLES);
    const phase = new Float32Array(MAX_PARTICLES);
    const drift = new Float32Array(MAX_PARTICLES);
    const size = new Float32Array(MAX_PARTICLES);
    const tone = new Uint8Array(MAX_PARTICLES);
    /** Landeanimation: 1 = gerade eingetroffen, 0 = eingereiht. */
    const landing = new Float32Array(MAX_PARTICLES);
    const indexById = new Map<string, number>();

    function addParticle(id: string, isNew: boolean) {
      if (count >= MAX_PARTICLES) return;
      const point = positionForId(id, cellsRef.current);
      const random = seededRandom(hashString(`${id}:wobble`));
      const index = count;
      baseX[index] = point.x;
      baseY[index] = point.y;
      phase[index] = random() * Math.PI * 2;
      drift[index] = 0.15 + random() * 0.85;
      size[index] = 0.9 + random() * 1.5;
      tone[index] = Math.floor(random() * palette.length);
      landing[index] = isNew ? 1 : 0;
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

    function draw(now: number) {
      const time = (now - start) / 1000;
      // Auf einem Handydisplay waeren 9.000 Punkte nur noch Rauschen und kosten
      // Akku; auf einer 4K-Wand duerfen es alle sein.
      const budgetForArea = Math.round((frame.width * frame.height) / 70);
      const desired = Math.min(stateRef.current.total, MAX_PARTICLES, Math.max(600, budgetForArea));

      // Fehlende Punkte auffuellen: fuer noch unbekannte Einreichungen wird ein
      // stabiler Ersatz-Seed benutzt, damit die Wolke die Gesamtzahl abbildet.
      let budget = 60;
      while (count < desired && budget > 0) {
        addParticle(`fill:${count}`, false);
        budget -= 1;
      }

      let pending = queueRef.current.shift();
      while (pending) {
        if (!indexById.has(pending)) addParticle(pending, true);
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
        context.fillStyle = isHovered ? "rgba(255, 196, 50, 0.3)" : kreisFill[index];
        context.fill();
        context.lineWidth = isHovered ? Math.max(1.4, kreisLine * 3) : kreisLine;
        context.strokeStyle = isHovered ? "rgba(255, 196, 50, 0.95)" : "rgba(149, 212, 187, 0.22)";
        context.stroke();
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

      // Orte. Beim Zoom auf ein Bild verschwinden sie, damit der Spotlight nicht
      // auf beschrifteten Punkten liegt.
      const labelAlpha = Math.max(0, 1 - (camera.zoom - 1) * 1.4);
      if (labelAlpha > 0.02) {
        const labelSize = Math.max(9, Math.min(19, scale / 68));

        context.globalAlpha = labelAlpha * 0.32;
        context.fillStyle = "#f7f5f0";
        for (const city of plainCities) {
          const screen = project(city.x, city.y);
          context.fillRect(screen.x - 1, screen.y - 1, 2.2, 2.2);
        }

        context.font = `500 ${labelSize}px "Nunito", "Segoe UI", system-ui, sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "middle";
        for (const city of labelledCities) {
          const screen = project(city.x, city.y);
          context.globalAlpha = labelAlpha * 0.55;
          context.fillStyle = "#f7f5f0";
          context.beginPath();
          context.arc(screen.x, screen.y, Math.max(1.5, labelSize / 7), 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = labelAlpha * 0.46;
          context.fillText(city.name, screen.x + labelSize * 0.5, screen.y);
        }
        context.globalAlpha = 1;
      }

      // Punkte, nach Farbe gruppiert, damit fillStyle selten wechselt.
      const shift = Math.floor(time / 6);
      const wobble = reduceMotion ? 0 : 1;
      // Ohne diese Skalierung waeren die Punkte auf einer 4K-Wand halb so gross
      // wie auf 1080p und die Wolke wirkte ausgeduennt.
      const pointScale = Math.max(0.75, Math.min(frame.width, frame.height) / 760);
      for (let group = 0; group < palette.length; group += 1) {
        context.fillStyle = palette[(group + shift) % palette.length];
        for (let index = 0; index < count; index += 1) {
          if (tone[index] !== group) continue;

          const swing = wobble * 0.0032 * drift[index];
          const unitX = baseX[index] + Math.sin(time * 0.35 * drift[index] + phase[index]) * swing;
          const unitY = baseY[index] + Math.cos(time * 0.29 * drift[index] + phase[index] * 1.7) * swing;
          const screen = project(unitX, unitY);
          if (screen.x < -20 || screen.y < -20 || screen.x > width + 20 || screen.y > height + 20) continue;

          let radius = size[index] * pointScale * Math.min(camera.zoom, 2.2);
          if (landing[index] > 0) {
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
