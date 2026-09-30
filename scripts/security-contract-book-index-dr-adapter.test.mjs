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

test("D&R production adapter publishes native new releases and explicit weekly bestseller ranks", () => {
  const adapter = source("src/lib/book-index/sources/dr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(adapter, 'const BESTSELLER_PATH = "/kategori_/kitap/cok-satanlar/10001/12"', "bestseller path");
  contains(adapter, 'const NEW_RELEASES_PATH = "/kategori_/kitap/en-yeniler/10001/3"', "new-release path");
  contains(adapter, "parseDrWeeklyRankedProduct", "explicit product rank parser");
  contains(adapter, "Haftanın En Çok Satan", "native weekly rank badge");
  contains(adapter, 'context.listCode === "dr-tr-bestsellers"', "bestseller collector activation");
  contains(adapter, 'context.listCode === "dr-tr-new-releases"', "new-release collector activation");
  contains(adapter, "BOOK_INDEX_DR_WEEKLY_RANK_SET_INVALID", "weekly result guard");
  notContains(adapter, "rank: index + 1", "catalog position never becomes bestseller rank");
  contains(collector, "drBookIndexAdapter", "collector registration");
  contains(sources, 'collectionState: "ready"', "ready source state");

  for (const code of ["dr-tr-bestsellers", "dr-tr-new-releases"]) {
    const start = lists.indexOf(`code: "${code}"`);
    assert.ok(start >= 0, `missing D&R list: ${code}`);
    const block = lists.slice(start, start + 750);
    contains(block, "collectionEveryMinutes: 360", `${code} scheduled`);
    contains(block, "publiclyVisible: true", `${code} public`);
    contains(block, "enabled: true", `${code} enabled`);
  }
});
