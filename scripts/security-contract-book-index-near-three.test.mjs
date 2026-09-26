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
  contains(readiness, "historicalThirdSourceCodes", "historical third-source summary");
  contains(readiness, "historicalThirdSourceEvidence", "historical third-source evidence");
  contains(readiness, "nearThreeWithHistoricalThirdSourceCount", "historical near-3 count");
  contains(readiness, "bookIndexExternalBook.findMany", "read-only historical external-book lookup");
  contains(readiness, "master_book: 3", "master-book history evidence priority");
  contains(readiness, "isbn13: 2", "ISBN history evidence priority");
  contains(readiness, "normalized_identity: 1", "normalized identity history evidence priority");
  contains(readiness, "detail.sourceCodes.size === 2", "near-3 scope stays exactly two current sources");
  contains(sources, "export const TURKEY_INDEX_MIN_SOURCES = 3;", "3-source eligibility remains unchanged");
  notContains(matching, "nearThreeSourceSamples", "diagnostics do not mutate matching");
  notContains(matching, "sourcePairOverlapMatrix", "pair matrix does not mutate matching");
});


test("Book Index readiness measures storefront eligibility lost after operator grouping", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const ranking = source("src/lib/book-index/ranking.ts");

  contains(
    readiness,
    "storefrontEligibleButOperatorIneligibleCount",
    "operator-group eligibility delta count",
  );
  contains(
    readiness,
    "storefrontEligibleButOperatorIneligibleSamples",
    "operator-group eligibility delta samples",
  );
  contains(
    readiness,
    "sample.storefrontSourceCount >= 3",
    "current storefront eligibility boundary",
  );
  contains(
    readiness,
    "sample.independentSourceCount < 3",
    "independent operator ineligibility boundary",
  );
  contains(
    readiness,
    "getBookIndexSourceIndependenceGroup",
    "operator grouping source",
  );
  contains(
    ranking,
    "getBookIndexSourceIndependenceGroup",
    "operator grouping now also governs scoring",
  );
});


test("KitaplarSepette qualified voter keeps documented independent operator metadata", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    sources,
    'collectionState: "ready",\n    independenceGroup: "iklim-grup",\n    operatorName: "İklim Grup Kitap Satış Dağıtım Ltd. Şti."',
    "KitaplarSepette documented operator group",
  );
  contains(
    lists,
    'code: "kitaplarsepette-tr-live"',
    "KitaplarSepette qualified live voter",
  );
  contains(
    lists,
    'includeInComposite: true',
    "qualified KitaplarSepette vote is active",
  );
  notContains(
    lists,
    'code: "kitaplarsepette-tr-live-canary"',
    "qualified canary registry entry is retired",
  );
});
