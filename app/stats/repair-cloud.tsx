"use client";

import { useEffect, useRef } from "react";
import { hashString, nrwOutline, positionForId, projectToUnitSquare, seededRandom, type OriginCell } from "@/lib/nrw-map";

/**
 * Punktwolke aller Reparaturen ueber einer stilisierten NRW-Karte.
 *
 * Statt zehntausend DOM-Knoten oder Bildern zeichnet eine einzige Canvas alle
 * Punkte. Die Daten liegen in typisierten Arrays, damit auch bei 10.000
 * Punkten pro Frame nichts allokiert wird. Neue Freigaben "landen" sichtbar
 * mit einem Ring, und alle 20 Sekunden zoomt die Kamera auf einen Punkt,
 * waehrend darueber der Spotlight das zugehoerige Bild zeigt.
 */

export type CloudFocus = { id: string } | null;

type Props = {
  /** Gesamtzahl der freigegebenen Reparaturen (bestimmt die Punktdichte). */
  total: number;
  /** IDs, die seit dem letzten Render neu hinzugekommen sind. */
  arrivals: string[];
  /** Punkt, auf den die Kamera zoomen soll. */
  focusId: string | null;
  /** Zielerreichung: loest einen Konfetti-Ausbruch aus. */
  celebrating: boolean;
  /** Anonymisierte Herkunftszellen; leer heisst symbolische Verteilung. */
  cells: OriginCell[];
};

/** CI-Palette; die Punkte wandern langsam durch diese Farben. */
const palette = ["#ffc432", "#95d4bb", "#00b072", "#ec424c", "#465eab", "#f7f5f0"];

/** Mehr Punkte bringen optisch nichts, kosten aber Rechenzeit. */
const MAX_PARTICLES = 9_000;

const outlineUnit = nrwOutline.map(projectToUnitSquare);

export function RepairCloud({ total, arrivals, focusId, celebrating, cells }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Die Animationsschleife laeuft ausserhalb von React und liest den aktuellen
  // Stand deshalb aus einer Ref, die nach jedem Render nachgezogen wird.
  const stateRef = useRef({ total, focusId, celebrating });
  useEffect(() => {
    stateRef.current.total = total;
    stateRef.current.focusId = focusId;
    stateRef.current.celebrating = celebrating;
  }, [total, focusId, celebrating]);

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
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

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
    const ids: string[] = [];
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
      ids[index] = id;
      indexById.set(id, index);
      count += 1;
    }

    // --- Kamera -----------------------------------------------------------
    const camera = { x: 0.5, y: 0.5, zoom: 1 };
    const target = { x: 0.5, y: 0.5, zoom: 1 };

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

    let frame = 0;
    let lastFocus: string | null = null;
    let start = performance.now();

    function project(unitX: number, unitY: number, scale: number) {
      return {
        x: width / 2 + (unitX - camera.x) * scale,
        y: height / 2 + (unitY - camera.y) * scale,
      };
    }

    function draw(now: number) {
      const time = (now - start) / 1000;
      const desired = Math.min(stateRef.current.total, MAX_PARTICLES);

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

      const scale = Math.min(width, height) * 0.92 * camera.zoom;

      // Nachleuchtender Hintergrund: erzeugt weiche Spuren auf dem Beamer.
      context.fillStyle = reduceMotion ? "#080b14" : "rgba(8, 11, 20, 0.34)";
      context.fillRect(0, 0, width, height);

      // Kontur.
      context.beginPath();
      outlineUnit.forEach((point, index) => {
        const screen = project(point.x, point.y, scale);
        if (index === 0) context.moveTo(screen.x, screen.y);
        else context.lineTo(screen.x, screen.y);
      });
      context.closePath();
      context.fillStyle = "rgba(70, 94, 171, 0.10)";
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = "rgba(149, 212, 187, 0.45)";
      context.stroke();

      // Punkte, nach Farbe gruppiert, damit fillStyle selten wechselt.
      const shift = Math.floor(time / 6);
      const wobble = reduceMotion ? 0 : 1;
      for (let group = 0; group < palette.length; group += 1) {
        context.fillStyle = palette[(group + shift) % palette.length];
        for (let index = 0; index < count; index += 1) {
          if (tone[index] !== group) continue;

          const swing = wobble * 0.0032 * drift[index];
          const unitX = baseX[index] + Math.sin(time * 0.35 * drift[index] + phase[index]) * swing;
          const unitY = baseY[index] + Math.cos(time * 0.29 * drift[index] + phase[index] * 1.7) * swing;
          const screen = project(unitX, unitY, scale);
          if (screen.x < -20 || screen.y < -20 || screen.x > width + 20 || screen.y > height + 20) continue;

          let radius = size[index] * Math.min(camera.zoom, 2.2);
          if (landing[index] > 0) {
            landing[index] = Math.max(0, landing[index] - 0.006);
            radius += landing[index] * 9;
            context.globalAlpha = 0.55 + landing[index] * 0.45;
          } else {
            context.globalAlpha = 0.72;
          }

          context.fillRect(screen.x - radius / 2, screen.y - radius / 2, radius, radius);
        }
      }
      context.globalAlpha = 1;

      // Landeringe der Neuzugaenge.
      context.lineWidth = 2;
      for (let index = 0; index < count; index += 1) {
        if (landing[index] <= 0) continue;
        const screen = project(baseX[index], baseY[index], scale);
        const progress = 1 - landing[index];
        context.beginPath();
        context.arc(screen.x, screen.y, 6 + progress * 60, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 196, 50, ${landing[index] * 0.7})`;
        context.stroke();
      }

      // Fokuspunkt hervorheben.
      const focusIndex = focus ? indexById.get(focus) : undefined;
      if (focusIndex !== undefined) {
        const screen = project(baseX[focusIndex], baseY[focusIndex], scale);
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

      frame = requestAnimationFrame(draw);
    }

    start = performance.now();
    frame = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        start = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas className="cloud-canvas" ref={canvasRef} aria-hidden="true" />;
}
