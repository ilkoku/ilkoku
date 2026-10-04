import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("HTML file path is required");

const html = readFileSync(file, "utf8");
const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
const head = headMatch?.[1] ?? "";

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
    out[match[1].toLowerCase()] = match[2];
  }
  return out;
}

function metaValues(source, name) {
  return [...source.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attrs(match[0]))
    .filter((item) => (item.name ?? "").toLowerCase() === name)
    .map((item) => item.content ?? "");
}

function canonicalValues(source) {
  return [...source.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attrs(match[0]))
    .filter((item) => (item.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))
    .map((item) => item.href ?? "");
}

function titles(source) {
  return [...source.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)]
    .map((match) => match[1].replace(/&amp;/g, "&").trim());
}

console.log(JSON.stringify({
  bytes: Buffer.byteLength(html),
  fullTitles: titles(html),
  headTitles: titles(head),
  fullDescriptions: metaValues(html, "description"),
  headDescriptions: metaValues(head, "description"),
  canonicals: canonicalValues(html),
  headCanonicals: canonicalValues(head),
  robots: metaValues(html, "robots"),
  googlebot: metaValues(html, "googlebot"),
  titleTagCount: (html.match(/<title\b/gi) ?? []).length,
  descriptionTagCount: metaValues(html, "description").length,
  headPresent: Boolean(headMatch),
  nextFlightDataPresent: html.includes("__next_f"),
}, null, 2));
