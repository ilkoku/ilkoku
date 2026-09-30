import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Penguen uses the verified penguenkitap.com.tr bestseller surface", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const adapter = source("src/lib/book-index/sources/penguen.ts");

  contains(
    sources,
    'baseUrl: "https://www.penguenkitap.com.tr"',
    "correct Penguen domain",
  );
  contains(sources, 'name: "Penguen Kitap"', "correct source identity");
  contains(adapter, 'const BESTSELLER_PATH = "/urunler/cok-satanlar"', "native bestseller path");
  contains(adapter, "parsePenguenBestsellers", "bestseller parser");
  contains(adapter, "BOOK_INDEX_PENGUEN_BESTSELLER_MARKER_MISSING", "page marker guard");
  contains(adapter, "BOOK_INDEX_PENGUEN_RESULT_TOO_SMALL", "minimum result guard");
  contains(collector, "penguenBookIndexAdapter", "collector registration");

  const start = lists.indexOf('code: "penguen-tr-bestsellers"');
  assert.ok(start >= 0, "Penguen bestseller list missing");
  const block = lists.slice(start, start + 800);
  contains(block, 'sourceUrl: "https://www.penguenkitap.com.tr/urunler/cok-satanlar"', "correct source URL");
  contains(block, "includeInTurkeyDisplay: true", "Turkey table inclusion");
  contains(block, "collectionEveryMinutes: 360", "scheduler cadence");
  contains(block, "publiclyVisible: true", "public list");
  contains(block, "enabled: true", "enabled list");
});
