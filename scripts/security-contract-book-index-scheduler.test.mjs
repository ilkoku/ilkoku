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

test("Book Index scheduler endpoint accepts scoped GitHub OIDC and keeps secret fallback", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const env = source(".env.example");

  contains(route, "createRemoteJWKSet", "GitHub OIDC JWKS verification");
  contains(route, "jwtVerify", "GitHub OIDC JWT verification");
  contains(route, 'GITHUB_OIDC_AUDIENCE = "ilkoku-book-index-scheduler"', "dedicated audience");
  contains(route, 'GITHUB_REPOSITORY_ID = "1304046004"', "immutable repository identity");
  contains(route, "book-index-scheduler.yml@refs/heads/main", "main scheduler workflow restriction");
  contains(route, "ALLOWED_GITHUB_EVENTS", "scheduler event allowlist");
  contains(route, "BOOK_INDEX_SCHEDULER_SECRET", "legacy dedicated secret fallback");
  contains(route, "timingSafeEqual", "timing-safe legacy fallback");
  contains(route, "configured.length < 32", "minimum legacy secret length");
  contains(route, "runBookIndexScheduler", "scheduler execution");
  contains(route, "getBookIndexReadinessSnapshot", "readiness evidence in scheduler response");
  contains(route, "getBookIndexSeoGateSnapshot", "SEO gate evidence in scheduler response");
  contains(env, 'BOOK_INDEX_SCHEDULER_SECRET="CHANGE_ME_WITH_AT_LEAST_32_RANDOM_CHARACTERS"', "legacy environment contract");
});

test("Book Index automatic cron stays active while a temporary post-smoke readiness probe runs", () => {
  const workflow = source(".github/workflows/book-index-scheduler.yml");
  const admin = source("src/app/admin/kitap-endeksi/page.tsx");
  const rollout = source("docs/operations/book-index-scheduler-rollout.md");

  contains(workflow, "workflow_dispatch:", "manual operations trigger");
  contains(workflow, "schedule:", "automatic scheduler trigger");
  contains(workflow, 'cron: "17 * * * *"', "hourly scheduler cadence");
  contains(workflow, "workflow_run:", "temporary post-smoke readiness probe");
  contains(workflow, "Production smoke", "deployment-aware readiness probe");
  contains(workflow, "id-token: write", "OIDC token permission");
  contains(workflow, "ACTIONS_ID_TOKEN_REQUEST_URL", "OIDC token request");
  contains(workflow, "ilkoku-book-index-scheduler", "dedicated OIDC audience");
  contains(workflow, "/api/internal/book-index-scheduler", "internal scheduler endpoint");
  contains(workflow, '"readiness" in payload', "deployment-aware readiness response guard");
  contains(workflow, '"seoGate" in payload', "deployment-aware SEO gate response guard");
  contains(admin, "GitHub OIDC hazır", "admin authentication readiness");
  contains(admin, "Saatlik scheduler aktif", "admin automatic scheduling state");
  contains(rollout, "AUTOMATIC_CRON_ENABLED / CANARY_PASS", "activated rollout state");
});

test("Book Index admin exposes active scheduler readiness after canary pass", () => {
  const operations = source("src/lib/book-index/operations.ts");
  const page = source("src/app/admin/kitap-endeksi/page.tsx");

  contains(operations, "getBookIndexOperationsSnapshot", "operations read model");
  contains(operations, "latest.startedAt.getTime() + cadenceMinutes * 60_000", "next-due calculation");
  contains(operations, 'status: { in: ["success", "no_change"] }', "last-success calculation");
  contains(operations, 'schedulerAuthMode: "github_oidc"', "OIDC readiness mode");
  contains(page, "Operasyon görünümü", "admin operations section");
  contains(page, "Son başarılı", "last-success column");
  contains(page, "Sonraki due", "next-due column");
  contains(page, "GitHub OIDC hazır", "OIDC authentication readiness state");
  contains(page, "Saatlik scheduler aktif", "active scheduler state");
});
