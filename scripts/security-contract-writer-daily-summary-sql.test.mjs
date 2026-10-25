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
  const failureGuardAt = process.indexOf('phase === "prepare" ? "failed" : "review"', catchAt);

  assert.ok(tryAt >= 0 && tryAt < metricsAt);
  assert.ok(metricsAt < highlightsAt && highlightsAt < catchAt);
  assert.ok(catchAt < failureGuardAt, "only preparation failures may be retried");
  assert.match(process, /WRITER_DAILY_SUMMARY_PREPARE_FAILED/u);
  assert.match(process, /phase === "prepare"/u);
  assert.match(service, /row\.status === "failed" && row\.failureMessage\?\.startsWith\("PREPARE:"\)/u);
  assert.doesNotMatch(process, /UPDATE WriterDailySummaryDelivery/iu);
});

test("cron detects partial failure without repeated SMTP delivery attempts", () => {
  const route = readFileSync(
    new URL("../src/app/api/internal/writer-daily-summary/route.ts", import.meta.url),
    "utf8",
  );
  const workflow = readFileSync(
    new URL("../.github/workflows/writer-daily-summary.yml", import.meta.url),
    "utf8",
  );

  assert.match(route, /const ok = result\.failed === 0;/u);
  assert.match(route, /WRITER_DAILY_SUMMARY_PARTIAL_FAILURE/u);
  assert.ok(workflow.includes(`.ok == true and (.failed | type == "number") and .failed == 0`));
  assert.match(workflow, /if ! printf/u);
  assert.match(workflow, /exit 1/u);
  assert.match(workflow, /Authorization: Bearer \$SUMMARY_SECRET/u);
});

test("ambiguous email sends are held for manual review, never automatically retried", () => {
  const start = service.indexOf("async function processWriter(");
  const stop = service.indexOf("export async function runWriterDailySummaries(", start);
  const process = service.slice(start, stop);
  const workflow = readFileSync(
    new URL("../.github/workflows/writer-daily-summary.yml", import.meta.url),
    "utf8",
  );

  assert.match(service, /AND failureMessage LIKE 'PREPARE:%'/u);
  assert.match(service, /status: "failed" \| "review" \| "sent" \| "skipped"/u);
  assert.match(process, /SEND_REQUIRES_REVIEW:DEDUPLICATED/u);
  assert.match(process, /WRITER_DAILY_SUMMARY_SEND_REQUIRES_REVIEW/u);
  assert.match(process, /WRITER_DAILY_SUMMARY_STATE_PERSIST_FAILED/u);
  assert.doesNotMatch(workflow, /--retry(?:-all-errors)?\b/u);
  assert.match(workflow, /--request POST/u);
});
