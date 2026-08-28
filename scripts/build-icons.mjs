/* Erzeugt alle App- und Shortcut-Icons aus einer Vorlage. Hintergrund, Safe-Zone
   und Farbzuordnung stehen in public/icons/README.md, der Anlass in Issue #43.

   Aufruf: node scripts/build-icons.mjs

   sharp kommt als Abhaengigkeit von Next mit. Falls der Import scheitert, hilft
   `npm i -D sharp` - das Skript laeuft nur bei Icon-Aenderungen, deshalb steht
   sharp nicht in package.json. */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("sharp fehlt. Einmalig installieren: npm i -D sharp");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Markenfarben aus app/globals.css.
const INK = "#101626";
const YELLOW = "#ffc432";
const PAPER = "#f7f5f0";
const MINT = "#95d4bb";
const RED = "#ec424c";
const BLUE = "#465eab";

// Geometrisches R, Bounding-Box (16,22) bis (48,55) im 64er-Raster.
const R_PATH =
  "M16 22h17c8 0 13 4.4 13 11.6 0 4.6-2.4 7.8-6.6 9.4L48 55H36l-7.4-11H27v11H16V22Z" +
  "m11 8v8h5.6c2.6 0 4.3-1.6 4.3-4s-1.7-4-4.3-4H27Z";
const BBOX = { w: 32, cx: 32, cy: 38.5 };

/* `width` ist die Zielbreite des R auf der 64er-Flaeche; der Rest ist reine
   Zentrierung. Genau die fehlte vorher, weshalb das R oben links hing und unten
   aus dem gelben Feld herauslief (Issue #43). */
function rTransform(width) {
  const scale = width / BBOX.w;
  const tx = +(32 - BBOX.cx * scale).toFixed(4);
  const ty = +(32 - BBOX.cy * scale).toFixed(4);
  return `translate(${tx} ${ty}) scale(${+scale.toFixed(6)})`;
}

const letterR = (color, width, extra = "") =>
  `<path fill="${color}" fill-rule="evenodd" d="${R_PATH}" transform="${rTransform(width)}"${extra}/>`;

/* Millimeterpapier: feine Linien alle 4 Einheiten, betonte alle 16. Rein
   dekorativ - bei kleinen Launcher-Groessen verschwimmt das Raster zu einer
   Textur, und genau so ist es gemeint. */
function graphPaper(fine, strong) {
  const lines = (step, skip) => {
    const parts = [];
    for (let v = step; v < 64; v += step) {
      if (skip && v % skip === 0) continue;
      parts.push(`M${v} 0V64`, `M0 ${v}H64`);
    }
    return parts.join("");
  };
  return (
    `<path d="${lines(4, 16)}" stroke="${fine}" stroke-width=".3" fill="none"/>` +
    `<path d="${lines(16)}" stroke="${strong}" stroke-width=".7" fill="none"/>`
  );
}

/* Inlay-Schatten: der Buchstabe wird mehrfach uebereinander gelegt, jede Lage
   ein Stueck weiter nach unten rechts versetzt und heller, alle ausser der
   untersten auf die urspruengliche Silhouette geklippt. Uebrig bleibt ein
   Schattensaum an der oberen linken Innenkante, waehrend der Umriss unveraendert
   bleibt. Licht von oben links plus Schatten dort heisst: die Form liegt tiefer
   als die Flaeche.

   Der Saum ist abgestuft statt einfarbig. Ein einfarbiges Band gleicher Breite
   liest sich als Seitenwand - der Buchstabe wirkt dann herausgestellt statt
   eingelegt; genau das war der erste Versuch. Vier Stufen ergeben einen weichen
   Verlauf, ohne feGaussianBlur, das je SVG-Renderer anders ausfaellt. */
const SEAM_STEPS = [
  { offset: 0, color: "#6d5210" },
  { offset: 0.35, color: "#8a6717" },
  { offset: 0.7, color: "#b8891f" },
  { offset: 1.05, color: null }, // null = Vollfarbe
];

function engravedR(color, width, id) {
  const t = rTransform(width);
  const layers = SEAM_STEPS.map(({ offset, color: tone }, i) => {
    const fill = tone ?? color;
    const shifted = `translate(${offset} ${offset}) ${t}`;
    const path = `<path fill="${fill}" fill-rule="evenodd" d="${R_PATH}" transform="${shifted}"/>`;
    // Die unterste Lage definiert die Silhouette und braucht keinen Clip.
    return i === 0 ? path : `<g clip-path="url(#${id}-clip)">${path}</g>`;
  });

  return (
    `<clipPath id="${id}-clip"><path d="${R_PATH}" fill-rule="evenodd" transform="${t}"/></clipPath>` +
    layers.join("")
  );
}

/* Die drei installierbaren Apps. `any` darf die Flaeche ausnutzen, weil
   Browser-Tab und iOS das ganze Quadrat zeigen. `maskable` bleibt in der Safe
   Zone, dem zentrierten Kreis mit 80% Kantenmass, den Android-Launcher
   ausstanzen. */
