import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("Penguen stays research-only until a native ranked book source is verified", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const note = source("docs/operations/book-index-penguen-research.md");

  contains(
    sources,
    'code: "penguen",\n    name: "Penguen Kitabevi",\n    market: "TR",\n    countryCode: "TR",\n    baseUrl: "https://penguenkitabevi.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "researching"',
    "Penguen registry remains researching",
  );

  notContains(lists, 'sourceCode: "penguen"', "no Penguen ranked list is activated");
  notContains(collector, "penguenBookIndexAdapter", "no Penguen collector is activated");

  contains(note, "71 book records", "verified public catalog size evidence");
  contains(note, "12 records per page", "verified pagination evidence");
  contains(note, "did **not** expose a native book ranking control", "no native rank finding");
  contains(note, "must **not** be relabeled as a sales or", "no synthetic catalog rank rule");
  contains(note, "bestseller rank.", "no synthetic catalog rank meaning");
  contains(note, "Penguen remains `researching`", "research-only product decision");
});
