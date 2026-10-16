import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { Sentence, Source } from "./schema.ts";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const CACHE = join(ROOT, "sources", "cache");

export function loadSources(): Source[] {
  const raw = YAML.parse(readFileSync(join(ROOT, "sources", "sources.yaml"), "utf8")) as unknown[];
  return raw.map((s) => Source.parse(s));
}

export function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Cut the section a source is about out of the page text. */
export function extractSection(pageText: string, src: Source): string {
  const start = pageText.indexOf(src.section.start);
  if (start < 0) throw new Error(`${src.id}: start marker not found`);
  let end = pageText.length;
  if (src.section.end) {
    const e = pageText.indexOf(src.section.end, start + src.section.start.length);
    if (e < 0) throw new Error(`${src.id}: end marker not found`);
    end = e;
  }
  return pageText.slice(start, end).replace(/\s+\n/g, "\n").trim();
}

/**
 * Split into sentences. Lines are kept whole when they look like timeline entries ("30 August 2023 @ 08:43 UTC – ...");
 * prose is split on sentence-final punctuation followed by a space and a capital or digit.
 */
export function splitSentences(sourceId: string, section: string): Sentence[] {
  const out: string[] = [];
  for (const line of section.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    if (/^\d{1,2} \w+ \d{4} @ \d{2}:\d{2}/.test(line) || line.length < 120) {
      out.push(line);
      continue;
    }
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).map((p) => p.trim()).filter(Boolean);
    // "1." on its own is a list number, not a sentence: glue it to what follows.
    for (let i = 0; i < parts.length; i++) {
      if (/^\d+\.$/.test(parts[i]) && i + 1 < parts.length) {
        parts[i + 1] = `${parts[i]} ${parts[i + 1]}`;
        continue;
      }
      out.push(parts[i]);
    }
  }
  return out.map((text, i) => ({ id: `${sourceId}:S${i + 1}`, text }));
}

export function hasCache(src: Source): boolean {
  return existsSync(join(CACHE, `${src.id}.txt`));
}

export function sentencesFor(src: Source): Sentence[] {
  const cached = join(CACHE, `${src.id}.txt`);
  if (!existsSync(cached)) throw new Error(`${src.id}: not in sources/cache`);
  const section = extractSection(readFileSync(cached, "utf8"), src);
  if (src.sha256 && sha256(section) !== src.sha256) {
    throw new Error(`${src.id}: section text changed since it was recorded (sha256 mismatch)`);
  }
  return splitSentences(src.id, section);
}

/**
 * Every sentence by id. With the page cache present (sources/cache, not committed) this is the full text of each
 * section; without it, the sentences the cases actually use, from sources/excerpts.json, which is committed.
 */
export function sentenceIndex(): Map<string, string> {
  const m = new Map<string, string>();
  const excerpts = join(ROOT, "sources", "excerpts.json");
  for (const s of loadSources()) {
    if (hasCache(s)) for (const x of sentencesFor(s)) m.set(x.id, x.text);
    else if (existsSync(excerpts)) {
      const e = JSON.parse(readFileSync(excerpts, "utf8")) as Record<string, string>;
      for (const [id, text] of Object.entries(e)) if (id.startsWith(`${s.id}:`)) m.set(id, text);
    }
  }
  return m;
}

export function writeJSON(path: string, v: unknown): void {
  writeFileSync(path, JSON.stringify(v, null, 2) + "\n", "utf8");
}
