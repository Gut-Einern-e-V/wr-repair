/**
 * Punktvorlagen fuer die Zaehlerwolke.
 *
 * Ziffern und Sonderformen werden nicht analytisch beschrieben, sondern einmal
 * auf eine unsichtbare Canvas gezeichnet und anschliessend abgetastet. Damit
 * gilt fuer beide derselbe Weg: Was gezeichnet werden kann, kann auch als
 * Punktwolke dargestellt werden - unabhaengig von Schriftart und Hinting.
 *
 * Reine Browser-Nutzung: Die Funktionen brauchen ein `document`.
 */

/** Schriftstapel des Projekts, hier als Canvas-Wert. */
export const cloudFontStack = '"Nunito", "Segoe UI", system-ui, sans-serif';

export type SampleTarget = { xs: Float32Array; ys: Float32Array };

/** Wiederverwendete Abtast-Canvas; eine pro Seite genuegt. */
let scratch: HTMLCanvasElement | null = null;

function scratchContext(width: number, height: number) {
  scratch ??= document.createElement("canvas");
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width;
    scratch.height = height;
  }
  const context = scratch.getContext("2d", { willReadFrequently: true });
  if (context) context.clearRect(0, 0, width, height);
  return context;
}

/**
 * Tastet die deckenden Pixel einer Zeichnung ab und liefert genau `wanted`
 * Punkte.
 *
 * Die Schrittweite richtet sich nach der gewuenschten Menge: Ein Raster mit
 * etwa der sechsfachen Zahl an Kandidaten liefert genug Auswahl fuer eine
 * gleichmaessige Verteilung, ohne die ganze Flaeche Pixel fuer Pixel zu lesen.
 * Reichen die Kandidaten nicht, werden Punkte mehrfach belegt - besser eine
 * doppelt besetzte Stelle als eine Luecke in der Ziffer.
 */
export function samplePixels(
  draw: (context: CanvasRenderingContext2D) => void,
  width: number,
  height: number,
  wanted: number,
): SampleTarget {
  const xs = new Float32Array(wanted);
  const ys = new Float32Array(wanted);
  if (wanted <= 0) return { xs, ys };

  const boxWidth = Math.max(1, Math.round(width));
  const boxHeight = Math.max(1, Math.round(height));
  const context = scratchContext(boxWidth, boxHeight);
  if (!context) return { xs, ys };

  context.save();
  draw(context);
  context.restore();

  const { data } = context.getImageData(0, 0, boxWidth, boxHeight);
  const step = Math.max(1, Math.floor(Math.sqrt((boxWidth * boxHeight) / (wanted * 6))));

  const candidateX: number[] = [];
  const candidateY: number[] = [];
  for (let y = 0; y < boxHeight; y += step) {
    for (let x = 0; x < boxWidth; x += step) {
      if (data[(y * boxWidth + x) * 4 + 3] > 110) {
        candidateX.push(x);
        candidateY.push(y);
      }
    }
  }

  if (candidateX.length === 0) return { xs, ys };

  // Teilweises Fisher-Yates: zieht ohne Wiederholung, solange es reicht.
  const order = new Uint32Array(candidateX.length);
  for (let index = 0; index < order.length; index += 1) order[index] = index;

  for (let index = 0; index < wanted; index += 1) {
    if (index < order.length) {
      const pick = index + Math.floor(Math.random() * (order.length - index));
      const swap = order[index];
      order[index] = order[pick];
      order[pick] = swap;
    }
    const source = order[index % order.length];
    // Halbe Schrittweite Streuung, sonst sieht man das Abtastraster.
    xs[index] = candidateX[source] + (Math.random() - 0.5) * step;
    ys[index] = candidateY[source] + (Math.random() - 0.5) * step;
  }

  return { xs, ys };
}

