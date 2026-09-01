import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { readImageDimensions } from "./image-dimensions";

const storiesDirectory = path.join(process.cwd(), "content", "stories");

/* Bilder der Geschichten liegen im Repository unter public/stories/ (Issue
   #60). Sie werden zusammen mit dem Text committet und mit demselben Deploy
   veroeffentlicht - ein zusaetzliches CMS oder ein Admin-Weg entfaellt damit,
   und ein Bild kann nicht verschwinden, waehrend der Text noch da ist. */
const publicDirectory = path.join(process.cwd(), "public");
const imagesDirectory = path.join(publicDirectory, "stories");

export type StoryImage = {
  /** Oeffentlicher Pfad, direkt fuer `next/image` verwendbar. */
  src: string;
  alt: string;
  /** Aus dem Dateikopf gelesen, damit beim Laden nichts springt. */
  width: number;
  height: number;
  caption: string | null;
  credit: string | null;
};

export type StoryBlock =
  | { type: "heading"; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] }
  | { type: "image"; image: StoryImage };

export type Story = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  readingTime: string;
  /** Aufmacher aus dem Frontmatter, oder null - dann greift die Markenbildwelt. */
  image: StoryImage | null;
  blocks: StoryBlock[];
};

function parseFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Story files must start with frontmatter.");

  const metadata = Object.fromEntries(match[1].split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf(":");
    return separator === -1 ? [] : [[line.slice(0, separator).trim(), line.slice(separator + 1).trim()]];
  }));
  return { metadata, body: match[2].trim() };
}

/**
 * Bildangabe einer Geschichte in einen oeffentlichen Pfad samt Massen aufloesen.
 *
 * Zwei Schreibweisen, beide zeigen ins Repository:
 *
 * - `bild.jpg` - die uebliche: die Datei liegt in public/stories/.
 * - `/photos/bild.jpg` - ein bereits vorhandenes Bild aus public/, damit die
 *   Markenbildwelt nicht dupliziert werden muss.
 *
 * Fremde Adressen (auch GitHub-Anhaenge) sind bewusst nicht erlaubt: Sie
 * braeuchten eine Freigabeliste in next.config.ts, koennten spaeter
 * verschwinden, waehrend der Text stehen bleibt, und laegen ausserhalb der
 * Versionsverwaltung. Da eine neue Geschichte ohnehin einen Commit und damit
 * einen Deploy braucht, kostet das Bild im Repository keinen Schritt extra.
 *
 * Fehlt die Datei, bricht der Build ab - genau wie bei fehlendem Frontmatter.
 * Ein stiller Platzhalter waere schlimmer: Der Tippfehler faellt dann erst
 * jemandem auf der fertigen Seite auf.
 */
