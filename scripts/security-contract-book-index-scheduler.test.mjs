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

test("Book Index scheduler keeps production cron and read-only diagnostics after one-time maintenance", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const workflow = source(".github/workflows/book-index-scheduler.yml");
  const readiness = source("src/lib/book-index/readiness.ts");

  contains(workflow, "workflow_dispatch:", "manual operations trigger");
  contains(workflow, "schedule:", "automatic scheduler trigger");
  contains(workflow, 'cron: "17 * * * *"', "hourly cron remains active");
  notContains(workflow, "workflow_run:", "temporary production trigger removed");
  notContains(workflow, "?matchPending=1", "one-time backfill request removed");
  contains(route, 'ALLOWED_GITHUB_EVENTS = new Set([', "OIDC event allowlist");
  notContains(route, '"workflow_run"', "temporary workflow-run authorization removed");
  notContains(route, "matchPendingBookIndexBooks", "one-time matching backfill removed");
  notContains(route, 'searchParams.get("matchPending")', "maintenance switch removed");
  contains(readiness, "splitMasterCollisionCount", "collision diagnostic retained");
  contains(readiness, "splitMasterCollisionSamples", "collision samples retained");
  contains(readiness, "normalizedIdentityKeysOnAtLeast2Sources", "cross-source identity diagnostic retained");
});


test("Book Index scheduler repairs only conservative legacy split masters", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const matching = source("src/lib/book-index/matching.ts");

  contains(route, "repairSafeSplitBookIndexMasters", "scheduler self-healing");
  contains(route, "splitMasterRepair", "repair result reporting");
  contains(matching, 'book.matchStatus === "manual_matched"', "manual match protection");
  contains(matching, 'mastersWithIsbn.length !== 1', "single authoritative ISBN master guard");
  contains(matching, "loserExternalBooks.some", "loser ISBN guard");
  contains(matching, "conflictingExternalIsbn", "ISBN conflict guard");
  contains(matching, "masterBookId: target.id", "safe external-book reassignment");
  contains(matching, "externalBooks: { none: {} }", "delete only orphaned duplicate masters");
});