/** Zeichnet ein einzelnes Zeichen mittig in eine Box. */
export function drawGlyph(character: string, fontPx: number, boxWidth: number, boxHeight: number) {
  return (context: CanvasRenderingContext2D) => {
    context.fillStyle = "#fff";
    context.font = `800 ${fontPx}px ${cloudFontStack}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(character, boxWidth / 2, boxHeight / 2);
  };
}

/**
 * Sonderformen, in die die Wolke zwischendurch faellt.
 *
 * Alle Formen zeichnen in eine Box und werden anschliessend abgetastet, also
 * genuegt es, sie aus Grundformen zusammenzusetzen. Loecher entstehen ueber
 * `destination-out`, weil das guenstiger ist als zusammengesetzte Pfade.
 */
export type CloudShape = { name: string; draw: (context: CanvasRenderingContext2D, width: number, height: number) => void };

function centeredBox(width: number, height: number) {
  const size = Math.min(width, height) * 0.92;
  return { size, left: (width - size) / 2, top: (height - size) / 2 };
}

const heart: CloudShape = {
  name: "Herz",
  draw: (context, width, height) => {
    const { size, left, top } = centeredBox(width, height);
    context.fillStyle = "#fff";
    context.beginPath();
    // Parametrische Herzkurve; y ist gespiegelt, weil die Canvas nach unten waechst.
    for (let step = 0; step <= 220; step += 1) {
      const t = (step / 220) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const pointX = left + size / 2 + (x / 34) * size;
      const pointY = top + size / 2 - (y / 34) * size;
      if (step === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    }
    context.closePath();
    context.fill();
  },
};

const gear: CloudShape = {
  name: "Zahnrad",
  draw: (context, width, height) => {
    const { size, left, top } = centeredBox(width, height);
    const centerX = left + size / 2;
    const centerY = top + size / 2;
    const outer = size * 0.46;
    const teeth = 12;

    context.fillStyle = "#fff";
    context.beginPath();
    for (let step = 0; step <= teeth * 4; step += 1) {
      const angle = (step / (teeth * 4)) * Math.PI * 2;
      // Vier Stuetzpunkte pro Zahn ergeben die typische Kastenform.
      const radius = step % 4 === 0 || step % 4 === 1 ? outer : outer * 0.82;
      const pointX = centerX + Math.cos(angle) * radius;
      const pointY = centerY + Math.sin(angle) * radius;
      if (step === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    }
    context.closePath();
    context.fill();

    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(centerX, centerY, size * 0.17, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "source-over";
  },
};

const wrench: CloudShape = {
  name: "Schraubenschlüssel",
  draw: (context, width, height) => {
    const { size, left, top } = centeredBox(width, height);
    const centerX = left + size / 2;
    const centerY = top + size / 2;

    context.translate(centerX, centerY);
    context.rotate(-Math.PI / 4);
    context.fillStyle = "#fff";

    // Griff.
    const handleWidth = size * 0.15;
    context.beginPath();
    context.roundRect(-handleWidth / 2, -size * 0.16, handleWidth, size * 0.6, handleWidth / 2);
    context.fill();

    // Maul: Ring, aus dem ein Keil und die Mitte entfernt werden.
    const ringRadius = size * 0.2;
    const ringY = -size * 0.22;
    context.beginPath();
    context.arc(0, ringY, ringRadius, 0, Math.PI * 2);
    context.fill();

    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(0, ringY, ringRadius * 0.52, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(0, ringY);
    context.arc(0, ringY, ringRadius * 1.2, -Math.PI * 0.86, -Math.PI * 0.14);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = "source-over";
  },
};

/**
 * Karte des Landes als Punktwolke.
 *
 * Die Kontur kommt aus derselben Quelle wie die Karte auf der Buehne, damit
 * beide Darstellungen dieselbe Silhouette zeigen.
 */
export function outlineShape(name: string, outline: { x: number; y: number }[]): CloudShape {
  return {
    name,
    draw: (context, width, height) => {
      const { size, left, top } = centeredBox(width, height);
      context.fillStyle = "#fff";
      context.beginPath();
      outline.forEach((point, index) => {
        const pointX = left + point.x * size;
        const pointY = top + point.y * size;
        if (index === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      });
      context.closePath();
      context.fill();
    },
  };
}

export const cloudShapes: CloudShape[] = [heart, gear, wrench];
