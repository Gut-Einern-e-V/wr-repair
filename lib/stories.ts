import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const storiesDirectory = path.join(process.cwd(), "content", "stories");

export type StoryBlock =
  | { type: "heading"; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] };

export type Story = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  readingTime: string;
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

function parseBlocks(body: string): StoryBlock[] {
  return body.split(/\r?\n\r?\n/).flatMap<StoryBlock>((section) => {
    const trimmed = section.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("## ")) return [{ type: "heading" as const, content: trimmed.slice(3) }];
    if (trimmed.startsWith("- ")) return [{ type: "list" as const, items: trimmed.split(/\r?\n/).map((item) => item.replace(/^- /, "")) }];
    return [{ type: "paragraph" as const, content: trimmed.replace(/\r?\n/g, " ") }];
  });
}

async function readStory(fileName: string): Promise<Story> {
  const source = await readFile(path.join(storiesDirectory, fileName), "utf8");
  const { metadata, body } = parseFrontmatter(source);
  const slug = fileName.replace(/\.md$/, "");
  if (!metadata.title || !metadata.summary || !metadata.category || !metadata.date || !metadata.readingTime) {
    throw new Error(`Story ${fileName} is missing required frontmatter.`);
  }
  return { slug, title: metadata.title, summary: metadata.summary, category: metadata.category, date: metadata.date, readingTime: metadata.readingTime, blocks: parseBlocks(body) };
}

export async function getStories() {
  const files = (await readdir(storiesDirectory)).filter((fileName) => fileName.endsWith(".md"));
  const stories = await Promise.all(files.map(readStory));
  return stories.sort((left, right) => right.date.localeCompare(left.date));
}

export async function getStory(slug: string) {
  return (await getStories()).find((story) => story.slug === slug);
}