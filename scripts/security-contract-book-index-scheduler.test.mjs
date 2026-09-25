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
  contains(workflow, "workflow_run:", "temporary Illa Kitap probe trigger");
  notContains(workflow, "?matchPending=1", "one-time backfill request removed");
  contains(route, 'ALLOWED_GITHUB_EVENTS = new Set([', "OIDC event allowlist");
  contains(route, '"workflow_run"', "temporary Illa Kitap probe authorization");
  notContains(route, "matchPendingBookIndexBooks", "one-time matching backfill removed");
  notContains(route, 'searchParams.get("matchPending")', "maintenance switch removed");
  contains(readiness, "splitMasterCollisionCount", "collision diagnostic retained");
  contains(readiness, "splitMasterCollisionSamples", "collision samples retained");
  contains(readiness, "normalizedIdentityKeysOnAtLeast2Sources", "cross-source identity diagnostic retained");
});




test("Book Index one-time Illa Kitap production probe is tightly scoped", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const workflow = source(".github/workflows/book-index-scheduler.yml");

  contains(workflow, "workflow_run:", "temporary production-smoke trigger");
  contains(workflow, "Production smoke", "probe source workflow");
  contains(workflow, "github.event.workflow_run.conclusion == 'success'", "success-only probe");
  contains(workflow, "github.event.workflow_run.head_branch == 'main'", "main-only probe");
  contains(workflow, "?forceIlla=1", "explicit Illa Kitap force flag");
  contains(route, 'collectBookIndexListByCode("illakitap-tr-weekly")', "single forced list");
  contains(route, "forcedIllaRun", "forced collection result reporting");
  notContains(route, "kitapzen-tr-weekly", "probe does not force unrelated sources");
  notContains(route, "inkilap-tr-live", "probe does not force unrelated sources");
});
