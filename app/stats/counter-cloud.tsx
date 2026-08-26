"use client";

import { useEffect, useRef } from "react";
import { changedSlotIndices } from "@/lib/dashboard";
import { nrwOutline, projectToUnitSquare } from "@/lib/nrw-map";
import { cloudShapes, drawGlyph, outlineShape, samplePixels, type CloudShape } from "./cloud-sampling";

/**
 * Der Live-Zaehler als Punktwolke.
 *
 * Jede Ziffer besteht aus einigen hundert Punkten, die von einer Feder auf ihre
 * Position gezogen werden und dort leicht wabern. Daraus folgt das ganze
 * Verhalten:
 *
 * - Steigt der Zaehler, bekommen nur die Punkte der *geaenderten* Stellen einen
 *   Stoss nach aussen. Sie fliegen auseinander, und die Feder setzt sie zur
 *   neuen Ziffer zusammen. Unveraenderte Stellen stehen ruhig - genau das macht
 *   den Wechsel lesbar.
 * - Alle knapp 30 Sekunden bekommen alle Punkte gemeinsam ein anderes Ziel und
 *   die Wolke faellt kurz in eine Form (Landeskarte, Herz, Zahnrad, Schluessel),
 *   bevor sie zur Zahl zurueckkehrt.
 *
 * Die Schleife laeuft ausserhalb von React: stundenlanger Beamerbetrieb soll
 * keine 60 Renderdurchlaeufe pro Sekunde ausloesen.
 */

type Props = {
  /** Aktueller Stand; Aenderungen loesen die Explosion der neuen Stellen aus. */
  value: number;
  /** Zielerreichung: die Wolke wechselt auf die Signalfarbe. */
  reached: boolean;
  /** Feier laeuft: die Wolke wird im Takt neu aufgeworfen. */
  celebrating: boolean;
  /** Im Vollbild darf die Wolke deutlich dichter werden. */
  fullscreen: boolean;
};

/** Abstand zwischen den Wuerfen waehrend der Feier. */
const CELEBRATION_BURST_MS = 1_700;

const MORPH_INTERVAL_MS = 27_000;
const MORPH_HOLD_MS = 4_600;
/** Erst nach dieser Zeit die erste Form zeigen, damit die Zahl zuerst ankommt. */
const MORPH_DELAY_MS = 12_000;

const TONE_BASE = "#f7f5f0";
const TONE_MINT = "#95d4bb";
const TONE_YELLOW = "#ffc432";

/** Mischung der Punktfarben: ueberwiegend hell, damit die Zahl lesbar bleibt. */
const toneSets = {
  normal: [TONE_BASE, TONE_BASE, TONE_BASE, TONE_MINT, TONE_YELLOW],
  reached: [TONE_YELLOW, TONE_YELLOW, TONE_YELLOW, TONE_BASE, TONE_MINT],
};

const MAX_PARTICLES = 7_000;
/** Breite einer Stelle als Anteil der Schriftgroesse. */
const DIGIT_ADVANCE = 0.62;
const SEPARATOR_ADVANCE = 0.3;
/** Ein Trennpunkt braucht deutlich weniger Masse als eine Ziffer. */
const SEPARATOR_SHARE = 0.22;

const nrwUnit = nrwOutline.map(projectToUnitSquare);

