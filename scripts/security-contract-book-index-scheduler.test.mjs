import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Book Index scheduler supports an OIDC-protected one-time matching backfill", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const workflow = source(".github/workflows/book-index-scheduler.yml");
  const readiness = source("src/lib/book-index/readiness.ts");

  contains(route, "matchPendingBookIndexBooks", "matching backfill service");
  contains(route, 'searchParams.get("matchPending") === "1"', "explicit backfill switch");
  contains(route, "matchingBackfill", "backfill result reporting");
  contains(workflow, "workflow_run:", "temporary production backfill trigger");
  contains(workflow, "?matchPending=1", "one-time backfill request");
  contains(workflow, 'cron: "17 * * * *"', "hourly cron remains active");
  contains(readiness, "maxCompositeSourcesPerBook", "maximum overlap diagnostic");
  contains(readiness, "booksOnAtLeast2CompositeSources", "two-source overlap diagnostic");
  contains(readiness, "booksOnAtLeast3CompositeSources", "three-source overlap diagnostic");
});
