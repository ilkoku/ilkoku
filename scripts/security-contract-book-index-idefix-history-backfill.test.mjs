import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("idefix historical backfill is bounded, metadata-only and scheduler-lease protected", () => {
  const backfill = source("src/lib/book-index/idefix-history-backfill.ts");
  const route = source("src/app/api/internal/book-index-idefix-history-backfill/route.ts");
  const workflow = source(".github/workflows/book-index-idefix-history-backfill.yml");

  assert.match(backfill, /probeIdefixHistoricalMetadata/u);
  assert.match(backfill, /probe\.fetchErrorCount > 0/u);
  assert.match(backfill, /acquireBookIndexSchedulerLease/u);
  assert.match(backfill, /releaseBookIndexSchedulerLease\(lease\.token\)/u);
  assert.match(backfill, /matchStatus !== "unmatched"/u);
  assert.match(backfill, /current\.masterBookId/u);
  assert.match(backfill, /authorName,/u);
  assert.match(backfill, /normalizedAuthor:/u);
  assert.match(backfill, /isbn13,/u);
  assert.match(backfill, /autoMatchBookIndexExternalBook/u);
  assert.match(backfill, /current\.lastSeenAt/u);

  assert.doesNotMatch(backfill, /bookIndexObservation\.(?:create|update|delete|upsert)/u);
  assert.doesNotMatch(backfill, /bookIndexFetchRun\.(?:create|update|delete|upsert)/u);
  assert.doesNotMatch(backfill, /sourceKey\s*:/u);
  assert.doesNotMatch(backfill, /rank\s*:/u);
  assert.doesNotMatch(backfill, /lastSeenAt\s*:/u);
  assert.doesNotMatch(backfill, /firstSeenAt\s*:/u);

  assert.match(route, /export async function POST/u);
  assert.doesNotMatch(route, /export async function GET/u);
  assert.match(route, /ilkoku-book-index-idefix-history-backfill/u);
  assert.match(workflow, /id-token: write/u);
  assert.match(workflow, /cancel-in-progress: false/u);
});
