import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync(
  new URL("../src/features/writer-daily-summary/service.ts", import.meta.url),
  "utf8",
);

test("daily writer highlights never use reserved MariaDB READS as a SQL alias", () => {
  // MariaDB reserves READS. An unquoted alias causes ER_PARSE_ERROR (1064).
  assert.doesNotMatch(service, /\bAS\s+reads\b/iu);
  assert.doesNotMatch(service, /\bORDER\s+BY\s+reads\b/iu);

  // Both independent highlight queries must use a nonreserved alias.
  assert.equal(
    [...service.matchAll(/COALESCE\(SUM\(ra\.viewCount\), 0\) AS readCount/gu)].length,
    2,
  );
  assert.equal([...service.matchAll(/ORDER BY readCount DESC/gu)].length, 2);

  // Public email payload stays compatible: { reads, title }.
  assert.match(service, /type HighlightRow = \{\s*readCount:/u);
  assert.equal(
    [...service.matchAll(/\{ reads: toNumber\(row\.readCount\), title: row\.title \}/gu)].length,
    2,
  );
});

test("preparation errors cannot strand daily deliveries in pending state", () => {
  const processStart = service.indexOf("async function processWriter(");
  const processEnd = service.indexOf("export async function runWriterDailySummaries(", processStart);
  assert.ok(processStart >= 0 && processEnd > processStart);
  const process = service.slice(processStart, processEnd);

  const tryAt = process.indexOf("  try {");
  const metricsAt = process.indexOf("metrics = await loadMetrics(");
  const highlightsAt = process.indexOf("const [topWork, topChapter] = await Promise.all(");
  const catchAt = process.indexOf("} catch (error) {");
  const failedAt = process.indexOf('status: "failed"', catchAt);

  assert.ok(tryAt >= 0 && tryAt < metricsAt);
  assert.ok(metricsAt < highlightsAt && highlightsAt < catchAt);
  assert.ok(catchAt < failedAt, "failed preparations must become retryable");
  assert.match(process, /WRITER_DAILY_SUMMARY_PREPARE_FAILED/u);
  assert.match(process, /phase === "prepare"/u);
  assert.match(service, /if \(row\.status === "failed"\)/u);
  assert.doesNotMatch(process, /UPDATE WriterDailySummaryDelivery/iu);
});
