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

test("Kitapyurdu collector registration preserves verified native lists without activating rollout", () => {
  const adapter = source("src/lib/book-index/sources/kitapyurdu.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    adapter,
    'const WEEKLY_GENERAL_PATH = "/cok-satan-kitaplar/haftalik/1.html"',
    "verified weekly bestseller path",
  );
  contains(
    adapter,
    'const WEEKLY_NEW_RELEASES_PATH = "/yeni-cikan-kitaplar/haftalik/2.html"',
    "verified weekly new-release path",
  );
  contains(adapter, 'const EXACT_EXPECTED_BOOKS = 20', "first-page fail-closed size");
  contains(adapter, "/kitap/", "book-only product URL contract");
  contains(adapter, '"yazar" | "yayinevi"', "author and publisher link scopes");
  contains(
    adapter,
    "BOOK_INDEX_KITAPYURDU_WEEKLY_GENERAL_MARKER_MISSING",
    "weekly bestseller surface guard",
  );
  contains(
    adapter,
    "BOOK_INDEX_KITAPYURDU_NEW_RELEASE_MARKER_MISSING",
    "weekly new-release surface guard",
  );
  contains(
    adapter,
    '"Yeni Çıkanlar (Genel, Haftalık)"',
    "native weekly new-release marker",
  );
  contains(
    adapter,
    '"Son 7 gün içerisindeki yeni çıkan ürünler"',
    "native weekly new-release definition",
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
  contains(
    adapter,
    "Collector-registered adapter",
    "collector registration boundary",
  );

  contains(
    collector,
    "kitapyurduBookIndexResearchAdapter",
    "Kitapyurdu adapter is registered while rollout stays disabled",
  );
  for (const code of [
    "kitapyurdu-tr-weekly-research",
    "kitapyurdu-tr-new-releases-research",
  ]) {
    notContains(
      lists,
      `code: "${code}"`,
      `${code} research list stays inactive`,
    );
  }
  contains(
    sources,
    'code: "kitapyurdu"',
    "Kitapyurdu source registry remains present",
  );
  contains(
    sources,
    'baseUrl: "https://www.kitapyurdu.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "blocked"',
    "existing source state is not silently changed by parser research",
  );
});
