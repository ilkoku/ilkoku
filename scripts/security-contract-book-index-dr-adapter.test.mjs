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

test("D&R research parser preserves the verified native bestseller route without activating rollout", () => {
  const adapter = source("src/lib/book-index/sources/dr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    adapter,
    'const BESTSELLER_PATH = "/kategori_/kitap/cok-satanlar/10001/12"',
    "verified native D&R bestseller path",
  );
  contains(adapter, 'const EXACT_EXPECTED_BOOKS = 40', "first-page fail-closed size");
  contains(adapter, "/urunno", "D&R stable product identity contract");
  contains(adapter, '"yazar" | "yayinevi"', "author and publisher link scopes");
  contains(
    adapter,
    "BOOK_INDEX_DR_BESTSELLER_MARKER_MISSING",
    "native bestseller marker guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_DR_UNEXPECTED_PAGE_SIZE",
    "page-size fail-closed guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_DR_DUPLICATE_SOURCE_KEY",
    "product identity uniqueness guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_DR_RANK_ORDER_MISMATCH",
    "native order guard",
  );
  contains(
    adapter,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "transparent collector identity",
  );
  contains(
    adapter,
    'Browser inspection verified D&R\'s native "Çok Satanlar" selection and card order.',
    "browser-verified research boundary",
  );

  notContains(
    collector,
    "drBookIndexResearchAdapter",
    "D&R research adapter stays out of production collector registry",
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
    "existing source state is not silently changed by parser research",
  );
});
