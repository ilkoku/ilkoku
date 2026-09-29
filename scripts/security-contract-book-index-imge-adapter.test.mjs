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

test("Imge collector uses the verified sales-quantity order and stays book-site scoped", () => {
  const adapter = source("src/lib/book-index/sources/imge.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(adapter, 'url.searchParams.set("sort_type", "7")', "Imge sales quantity sort");
  contains(adapter, 'url.searchParams.set("size", "100")', "Imge full tagged set size");
  contains(adapter, "BOOK_INDEX_IMGE_SALES_SORT_NOT_APPLIED", "sales-sort fail-closed guard");
  contains(adapter, "BOOK_INDEX_IMGE_RESULT_TOO_SMALL", "small-result fail-closed guard");
  contains(adapter, "BOOK_INDEX_IMGE_DUPLICATE_SOURCE_KEY", "identity uniqueness guard");
  contains(adapter, "isbn13", "ISBN-13 strong identity");
  contains(
    adapter,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "transparent collector user agent",
  );

  contains(lists, 'code: "imge-tr-live"', "Imge list registry");
  contains(
    lists,
    'sourceUrl: "https://www.imge.com.tr/etiket/cok-satanlar?sort_type=7&size=100"',
    "sales-sorted Imge source URL",
  );
  contains(lists, 'title: "İmge Kitabevi · Çok Satanlar"', "Imge list title");

  contains(sources, 'code: "imge"', "Imge source registry");
  contains(
    sources,
    'baseUrl: "https://www.imge.com.tr",\n    includeInTurkeyIndex: true',
    "Imge participates in the Turkey source table",
  );
  contains(
    collector,
    "[imgeBookIndexAdapter.sourceCode, imgeBookIndexAdapter]",
    "Imge adapter activation",
  );

  for (const marketplace of ["hepsiburada", "trendyol", "pttavm"]) {
    notContains(sources, `code: "${marketplace}"`, `${marketplace} marketplace excluded`);
  }
});