const APPS = {
  // Hauptseite: das Marken-R wie im .brand-mark im Header.
  app: {
    field: YELLOW,
    route: null,
    render: (width) => `<g transform="rotate(-2 32 32)">${letterR(INK, width)}</g>`,
  },
  // Eintragung: Plus, dieselbe Bedeutung wie beim Shortcut auf /mitmachen.
  eintragen: {
    field: MINT,
    route: "mitmachen",
    render: () =>
      `<path fill="${INK}" d="M24.5 10h15v44h-15z"/><path fill="${INK}" d="M10 24.5h44v15H10z"/>`,
  },
  /* Moderation: Marken-R invertiert, in Millimeterpapier gelegt und in die
     Flaeche gepraegt. Das unterscheidet es auf dem Startbildschirm sofort von
     der gelben Hauptseite und liest sich als Arbeitsseite, nicht als Website. */
  moderator: {
    field: INK,
    route: "moderator",
    render: (width, id) =>
      graphPaper("rgba(255,196,50,.10)", "rgba(255,196,50,.20)") +
      `<g transform="rotate(-2 32 32)">${engravedR(YELLOW, width, id)}</g>`,
  },
};

/* Shortcut-Icons fuer `shortcuts` in app/manifest.ts. Sie brauchen eigene
   Symbole: Android nimmt sonst das App-Icon, und dann sehen alle angepinnten
   Verknuepfungen auf dem Startbildschirm gleich aus. Android maskiert auch
   diese Icons immer rund - eine `any`-Variante gibt es hier nicht, deshalb
   bleibt jedes Symbol innerhalb der Safe Zone. */
const SHORTCUTS = {
  /* Plus: eintragen. Arme bis 22 vom Mittelpunkt, Aussenecke 23,2. Ohne `route`:
     /mitmachen ist eine eigene App, ihr apple-icon kommt schon aus APPS. */
  "shortcut-eintragen": {
    field: MINT,
    route: null,
    render: () =>
      `<path fill="${INK}" d="M24.5 10h15v44h-15z"/><path fill="${INK}" d="M10 24.5h44v15H10z"/>`,
  },
  // Drei steigende Balken: Live-Stand. Aussenecke 21,3.
  "shortcut-stand": {
    field: RED,
    route: "stats",
    render: () => `<path fill="${PAPER}" d="M16 40h8v6h-8zm12-8h8v14h-8zm12-10h8v24h-8z"/>`,
  },
  // Kartennadel: Repair Cafe finden. Spitze 18, Scheitel 20.
  "shortcut-cafe": {
    field: BLUE,
    route: "repair-cafes",
    render: () =>
      `<path fill="${PAPER}" d="M32 50s14-16 14-24a14 14 0 1 0-28 0c0 8 14 24 14 24Z"/>` +
      `<circle cx="32" cy="26" r="5" fill="${INK}"/>`,
  },
};

const wrap = (field, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${field}"/>
  ${body}
</svg>
`;

const writeSvg = (svg, ...parts) => writeFile(path.join(root, ...parts), svg);
const writePng = (svg, size, ...parts) =>
  sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, ...parts));

await mkdir(path.join(root, "public/icons"), { recursive: true });

for (const [key, { field, route, render }] of Object.entries(APPS)) {
  const any = wrap(field, render(40, `${key}-any`));
  const maskable = wrap(field, render(34, `${key}-mask`));
  const name = key === "app" ? "icon" : `${key}-icon`;

  // Browser-Tab der Hauptseite liest app/icon.svg direkt.
  if (key === "app") await writeSvg(any, "app", "icon.svg");
  else await writeSvg(any, "public", "icons", `${name}.svg`);

  await writeSvg(maskable, "public", "icons", `${name}-maskable.svg`);
  for (const size of [192, 512]) {
    await writePng(any, size, "public", "icons", `${name}-${size}.png`);
    await writePng(maskable, size, "public", "icons", `${name}-maskable-${size}.png`);
  }

  /* iOS rundet nur die Ecken ab und kennt kein `maskable`, nimmt aber das
     apple-touch-icon der offenen Seite. Ohne eigenes Icon je Route waere jeder
     Pin das gleiche R. `apple-icon` reicht - der Browser-Tab soll ueberall das
     Marken-R behalten, deshalb kein zusaetzliches `icon` je Route. */
  const applePath = route ? ["app", route, "apple-icon.png"] : ["app", "apple-icon.png"];
  await writePng(wrap(field, render(38, `${key}-apple`)), 180, ...applePath);
}

for (const [name, { field, route, render }] of Object.entries(SHORTCUTS)) {
  const svg = wrap(field, render());
  await writeSvg(svg, "public", "icons", `${name}.svg`);
  await writePng(svg, 192, "public", "icons", `${name}-192.png`);
  // Auf iOS ersetzt das Pin-Icon der Route den Shortcut, den es dort nicht gibt.
  if (route) await writePng(svg, 180, "app", route, "apple-icon.png");
}

console.log("Icons neu gebaut.");
