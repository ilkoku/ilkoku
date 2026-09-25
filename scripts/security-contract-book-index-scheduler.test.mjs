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

test("Book Index scheduler respects list cadence and isolates source failures", () => {
  const scheduler = source("src/lib/book-index/scheduler.ts");

  contains(scheduler, "for (const listDefinition of BOOK_INDEX_LISTS)", "registry-driven scheduler");
  contains(scheduler, "listDefinition.collectionEveryMinutes * 60_000", "per-list cadence");
  contains(scheduler, "latest.startedAt.getTime() + intervalMs", "last-run due boundary");
  contains(scheduler, 'status: "not_due"', "not-due skip state");
  contains(scheduler, "await collectBookIndexListByCode(listDefinition.code)", "collector execution");
  contains(scheduler, 'status: "failed"', "per-list failure capture");
  contains(scheduler, "continue;", "list isolation");
});

test("Book Index scheduler endpoint requires its own timing-safe bearer secret", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const env = source(".env.example");

  contains(route, "BOOK_INDEX_SCHEDULER_SECRET", "dedicated scheduler secret");
  contains(route, "timingSafeEqual", "timing-safe auth");
  contains(route, "configured.length < 32", "minimum secret length");
  contains(route, "runBookIndexScheduler", "scheduler execution");
  contains(route, "BOOK_INDEX_SCHEDULER_SECRET_MISSING", "missing-secret fail closed");
  contains(env, 'BOOK_INDEX_SCHEDULER_SECRET="CHANGE_ME_WITH_AT_LEAST_32_RANDOM_CHARACTERS"', "environment contract");
});

test("Book Index automatic cron stays off until the manual canary passes", () => {
  const workflow = source(".github/workflows/book-index-scheduler.yml");
  const admin = source("src/app/admin/kitap-endeksi/page.tsx");
  const rollout = source("docs/operations/book-index-scheduler-rollout.md");

  contains(workflow, "workflow_dispatch:", "manual canary trigger");
  contains(workflow, "secrets.BOOK_INDEX_SCHEDULER_SECRET", "dedicated GitHub secret");
  contains(workflow, "/api/internal/book-index-scheduler", "internal scheduler endpoint");
  notContains(workflow, "schedule:", "no premature automatic cron");
  contains(admin, "Otomatik scheduler bu aşamada kapalıdır", "admin truthfulness");
  contains(rollout, "AUTOMATIC_CRON_DISABLED / CANARY_READY", "staged rollout state");
});
