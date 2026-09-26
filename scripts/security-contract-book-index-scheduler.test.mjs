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
  notContains(workflow, "workflow_run:", "one-time KitaplarSepette trigger removed");
  notContains(workflow, "?matchPending=1", "one-time backfill request removed");
  contains(route, 'ALLOWED_GITHUB_EVENTS = new Set([', "OIDC event allowlist");
  notContains(route, '"workflow_run"', "one-time workflow-run authorization removed");
  notContains(route, "matchPendingBookIndexBooks", "one-time matching backfill removed");
  notContains(route, 'searchParams.get("matchPending")', "maintenance switch removed");
  contains(readiness, "splitMasterCollisionCount", "collision diagnostic retained");
  contains(readiness, "splitMasterCollisionSamples", "collision samples retained");
  contains(readiness, "normalizedIdentityKeysOnAtLeast2Sources", "cross-source identity diagnostic retained");
});









test("Book Index KitaplarSepette canary health is read-only and the one-time probe is removed", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const workflow = source(".github/workflows/book-index-scheduler.yml");
  const readiness = source("src/lib/book-index/readiness.ts");

  notContains(workflow, "workflow_run:", "temporary production-smoke trigger removed");
  notContains(workflow, "?forceKitaplarSepetteCanary=1", "force canary query removed");
  notContains(route, "forceKitaplarSepetteCanary", "force canary route removed");
  notContains(route, "forcedKitaplarSepetteCanaryRun", "force canary response removed");
  contains(readiness, "kitaplarSepetteCanaryHealth", "canary health snapshot");
  contains(readiness, 'where: { code: "kitaplarsepette-tr-live-canary" }', "canary list lookup");
  contains(readiness, "errorCode: true", "canary error code diagnostic");
  contains(readiness, "errorMessage: true", "canary error message diagnostic");
  contains(readiness, "itemsStored: true", "canary item count diagnostic");
});
