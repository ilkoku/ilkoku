import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Kitapyurdu production adapter preserves verified native weekly bestseller list", () => {
  const adapter = source("src/lib/book-index/sources/kitapyurdu.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const newReleaseRegistry = source("src/lib/book-index/new-release-sources.ts");

  contains(
    adapter,
    'const WEEKLY_GENERAL_PATH = "/cok-satan-kitaplar/haftalik/1.html"',
    "verified weekly bestseller path",
  );
  contains(adapter, "const EXACT_EXPECTED_BOOKS = 20", "first-page fail-closed size");
  contains(adapter, "/kitap/", "book-only product URL contract");
  contains(adapter, '"yazar" | "yayinevi"', "author and publisher link scopes");
  contains(
    adapter,
    "BOOK_INDEX_KITAPYURDU_WEEKLY_GENERAL_MARKER_MISSING",
    "weekly bestseller surface guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_KITAPYURDU_UNEXPECTED_PAGE_SIZE",
    "page-size fail-closed guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_KITAPYURDU_DUPLICATE_SOURCE_KEY",
    "product identity uniqueness guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_KITAPYURDU_RANK_ORDER_MISMATCH",
    "native order guard",
  );
  contains(
    adapter,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "transparent collector identity",
  );
  contains(adapter, "kitapyurduBookIndexAdapter", "production adapter exists");
  contains(collector, "kitapyurduBookIndexAdapter", "adapter is registered");
  contains(lists, 'code: "kitapyurdu-tr-weekly"', "weekly production list is registered");
  contains(sources, 'code: "kitapyurdu"', "source registry is present");
  contains(
    sources,
    'baseUrl: "https://www.kitapyurdu.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "source is ready",
  );

  assert.equal(
    lists.includes('code: "kitapyurdu-tr-new-releases"'),
    false,
    "new-release production list stays out of this rollout",
  );
  assert.equal(
    newReleaseRegistry.includes('sourceCode: "kitapyurdu"'),
    false,
    "new-release registry stays out of this rollout",
  );
});
