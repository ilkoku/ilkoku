import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("historical idefix backfill dry run is bounded and read-only", () => {
  const diagnostic = source("src/lib/book-index/idefix-historical-backfill.ts");
  const route = source("src/app/api/internal/book-index-historical-backfill-dry-run/route.ts");
  const workflow = source(".github/workflows/book-index-historical-backfill-dry-run.yml");

  assert.match(diagnostic, /const MAX_LIMIT = 100;/u);
  assert.match(diagnostic, /const DETAIL_CONCURRENCY = 6;/u);
  assert.match(diagnostic, /matchStatus: "unmatched"/u);
  assert.match(diagnostic, /masterBookId: null/u);
  assert.match(diagnostic, /sourceId: source\.id/u);
  assert.match(diagnostic, /fetchIdefixProductDetails/u);
  assert.doesNotMatch(diagnostic, /bookIndexObservation\.(?:create|update|delete)/u);
  assert.doesNotMatch(diagnostic, /bookIndexFetchRun\.(?:create|update|delete)/u);
  assert.doesNotMatch(diagnostic, /bookIndexExternalBook\.(?:create|update|delete|upsert)/u);
  assert.doesNotMatch(diagnostic, /bookIndexBook\.(?:create|update|delete|upsert)/u);

  assert.match(route, /export async function GET/u);
  assert.doesNotMatch(route, /export async function POST/u);
  assert.match(route, /maxDuration = 300/u);
  assert.match(route, /ilkoku-book-index-historical-backfill-dry-run/u);
  assert.match(workflow, /id-token: write/u);
  assert.match(workflow, /workflow_dispatch:/u);
});