export function CounterCloud({ value, reached, celebrating, fullscreen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const valueRef = useRef(value);
  const reachedRef = useRef(reached);
  const celebratingRef = useRef(celebrating);
  const densityRef = useRef(fullscreen);

  useEffect(() => {
    valueRef.current = value;
    reachedRef.current = reached;
    celebratingRef.current = celebrating;
    densityRef.current = fullscreen;
  }, [value, reached, celebrating, fullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) return;
    const context = canvasContext;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shapes: CloudShape[] = [outlineShape("Nordrhein-Westfalen", nrwUnit), ...cloudShapes];

    let width = 0;
    let height = 0;

    // --- Partikelspeicher ---------------------------------------------------
    const positionX = new Float32Array(MAX_PARTICLES);
    const positionY = new Float32Array(MAX_PARTICLES);
    const velocityX = new Float32Array(MAX_PARTICLES);
    const velocityY = new Float32Array(MAX_PARTICLES);
    /** Ziel innerhalb der Zahl. */
    const digitX = new Float32Array(MAX_PARTICLES);
    const digitY = new Float32Array(MAX_PARTICLES);
    /** Ziel innerhalb der aktuellen Sonderform. */
    const shapeX = new Float32Array(MAX_PARTICLES);
    const shapeY = new Float32Array(MAX_PARTICLES);
    const phase = new Float32Array(MAX_PARTICLES);
    const drift = new Float32Array(MAX_PARTICLES);
    const tone = new Uint8Array(MAX_PARTICLES);
    /** Restenergie einer Explosion, 1 = gerade gezuendet. */
    const chaos = new Float32Array(MAX_PARTICLES);
    let count = 0;

    let text = "";
    /** Startindex, Laenge und Mittelpunkt je Stelle - so ist jede adressierbar. */
    let slotStart: number[] = [];
    let slotLength: number[] = [];
    let slotCenterX: number[] = [];
    let fontSize = 0;
    let pointSize = 2;

    function advanceFor(character: string) {
      return fontSize * (character === "." ? SEPARATOR_ADVANCE : DIGIT_ADVANCE);
    }

    /**
     * Abtastbox einer Stelle. Etwas breiter und hoeher als der Vorschub, damit
     * eine fette Ziffer nicht an den Raendern beschnitten wird.
     */
    function boxFor(character: string) {
      return {
        boxWidth: advanceFor(character) + fontSize * 0.14,
        boxHeight: Math.min(height, fontSize * 1.4),
      };
    }

    /** Legt die Ziele einer Stelle neu fest, ohne die anderen anzufassen. */
    function fillSlotTargets(slot: number, character: string) {
      const { boxWidth, boxHeight } = boxFor(character);
      const wanted = slotLength[slot];
      const sampled = samplePixels(drawGlyph(character, fontSize, boxWidth, boxHeight), boxWidth, boxHeight, wanted);
      const left = slotCenterX[slot] - boxWidth / 2;
      const top = height / 2 - boxHeight / 2;

      for (let point = 0; point < wanted; point += 1) {
        const target = slotStart[slot] + point;
        if (target >= count) break;
        digitX[target] = left + sampled.xs[point];
        digitY[target] = top + sampled.ys[point];
      }
    }

    /** Baut die Wolke fuer `next` komplett neu auf. */
    function build(next: string) {
      const characters = [...next];
      const digitCount = characters.filter((character) => character !== ".").length;

      // Schriftgroesse: begrenzt durch die Hoehe und durch die Breite aller Stellen.
      const advanceRatio = characters.reduce(
        (sum, character) => sum + (character === "." ? SEPARATOR_ADVANCE : DIGIT_ADVANCE),
        0,
      );
      fontSize = Math.max(24, Math.min(height * 0.94, (width * 0.98) / Math.max(DIGIT_ADVANCE, advanceRatio)));
      pointSize = Math.max(1.4, fontSize / 54);

      // Punkte pro Ziffer: an der Flaeche orientiert, damit eine 4K-Wand dichter
      // wird als ein Laptop, ohne das Budget zu sprengen. Im Vollbild ist die
      // Zahl das einzige Bild - da lohnt die dichtere Wolke.
      const cap = densityRef.current ? 1_400 : 900;
      const perDigit = Math.max(
        90,
        Math.min(cap, Math.round((width * height) / 110), Math.floor(MAX_PARTICLES / Math.max(1, digitCount))),
      );

      const advances = characters.map(advanceFor);
      const totalWidth = advances.reduce((sum, advance) => sum + advance, 0);

      slotStart = [];
      slotLength = [];
      slotCenterX = [];
      count = 0;

      let left = (width - totalWidth) / 2;
      characters.forEach((character, index) => {
        const wanted = Math.min(
          character === "." ? Math.round(perDigit * SEPARATOR_SHARE) : perDigit,
          MAX_PARTICLES - count,
        );
        slotStart.push(count);
        slotLength.push(wanted);
        slotCenterX.push(left + advances[index] / 2);
        count += wanted;
        left += advances[index];
      });

      for (let index = 0; index < count; index += 1) {
        phase[index] = Math.random() * Math.PI * 2;
        drift[index] = 0.4 + Math.random() * 1.3;
        tone[index] = Math.floor(Math.random() * toneSets.normal.length);
      }

      characters.forEach((character, slot) => fillSlotTargets(slot, character));
      text = next;
    }

    /** Setzt die Punkte auf ihr Ziel, ohne Einflug - fuer den ersten Aufbau. */
    function settle() {
      for (let index = 0; index < count; index += 1) {
        positionX[index] = digitX[index];
        positionY[index] = digitY[index];
        velocityX[index] = 0;
        velocityY[index] = 0;
        chaos[index] = 0;
      }
    }

    /** Zuendet die Punkte einer Stelle nach aussen. */
    function explodeSlot(slot: number) {
      if (reduceMotion) return;
      const from = slotStart[slot];
      const to = Math.min(from + slotLength[slot], count);
      const originX = slotCenterX[slot];
      const originY = height / 2;

      for (let index = from; index < to; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2.4 + Math.random() * 7.5) * (pointSize / 2.2);
        // Anteil der aktuellen Auslenkung: Punkte am Rand der Ziffer fliegen
        // nach aussen weiter als die in der Mitte.
        velocityX[index] = Math.cos(angle) * speed + (positionX[index] - originX) * 0.07;
        velocityY[index] = Math.sin(angle) * speed + (positionY[index] - originY) * 0.07;
        chaos[index] = 1;
      }
    }

    const resize = () => {
      const nextWidth = Math.max(1, canvas.clientWidth);
      const nextHeight = Math.max(1, canvas.clientHeight);
      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      build(valueRef.current.toLocaleString("de-DE"));
      settle();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // --- Sonderformen -------------------------------------------------------
    let morphing = false;
    let morphUntil = 0;
    let nextMorphAt = performance.now() + MORPH_DELAY_MS;
    let shapeIndex = 0;

    function kickAll(energy: number, force = 2.4) {
      for (let index = 0; index < count; index += 1) {
        chaos[index] = energy;
        const angle = Math.random() * Math.PI * 2;
        velocityX[index] += Math.cos(angle) * force;
        velocityY[index] += Math.sin(angle) * force;
      }
    }

    function startMorph(now: number) {
      const shape = shapes[shapeIndex % shapes.length];
      shapeIndex += 1;

      const sampled = samplePixels(
        (drawContext) => shape.draw(drawContext, width, height),
        width,
        height,
        count,
      );
      for (let index = 0; index < count; index += 1) {
        shapeX[index] = sampled.xs[index];
        shapeY[index] = sampled.ys[index];
      }

      kickAll(0.55);
      morphing = true;
      morphUntil = now + MORPH_HOLD_MS;
    }

    function endMorph(now: number) {
      morphing = false;
      nextMorphAt = now + MORPH_INTERVAL_MS;
      kickAll(0.5);
    }

    // --- Feier --------------------------------------------------------------
    // Waehrend der Feier wird die Wolke im Takt neu aufgeworfen. Sie faellt jedes
    // Mal in die Zahl zurueck, also bleibt der Stand die ganze Zeit lesbar.
    let wasCelebrating = false;
    let nextBurstAt = 0;

    // --- Schleife -----------------------------------------------------------
    let frame = 0;
    let start = performance.now();

    function draw(now: number) {
      const time = (now - start) / 1000;
      const current = valueRef.current.toLocaleString("de-DE");

      if (current !== text) {
        if ([...current].length !== [...text].length) {
          // Eine Stelle kommt hinzu: die ganze Zahl wird neu verteilt und
          // zusammengesetzt, weil sich alle Positionen verschieben.
          build(current);
          for (let slot = 0; slot < slotStart.length; slot += 1) explodeSlot(slot);
        } else {
          const characters = [...current];
          for (const slot of changedSlotIndices(text, current)) {
            fillSlotTargets(slot, characters[slot]);
            explodeSlot(slot);
          }
          text = current;
        }
      }

      const isCelebrating = celebratingRef.current;
      if (!reduceMotion && count > 0) {
        if (isCelebrating) {
          // Die Feier hat Vorrang: keine Sonderformen, dafuer Wuerfe im Takt.
          if (morphing) endMorph(now);
          if (!wasCelebrating || now >= nextBurstAt) {
            kickAll(1, 9);
            nextBurstAt = now + CELEBRATION_BURST_MS;
          }
          // Nach der Feier soll nicht sofort eine Form folgen.
          nextMorphAt = now + MORPH_INTERVAL_MS;
        } else if (!morphing && now >= nextMorphAt) startMorph(now);
        else if (morphing && now >= morphUntil) endMorph(now);
      }
      wasCelebrating = isCelebrating;

      const palette = reachedRef.current ? toneSets.reached : toneSets.normal;
      const wobble = reduceMotion ? 0 : Math.max(1.2, pointSize * 1.2);

      // Spuren: vorhandene Pixel werden transparenter statt uebermalt, damit der
      // Hintergrund des Panels durchscheint.
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "rgba(0, 0, 0, 0.3)";
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";

      for (let group = 0; group < palette.length; group += 1) {
        context.fillStyle = palette[group];
        for (let index = 0; index < count; index += 1) {
          if (tone[index] !== group) continue;

          const energy = chaos[index];
          if (energy > 0) chaos[index] = Math.max(0, energy - 0.016);

          const targetX = (morphing ? shapeX[index] : digitX[index]) + Math.sin(time * 0.6 * drift[index] + phase[index]) * wobble;
          const targetY = (morphing ? shapeY[index] : digitY[index]) + Math.cos(time * 0.52 * drift[index] + phase[index] * 1.6) * wobble;

          if (reduceMotion) {
            positionX[index] = targetX;
            positionY[index] = targetY;
          } else {
            // Waehrend der Explosion zieht die Feder kaum; erst wenn die Energie
            // abgebaut ist, setzt sich die Ziffer wieder zusammen.
            const stiffness = 0.058 * (1 - energy * 0.88);
            velocityX[index] = (velocityX[index] + (targetX - positionX[index]) * stiffness) * 0.87;
            velocityY[index] = (velocityY[index] + (targetY - positionY[index]) * stiffness) * 0.87;
            positionX[index] += velocityX[index];
            positionY[index] += velocityY[index];
          }

          const radius = pointSize * (1 + energy * 1.5);
          context.globalAlpha = 0.6 + (1 - energy) * 0.35;
          context.fillRect(positionX[index] - radius / 2, positionY[index] - radius / 2, radius, radius);
        }
      }

      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      // Nach einer Pause Zeitachse und Formuhr neu setzen, sonst faellt die
      // Wolke unmittelbar nach dem Aufwachen in die naechste Form.
      start = performance.now();
      nextMorphAt = performance.now() + MORPH_INTERVAL_MS;
      morphing = false;
      frame = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas className="counter-cloud-canvas" ref={canvasRef} aria-hidden="true" />;
}
