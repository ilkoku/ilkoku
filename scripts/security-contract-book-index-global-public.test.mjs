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

test("global bestseller preview reads only the six approved native source lists", () => {
  const model = source("src/lib/book-index/global-public-read-model.ts");

  for (const listCode of [
    "amazon-us-live",
    "amazon-uk-live",
    "ibs-it-daily",
    "rakuten-jp-weekly",
    "kyobo-kr-weekly",
    "readings-au-monthly",
  ]) {
    contains(model, `"${listCode}"`, `${listCode} approved global list`);
  }

  contains(
    model,
    "getBookIndexSourceListSnapshot(listCode, limit)",
    "global preview reuses successful native snapshot reads",
  );
  contains(
    model,
    'rolloutState: "gated"',
    "global rollout remains explicitly gated",
  );
  contains(
    model,
    'BOOK_INDEX_GLOBAL_PREVIEW_ENABLED === "true"',
    "global preview requires an explicit environment switch",
  );
  notContains(
    model,
    "includeInComposite",
    "global preview does not build a cross-market composite rank",
  );
  notContains(
    model,
    "getTurkeySourceRankRows",
    "global preview stays independent from Turkey ranking aggregation",
  );
});
