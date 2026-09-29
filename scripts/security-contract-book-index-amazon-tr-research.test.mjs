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

test("Amazon Türkiye production supports verified ranked book surfaces", () => {
  const adapter = source("src/lib/book-index/sources/amazon-tr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(
    adapter,
    'const BESTSELLER_PATH = "/gp/bestsellers/books"',
    "native bestseller path",
  );
  contains(
    adapter,
    'const NEW_RELEASES_PATH = "/gp/new-releases/books"',
    "native new-release path",
  );
  contains(
    adapter,
    "zg_bs_pg_2_books?ie=UTF8&pg=2",
    "bestseller page-two contract",
  );
  contains(
    adapter,
    "zg_bsnr_pg_2_books?ie=UTF8&pg=2",
    "new-release page-two contract",
  );
  contains(adapter, "data-asin", "ASIN source identity");
  contains(adapter, "zg-bdg-text", "explicit native rank badge");
  contains(adapter, "parseAmazonTrNewReleasePage", "new-release ranked parser");
  contains(adapter, "BOOK_INDEX_AMAZON_TR_PAGE_RANK_GAP", "page rank-gap guard");
  contains(adapter, "BOOK_INDEX_AMAZON_TR_DUPLICATE_SOURCE_KEY", "ASIN uniqueness guard");
  contains(adapter, "BOOK_INDEX_AMAZON_TR_DUPLICATE_RANK", "cross-page rank guard");
  contains(
    adapter,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "transparent collector identity",
  );
  notContains(adapter, "isbn13: asin", "ASIN must never be converted into ISBN-13");
  notContains(adapter, "isbn10: asin", "ASIN must never be converted into ISBN-10");

  contains(
    collector,
    "amazonTrBookIndexAdapter",
    "Amazon Türkiye adapter is registered in collector",
  );
  contains(lists, 'code: "amazon-tr-live"', "Amazon TR bestseller list remains registered");
  contains(
    lists,
    'sourceUrl: "https://www.amazon.com.tr/gp/bestsellers/books"',
    "Amazon TR bestseller source URL",
  );
  contains(
    lists,
    'title: "Amazon Türkiye · Kitap Çok Satanlar"',
    "existing bestseller list identity remains",
  );
  contains(
    lists,
    'code: "amazon-tr-new-releases"',
    "Amazon TR new-release list is active",
  );
  contains(
    sources,
    'baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "Amazon Türkiye source is ready",
  );
});

test("Amazon Türkiye bestseller list is live and public", () => {
  const lists = source("src/lib/book-index/lists.ts");
  const start = lists.indexOf('code: "amazon-tr-live"');
  assert.ok(start >= 0, "amazon-tr-live must exist");
  const block = lists.slice(start, start + 700);

  contains(block, "includeInComposite: true", "Amazon Türkiye is included in the Turkey source-rank table");
  contains(block, "publiclyVisible: true", "Amazon Türkiye public visibility is on");
  contains(block, "enabled: true", "Amazon Türkiye collection is enabled");
});
