import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Book Index insights derive from historical snapshots without publishing routes", () => {
  const insights = source("src/lib/book-index/insights.ts");

  contains(
    insights,
    'status: { in: ["success", "no_change"] }',
    "successful snapshot gate",
  );
  contains(insights, "take: 2", "current and previous snapshot comparison");
  contains(insights, "previous.rank - current.rank", "riser rank gain");
  contains(insights, "newSourceCount", "new-entry source evidence");
  contains(
    insights,
    "sources.size >= TURKEY_INDEX_MIN_SOURCES",
    "everywhere-seller independent-source threshold",
  );
  contains(
    insights,
    "MIN(observation.observedAt)",
    "long-seller first observation",
  );
  contains(
    insights,
    "MAX(observation.observedAt)",
    "long-seller last observation",
  );
  contains(
    insights,
    "COUNT(DISTINCT list.sourceId)",
    "long-seller independent source count",
  );
});

test("Book Index insight labels stay descriptive rather than inventing fixed time thresholds", () => {
  const insights = source("src/lib/book-index/insights.ts");

  contains(insights, "historyDays", "measured history duration");
  contains(insights, "totalRankGain", "measured rank improvement");
  contains(insights, "improvingSourceCount", "measured improving-source count");
  contains(insights, "currentSourceCount", "measured current-source count");
});
