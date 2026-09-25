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

test("Book Index SEO gate has no invented default quality thresholds", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");
  const env = source(".env.example");

  for (const key of [
    "BOOK_INDEX_SEO_MIN_COMPOSITE_SOURCES",
    "BOOK_INDEX_SEO_MIN_MATCH_COVERAGE_PERCENT",
    "BOOK_INDEX_SEO_MIN_HISTORY_DAYS",
    "BOOK_INDEX_SEO_MIN_TURKEY_ITEMS",
  ]) {
    contains(gate, key, `${key} gate input`);
    contains(env, `${key}=""`, `${key} intentionally unset default`);
  }

  contains(gate, '"policy_incomplete"', "incomplete policy state");
  contains(gate, 'BOOK_INDEX_SEO_GATE_ENABLED === "true"', "explicit gate enable");
  contains(gate, 'BOOK_INDEX_SEO_PUBLISH_ENABLED === "true"', "separate publication enable");
});

test("Book Index SEO gate requires evidence and a separate publication switch", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");

  contains(gate, "observedCompositeSources", "source evidence");
  contains(gate, "matchCoveragePercent", "matching evidence");
  contains(gate, "historySpanDays", "history evidence");
  contains(gate, "turkeyItemCount", "Turkey result evidence");
  contains(gate, 'state === "eligible" && policy.publicationEnabled', "two-key publication gate");
  contains(gate, '"insufficient_evidence"', "evidence failure state");
});

test("Book Index SEO gate foundation does not publish routes or sitemap entries", () => {
  const sitemap = source("src/app/sitemap.ts");

  notContains(sitemap, "/en-cok-satanlar", "bestseller sitemap remains closed");
});
