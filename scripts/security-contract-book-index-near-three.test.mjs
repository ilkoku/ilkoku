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

test("Book Index readiness exposes read-only source-pair and near-3 diagnostics", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const matching = source("src/lib/book-index/matching.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(readiness, "sourcePairOverlapMatrix", "source-pair overlap matrix");
  contains(readiness, "sharedBookCount", "pair shared-book count");
  contains(readiness, "nearThreeSourceCount", "near-3 candidate count");
  contains(readiness, "nearThreeSourceSamples", "near-3 candidate samples");
  contains(readiness, "absentObservedSourceCodes", "missing observed source evidence");
  contains(readiness, "detail.sourceCodes.size === 2", "near-3 scope stays exactly two current sources");
  contains(sources, "export const TURKEY_INDEX_MIN_SOURCES = 3;", "3-source eligibility remains unchanged");
  notContains(matching, "nearThreeSourceSamples", "diagnostics do not mutate matching");
  notContains(matching, "sourcePairOverlapMatrix", "pair matrix does not mutate matching");
});