async function readStoryImage(
  fileName: string,
  reference: string,
  alt: string,
  caption: string | null,
  credit: string | null,
): Promise<StoryImage> {
  const trimmed = reference.trim();
  const fromPublicRoot = trimmed.startsWith("/");
  const relative = trimmed.replace(/^\/+/, "");

  if (!relative || /^[a-z]+:\/\//i.test(trimmed)) {
    throw new Error(`Story ${fileName}: "${reference}" ist kein Bild aus diesem Repository. Erwartet wird ein Dateiname aus public/stories/ oder ein Pfad wie /photos/bild.jpg.`);
  }

  const base = fromPublicRoot ? publicDirectory : imagesDirectory;
  const absolute = path.join(base, relative);
  if (!absolute.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Story ${fileName}: Der Bildpfad "${reference}" zeigt aus dem Ordner heraus.`);
  }

  const shown = fromPublicRoot ? `public/${relative}` : `public/stories/${relative}`;
  let file: Buffer;
  try {
    file = await readFile(absolute);
  } catch {
    throw new Error(`Story ${fileName}: Das Bild ${shown} fehlt.`);
  }

  const size = readImageDimensions(file);
  if (!size) {
    throw new Error(`Story ${fileName}: Die Masse von ${shown} sind nicht lesbar. Erlaubt sind JPEG, PNG, WebP und GIF.`);
  }

  const url = relative.split(path.sep).join("/");
  return {
    src: fromPublicRoot ? `/${url}` : `/stories/${url}`,
    alt: alt.trim(),
    width: size.width,
    height: size.height,
    caption: caption?.trim() || null,
    credit: credit?.trim() || null,
  };
}

/* Ein Bild im Fliesstext, in Markdown-Schreibweise und allein in seinem Absatz:
   `![Alt-Text](datei.jpg)`, wahlweise mit Bildunterschrift in Anfuehrungszeichen. */
const inlineImagePattern = /^!\[([^\]]*)\]\(\s*([^\s)"]+)(?:\s+"([^"]*)")?\s*\)$/;

async function parseBlocks(fileName: string, body: string, defaultCredit: string | null): Promise<StoryBlock[]> {
  const sections = body.split(/\r?\n\r?\n/).map((section) => section.trim()).filter(Boolean);

  return Promise.all(sections.map(async (section): Promise<StoryBlock> => {
    const image = section.match(inlineImagePattern);
    if (image) {
      return { type: "image", image: await readStoryImage(fileName, image[2], image[1], image[3] ?? null, defaultCredit) };
    }
    if (section.startsWith("## ")) return { type: "heading", content: section.slice(3) };
    if (section.startsWith("- ")) return { type: "list", items: section.split(/\r?\n/).map((item) => item.replace(/^- /, "")) };
    return { type: "paragraph", content: section.replace(/\r?\n/g, " ") };
  }));
}

async function readStory(fileName: string): Promise<Story> {
  const source = await readFile(path.join(storiesDirectory, fileName), "utf8");
  const { metadata, body } = parseFrontmatter(source);
  const slug = fileName.replace(/\.md$/, "");
  if (!metadata.title || !metadata.summary || !metadata.category || !metadata.date || !metadata.readingTime) {
    throw new Error(`Story ${fileName} is missing required frontmatter.`);
  }

  /* Der Bildnachweis aus dem Frontmatter gilt fuer alle Bilder der Geschichte -
     sie stammen in aller Regel aus derselben Reparatur. */
  const credit = metadata.imageCredit ?? null;

  return {
    slug,
    title: metadata.title,
    summary: metadata.summary,
    category: metadata.category,
    date: metadata.date,
    readingTime: metadata.readingTime,
    image: metadata.image
      ? await readStoryImage(fileName, metadata.image, metadata.imageAlt ?? "", metadata.imageCaption ?? null, credit)
      : null,
    blocks: await parseBlocks(fileName, body, credit),
  };
}

/* README.md und Dateien mit fuehrendem Unterstrich sind Redaktionshinweise bzw.
   Entwuerfe und haben kein Frontmatter - sie duerfen den Build nicht abbrechen. */
function isStoryFile(fileName: string) {
  return fileName.endsWith(".md") && fileName !== "README.md" && !fileName.startsWith("_");
}

export async function getStories() {
  const files = (await readdir(storiesDirectory)).filter(isStoryFile);
  const stories = await Promise.all(files.map(readStory));
  return stories.sort((left, right) => right.date.localeCompare(left.date));
}

export async function getStory(slug: string) {
  return (await getStories()).find((story) => story.slug === slug);
}

export type StoryTeaser = Omit<Story, "blocks">;

/* Teaser fuer Uebersichten: ohne Textbloecke, damit die Startseite nur die
   Kachel-Daten in den RSC-Payload schreibt. Das Aufmacherbild bleibt drin - die
   Kacheln zeigen es. Die Markdown-Dateien werden beim Build gelesen, deshalb
   entsteht zur Laufzeit keine einzige Anfrage. */
export async function getStoryTeasers(): Promise<StoryTeaser[]> {
  return (await getStories()).map((story) => ({
    slug: story.slug,
    title: story.title,
    summary: story.summary,
    category: story.category,
    date: story.date,
    readingTime: story.readingTime,
    image: story.image,
  }));
}
