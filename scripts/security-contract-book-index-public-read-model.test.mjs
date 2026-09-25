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

test("Book Index public read model keeps source ranks separate from the Turkey composite", () => {
  const model = source("src/lib/book-index/public-read-model.ts");

  contains(
    model,
    "getTurkeyBookIndexPreview",
    "Turkey composite read model",
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

test("Book Index public read model remains gated independently of route wiring", () => {
  const model = source("src/lib/book-index/public-read-model.ts");

  contains(
    model,
    'publicRolloutState: "gated"',
    "read model remains explicitly gated",
  );
});
