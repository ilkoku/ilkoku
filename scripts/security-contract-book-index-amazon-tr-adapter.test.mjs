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

test("Amazon TR production adapter preserves native ranked book surfaces", () => {
  const adapter = source("src/lib/book-index/sources/amazon-tr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    adapter,
    'const BESTSELLER_PATH = "/gp/bestsellers/books"',
    "verified Amazon TR bestseller surface",
  );
  contains(
    adapter,
    'const NEW_RELEASES_PATH = "/gp/new-releases/books"',
    "verified Amazon TR new-release surface",
  );
  contains(adapter, "data-asin", "ASIN card identity parser");
  contains(adapter, "zg-bdg-text", "native rank badge parser");
  contains(adapter, "p13n-product-image", "ranked card image/title parser");
  contains(adapter, "canonicalProductUrl(asin)", "ASIN canonical product URL");
  contains(
    adapter,
    "BOOK_INDEX_AMAZON_TR_PAGE_RANK_GAP",
    "per-page rank continuity guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_AMAZON_TR_DUPLICATE_SOURCE_KEY",
    "ASIN uniqueness guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_AMAZON_TR_DUPLICATE_RANK",
    "combined rank uniqueness guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_AMAZON_TR_RANK_GAP",
    "combined native rank continuity guard",
  );
  contains(
    adapter,
    '"amazon-tr-live"',
    "bestseller research list boundary",
  );
  contains(
    adapter,
    '"amazon-tr-new-releases"',
    "new-release research list boundary",
  );
  contains(
    adapter,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "transparent collector identity",
  );
  contains(
    adapter,
    "Collector adapter for the verified native ranked book surfaces:",
    "research-only rollout boundary",
  );

  contains(
    collector,
    "amazonTrBookIndexAdapter",
    "Amazon TR adapter is registered in collector",
  );
  contains(
    sources,
    'code: "amazon-tr"',
    "Amazon TR source remains registered",
  );
  contains(
    sources,
    'baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    Amazon TR source is ready,
  );
  contains(
    lists,
    'code: "amazon-tr-live"',
    "Amazon TR bestseller list is active",
  );
  contains(
    lists,
    'sourceUrl: "https://www.amazon.com.tr/gp/bestsellers/books"',
    "disabled list uses the verified native bestseller surface",
  );
});
