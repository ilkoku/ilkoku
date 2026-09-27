import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function source(path) {
  return fs.readFileSync(path, "utf8");
}

test("idefix historical metadata probe is bounded and read-only", () => {
  const probe = source("src/lib/book-index/idefix-history-probe.ts");
  const route = source("src/app/api/internal/book-index-idefix-history-probe/route.ts");
  const workflow = source(".github/workflows/book-index-idefix-history-probe.yml");

  assert.match(probe, /const MAX_CANDIDATES = 100;/u);
  assert.match(probe, /const DETAIL_CONCURRENCY = 6;/u);
  assert.match(probe, /const SAMPLE_LIMIT = 100;/u);
  assert.match(probe, /matchStatus: "unmatched"/u);
  assert.match(probe, /masterBookId: null/u);
  assert.match(probe, /parseIdefixProductDetails/u);
  assert.match(probe, /mode: "read_only"/u);

  assert.doesNotMatch(probe, /bookIndexObservation\.(?:create|update|delete)/u);
  assert.doesNotMatch(probe, /bookIndexFetchRun\.(?:create|update|delete)/u);
  assert.doesNotMatch(probe, /bookIndexExternalBook\.(?:create|update|upsert|delete)/u);
  assert.doesNotMatch(probe, /autoMatchBookIndexExternalBook/u);
  assert.doesNotMatch(probe, /\$transaction/u);

  assert.match(route, /ilkoku-book-index-idefix-history-probe/u);
  assert.match(route, /book-index-idefix-history-probe\.yml@refs\/heads\/main/u);
  assert.match(route, /"push"/u);
  assert.match(route, /"workflow_dispatch"/u);
  assert.match(route, /maxDuration = 300/u);

  assert.match(workflow, /id-token: write/u);
  assert.match(workflow, /Probe historical idefix metadata without writes/u);
  assert.doesNotMatch(workflow, /schedule:/u);

  const idefix = source("src/lib/book-index/sources/idefix.ts");
  assert.match(idefix, /function safeIdefixAuthorName/u);
  assert.match(idefix, /candidate\.length > 120/u);
  assert.match(idefix, /wordCount > 12/u);
  assert.match(idefix, /Genel Yayın Yönetmeni\|Yayın Yönetmeni\|Sayfa Düzeni/u);
  assert.match(idefix, /if \(\/\[:\]\/u\.test\(candidate\)\) return null;/u);
  assert.match(idefix, /Yayınları\|Yayınevi\|Yayıncılık/u);
  assert.match(idefix, /title\.startsWith\(expected\)/u);
  assert.match(idefix, /documentTitleAuthorName\(html, expectedTitle\)/u);
});


test("idefix historical backfill is bounded, leased and history-safe", () => {
  const backfill = source("src/lib/book-index/idefix-history-backfill.ts");
  const route = source("src/app/api/internal/book-index-idefix-history-backfill/route.ts");
  const workflow = source(".github/workflows/book-index-idefix-history-backfill.yml");

  assert.match(backfill, /const MAX_CANDIDATES = 100;/u);
  assert.match(backfill, /const DETAIL_CONCURRENCY = 6;/u);
  assert.match(backfill, /matchStatus: "unmatched"/u);
  assert.match(backfill, /masterBookId: null/u);
  assert.match(backfill, /acquireBookIndexSchedulerLease/u);
  assert.match(backfill, /releaseBookIndexSchedulerLease/u);
  assert.match(backfill, /BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_FETCH_FAILED_/u);
  assert.match(backfill, /parseIdefixProductDetails/u);
  assert.match(backfill, /autoMatchBookIndexExternalBook/u);
  assert.match(backfill, /normalizeBookIndexText\(recoveredAuthorName\)/u);
  assert.match(backfill, /_min: \{ firstSeenAt: true \}/u);
  assert.match(backfill, /_max: \{ lastSeenAt: true \}/u);

  assert.doesNotMatch(backfill, /bookIndexObservation\.(?:create|update|upsert|delete)/u);
  assert.doesNotMatch(backfill, /bookIndexFetchRun\.(?:create|update|upsert|delete)/u);
  assert.doesNotMatch(backfill, /bookIndexExternalBook\.(?:create|upsert|delete)/u);
  assert.doesNotMatch(backfill, /sourceKey:\s*recovered/u);
  assert.doesNotMatch(backfill, /rank:/u);
  assert.doesNotMatch(backfill, /deleteMany/u);

  assert.match(route, /ilkoku-book-index-idefix-history-backfill/u);
  assert.match(route, /book-index-idefix-history-backfill\.yml@refs\/heads\/main/u);
  assert.match(route, /getBookIndexReadinessSnapshot/u);
  assert.match(route, /maxDuration = 300/u);

  assert.match(workflow, /id-token: write/u);
  assert.match(workflow, /Backfill bounded historical idefix metadata/u);
  assert.match(workflow, /--request POST/u);
  assert.doesNotMatch(workflow, /schedule:/u);
});
