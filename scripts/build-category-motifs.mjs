/* Erzeugt Platzhalter-Motive fuer die Reparaturkategorien.

   Aufruf: node scripts/build-category-motifs.mjs

   Die endgueltigen Motive sind gerenderte Gegenstaende (siehe
   public/categories/README.md). Bis sie vorliegen, fuellt dieses Skript die
   Ploetze mit dem Strichzeichen derselben Kategorie - in genau der Groesse und
   Ausrichtung, die ein echtes Motiv haben muss. Damit steht die Bildstrecke
   vollstaendig, und ein spaeterer Austausch aendert nur die Grafik in der
   Datei, kein Layout und keinen Code.

   Die Zeichen kommen aus components/category-pictogram-shapes.json, also aus
   derselben Quelle wie die Zeichen in der Oberflaeche. Das Skript ist ein
   reines Node-Skript und kann das TSX daneben nicht lesen - deshalb liegen sie
   als JSON.

   sharp kommt als Abhaengigkeit von Next mit. Falls der Import scheitert, hilft
   `npm i -D sharp` - das Skript laeuft nur bei Motiv-Aenderungen, deshalb steht
   sharp nicht in package.json (wie bei scripts/build-icons.mjs). */
import { readFile, writeFile, mkdir } from "node:fs/promises";
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

// Markenfarbe aus app/globals.css.
const INK = "#101626";

/* Kantenlaenge der Datei. Muss zu MOTIF_SOURCE_SIZE in lib/category-motifs.ts
   passen, sonst rechnet `next/image` mit falschen Massen. */
const SIZE = 512;

/* Die Motivplatte zeigt ein Motiv auf 84 % ihrer Breite, das Strichzeichen im
   Rueckfall aber auf 56 % (siehe `.category-motif` in app/globals.css). Damit
   der Platzhalter genauso gross erscheint wie der Rueckfall, wird das Zeichen
   auf 56/84 der Flaeche gezeichnet und der Rest bleibt durchsichtig. */
const CONTENT = Math.round(SIZE * (56 / 84));

function pictogramSvg(shape) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${CONTENT}" height="${CONTENT}"`
    + ` fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`
    + `${shape}</svg>`,
  );
}

const shapes = JSON.parse(await readFile(path.join(root, "components", "category-pictogram-shapes.json"), "utf8"));
const outputDirectory = path.join(root, "public", "categories");
await mkdir(outputDirectory, { recursive: true });

for (const [category, shape] of Object.entries(shapes)) {
  // Durchsichtige Flaeche, Zeichen mittig darauf: Den hellen Grund bringt die
  // Platte in der Oberflaeche mit, nicht die Datei.
  const png = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: pictogramSvg(shape), gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(outputDirectory, `${category}.png`), png);
  console.log(`public/categories/${category}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

console.log(`\n${Object.keys(shapes).length} Platzhalter erzeugt. Ersetzen: siehe public/categories/README.md`);
