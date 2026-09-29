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

test("Amazon Türkiye research supports verified ranked book surfaces without activating rollout", () => {
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
    "amazonTrBookIndexResearchAdapter",
    "Amazon Türkiye adapter is registered in collector",
  );
  contains(lists, 'code: "amazon-tr-live"', "existing bestseller placeholder remains");
  contains(
    lists,
    'sourceUrl: "https://www.amazon.com.tr/gp/bestsellers/books"',
    "existing bestseller source URL remains",
  );
  contains(
    lists,
    'title: "Amazon Türkiye · Kitap Çok Satanlar"',
    "existing bestseller list identity remains",
  );
  contains(
    lists,
    'code: "amazon-tr-new-releases-research"',
    "Amazon TR new-release research list exists",
  );
  contains(
    lists,
    'sourceUrl: "https://www.amazon.com.tr/gp/new-releases/books"',
    "Amazon TR native new-release source URL is registered",
  );
  notContains(
    lists,
    'code: "amazon-tr-new-releases"',
    "no production new-release list is activated",
  );
  contains(
    sources,
    'baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "researching"',
    "Amazon Türkiye source state remains researching",
  );
});

test("Amazon Türkiye live placeholder stays disabled and non-public", () => {
  const lists = source("src/lib/book-index/lists.ts");
  const start = lists.indexOf('code: "amazon-tr-live"');
  assert.ok(start >= 0, "amazon-tr-live must exist");
  const block = lists.slice(start, start + 700);

  contains(block, "includeInComposite: false", "Amazon Türkiye composite remains off");
  contains(block, "publiclyVisible: false", "Amazon Türkiye public visibility remains off");
  contains(block, "enabled: false", "Amazon Türkiye collection remains disabled");
});
