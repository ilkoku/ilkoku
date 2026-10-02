import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Kitapyurdu adapter is preserved but production collection stays blocked", () => {
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
  contains(adapter, "kitapyurduBookIndexAdapter", "adapter is preserved");
  contains(collector, "kitapyurduBookIndexAdapter", "collector wiring is preserved");

  const sourceStart = sources.indexOf('code: "kitapyurdu"');
  assert.ok(sourceStart >= 0, "Kitapyurdu source registry must remain present");
  const sourceEnd = sources.indexOf("  },", sourceStart);
  const kitapyurduSource = sources.slice(sourceStart, sourceEnd);
  contains(kitapyurduSource, "includeInTurkeyIndex: false", "Turkey index exclusion");
  contains(kitapyurduSource, 'collectionState: "blocked"', "production block state");

  const listStart = lists.indexOf('code: "kitapyurdu-tr-weekly"');
  assert.ok(listStart >= 0, "Kitapyurdu weekly list must remain registered");
  const listEnd = lists.indexOf("  },", listStart);
  const kitapyurduList = lists.slice(listStart, listEnd);
  contains(kitapyurduList, "includeInComposite: false", "composite exclusion");
  contains(kitapyurduList, "collectionEveryMinutes: null", "scheduler disabled");
  contains(kitapyurduList, "publiclyVisible: false", "public visibility disabled");
  contains(kitapyurduList, "enabled: false", "collection disabled");

  assert.equal(
    lists.includes('code: "kitapyurdu-tr-new-releases"'),
    false,
    "new-release production list stays out of rollout",
  );
  assert.equal(
    newReleaseRegistry.includes('sourceCode: "kitapyurdu"'),
    false,
    "new-release registry stays out of rollout",
  );
});
