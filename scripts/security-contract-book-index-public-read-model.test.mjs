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

test("Book Index public read model preserves source ranks without public composite ordering", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const sourceRankTable = source("src/lib/book-index/source-rank-table.ts");
  const composite = source("src/lib/book-index/read-model.ts");

  contains(
    model,
    "getTurkeySourceRankRows",
    "Turkey source-rank public model",
  );
  contains(
    sourceRankTable,
    "rowsByRankAndBook",
    "rank-and-book grouping",
  );
  contains(
    sourceRankTable,
    "const rowKey = \`\${observation.rank}|\${identity}\`;",
    "same book merges only at the same rank",
  );
  contains(
    model,
    'orderBy: {\n          rank: "asc",',
    "source-native rank ordering",
  );
  contains(
    model,
    "rank: observation.rank",
    "source-native rank preservation",
  );
  contains(
    model,
    'status: { in: ["success", "no_change"] }',
    "successful snapshot gate",
  );
  contains(
    model,
    "observation.priceAmount?.toString() ?? null",
    "JSON-safe public price",
  );
  contains(
    composite,
    "const highestObservedRank = entry.run.observations.reduce(",
    "observed rank span guard",
  );
  contains(
    composite,
    "entry.run.itemsStored,\n      highestObservedRank,\n      1,",
    "gap-safe list size normalization",
  );
  notContains(
    composite,
    "const listSize = Math.max(entry.run.itemsStored, 1);",
    "stale stored-count-only normalization",
  );
});

test("Amazon TR and US public states fail closed until sanctioned data exists", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(model, 'getMarketSourceState("amazon-tr"', "Amazon TR public state");
  contains(model, 'getMarketSourceState("amazon-us"', "Amazon US public state");
  contains(
    sources,
    'code: "amazon-tr"',
    "Amazon TR registry source",
  );
  contains(
    sources,
    'collectionState: "researching"',
    "researching source state",
  );
  contains(
    sources,
    'code: "amazon-us"',
    "Amazon US registry source",
  );
  contains(
    sources,
    'collectionState: "blocked"',
    "blocked source state",
  );
  contains(
    model,
    'publicRolloutState: "gated"',
    "public rollout remains gated",
  );
});

test("Book Index public read model stays independent from conditional sitemap publication", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const sitemap = source("src/app/sitemap.ts");

  contains(model, 'publicRolloutState: "gated"', "read model remains gated");
  contains(
    sitemap,
    "loadBookIndexSitemapEntries",
    "sitemap publication is handled by an explicit gate helper",
  );
});


test("Book Index public methodology describes source-rank comparison", () => {
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const normalizedView = view.replace(/\s+/g, " ");

  contains(normalizedView, "İlkOku yeni bir sıra veya bileşik puan üretmez", "no invented public ranking");
  contains(normalizedView, "aynı kitap aynı sıra numarasında birden fazla kaynakta", "same-rank merge rule");
  contains(normalizedView, "aynı kitap farklı sıra numaralarındaysa", "different-rank separation rule");
  contains(normalizedView, "işletmeci grubu bazında tekilleştirme korunur", "internal insight operator deduplication");
  notContains(normalizedView, "en az üç bağımsız işletmeci grubunda görünmelidir", "stale public composite threshold copy");
});
