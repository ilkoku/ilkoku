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

test("D&R research refuses to infer weekly rank from visible catalog position", () => {
  const adapter = source("src/lib/book-index/sources/dr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    adapter,
    'const BESTSELLER_PATH = "/kategori_/kitap/cok-satanlar/10001/12"',
    "verified native D&R bestseller path",
  );
  contains(
    adapter,
    "parseDrBestsellerCandidateUrls",
    "candidate URL parser",
  );
  contains(
    adapter,
    "parseDrWeeklyRankedProduct",
    "explicit product-rank parser",
  );
  contains(
    adapter,
    "Haftanın En Çok Satan",
    "native weekly rank badge contract",
  );
  contains(
    adapter,
    "BOOK_INDEX_DR_WEEKLY_RANK_BADGE_MISSING",
    "missing native rank fails closed",
  );
  contains(
    adapter,
    "BOOK_INDEX_DR_DUPLICATE_WEEKLY_RANK",
    "duplicate explicit ranks fail closed",
  );
  notContains(
    adapter,
    "rank: index + 1",
    "catalog position must never become weekly rank",
  );
  notContains(
    adapter,
    "drBookIndexResearchAdapter",
    "no live source adapter before collection path is verified",
  );
  contains(
    adapter,
    "Deliberately no BookIndexSourceAdapter export here.",
    "research-only boundary",
  );

  notContains(
    collector,
    "drBookIndexResearchAdapter",
    "D&R remains out of production collector registry",
  );
  notContains(
    lists,
    'code: "dr-tr-bestsellers-research"',
    "D&R research list stays inactive",
  );
  contains(sources, 'code: "dr"', "D&R source registry remains present");
  contains(
    sources,
    'baseUrl: "https://www.dr.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "blocked"',
    "existing source state is not silently changed by parser correction",
  );
});
