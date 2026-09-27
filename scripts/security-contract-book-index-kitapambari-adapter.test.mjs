import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Kitap Ambari research adapter preserves a bounded native Top 100 contract", () => {
  const adapter = source("src/lib/book-index/sources/kitapambari.ts");

  contains(adapter, 'const PAGE_SIZE = 20;', "native page size");
  contains(adapter, 'const PAGE_COUNT = 5;', "bounded page count");
  contains(adapter, "\\bProduct_b\\b", "stable product card token");
  contains(adapter, 'data-prd-id=["\']([^"\']+)["\']', "stable product id");
  contains(adapter, 'data-prd-barcode=["\']([^"\']*)["\']', "barcode metadata");
  contains(adapter, '/^(?:978|979)[0-9]{10}$/u', "ISBN-13 prefix validation");
  contains(adapter, "sourceKey: validIsbn13 || productId", "product-id fallback for non-ISBN barcode");
  contains(adapter, "rank: rankOffset + index + 1", "DOM order maps to bounded native page order");
  contains(adapter, 'url.searchParams.set("mod_id", "41")', "official bestseller module query");
  contains(adapter, 'url.searchParams.set("page", String(page))', "native pagination");
  contains(adapter, "BOOK_INDEX_KITAPAMBARI_PAGE_SIZE_CHANGED", "page drift fail closed");
  contains(adapter, "BOOK_INDEX_KITAPAMBARI_RESULT_SIZE_CHANGED", "Top 100 drift fail closed");
  contains(adapter, "BOOK_INDEX_KITAPAMBARI_DUPLICATE_PRODUCT_ID", "duplicate product guard");
  contains(adapter, "BOOK_INDEX_KITAPAMBARI_DUPLICATE_SOURCE_KEY", "duplicate source-key guard");
  contains(adapter, '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"', "transparent user agent");
  contains(adapter, "AbortSignal.timeout(20_000)", "bounded request timeout");
});
