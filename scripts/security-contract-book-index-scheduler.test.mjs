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
  const scheduler = source("src/lib/book-index/scheduler.ts");
  const readiness = source("src/lib/book-index/readiness.ts");

  contains(workflow, "workflow_dispatch:", "manual operations trigger");
  contains(workflow, "schedule:", "automatic scheduler trigger");
  contains(workflow, 'cron: "17 * * * *"', "primary hourly cron remains active");
  contains(workflow, 'cron: "47 * * * *"', "fallback hourly cron protects missed GitHub schedule windows");
  contains(scheduler, "nextDueAt.getTime() > now.getTime()", "fallback remains cadence due-aware");
  contains(scheduler, 'status: "not_due"', "fallback skips lists that are not due");
  notContains(workflow, "workflow_run:", "one-time KitaplarSepette trigger removed");
  notContains(workflow, "?matchPending=1", "one-time backfill request removed");
  contains(route, 'ALLOWED_GITHUB_EVENTS = new Set([', "OIDC event allowlist");
  notContains(route, '"workflow_run"', "one-time workflow-run authorization removed");
  notContains(route, "matchPendingBookIndexBooks", "one-time matching backfill removed");
  notContains(route, 'searchParams.get("matchPending")', "maintenance switch removed");
  contains(readiness, "splitMasterCollisionCount", "collision diagnostic retained");
  contains(readiness, "splitMasterCollisionSamples", "collision samples retained");
  contains(readiness, "normalizedIdentityKeysOnAtLeast2Sources", "cross-source identity diagnostic retained");
  contains(
    workflow,
    '"unmatchedDuplicateIdentityGroupCount"',
    "scheduler waits for sourceKey-churn diagnostic schema",
  );
  contains(
    workflow,
    '"leastSuccessfulRunCountSourceCodes"',
    "scheduler waits for history-floor source diagnostics",
  );
  contains(
    workflow,
    '"unmatchedMissingAuthorBooksBySource"',
    "scheduler waits for missing-author diagnostic schema",
  );
  contains(
    workflow,
    '"unmatchedAmbiguousIdentityGroupCount"',
    "scheduler waits for ambiguous-master diagnostic schema",
  );
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

test("Book Index scheduler exposes overdue duration as read-only operations evidence", () => {
  const operations = source("src/lib/book-index/operations.ts");
  const admin = source("src/app/admin/kitap-endeksi/page.tsx");
  const workflow = source(".github/workflows/book-index-scheduler.yml");

  contains(operations, "maxOverdueMinutes", "scheduler overdue duration diagnostic");
  contains(operations, "dueRows.reduce", "overdue duration derives from due rows");
  contains(operations, "now.getTime() - row.nextDueAt.getTime()", "overdue duration uses cadence due time");
  contains(admin, "operations.maxOverdueMinutes", "admin overdue duration evidence");
  contains(admin, "En uzun cadence gecikmesi", "admin overdue duration label");
  contains(workflow, 'cron: "17 * * * *"', "steady-state cron stays unchanged");
  notContains(admin, "Scheduler bozuk", "admin does not invent scheduler failure verdict");
});



test("Book Index readiness probe is OIDC-protected and collection-free", () => {
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");

  contains(
    route,
    'GITHUB_OIDC_AUDIENCE = "ilkoku-book-index-readiness"',
    "dedicated readiness OIDC audience",
  );
  contains(
    route,
    'book-index-readiness.yml@refs/heads/main',
    "readiness workflow identity binding",
  );
  contains(route, '"push"', "push event authorization");
  contains(route, '"workflow_dispatch"', "manual read-only authorization");
  contains(route, "export async function GET", "read-only HTTP method");
  contains(route, "getBookIndexReadinessSnapshot", "readiness snapshot query");
  contains(route, "getBookIndexSeoGatePolicy", "SEO gate policy query");
  contains(route, "evaluateBookIndexSeoGate", "SEO gate evaluation");
  contains(route, "getBookIndexPublicReadModel", "Turkey item evidence query");
  notContains(route, "runBookIndexScheduler", "readiness route never runs collection");
  notContains(route, "collectBookIndex", "readiness route never invokes collector");

  contains(workflow, "id-token: write", "OIDC token permission");
  contains(workflow, "push:", "post-merge production probe trigger");
  contains(workflow, "workflow_dispatch:", "manual read-only probe trigger");
  contains(
    workflow,
    "https://ilkoku.com/api/internal/book-index-readiness",
    "production readiness endpoint",
  );
  notContains(
    workflow,
    "book-index-scheduler",
    "readiness workflow never calls scheduler endpoint",
  );
});

test("Book Index readiness exposes source-level unmatched cause aggregates", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");

  contains(
    readiness,
    "unmatchedDuplicateIdentityGroupsBySource",
    "source-level duplicate identity aggregate",
  );
  contains(
    readiness,
    "unmatchedMissingAuthorBooksBySource",
    "source-level missing-author aggregate",
  );
  contains(
    readiness,
    "unmatchedAmbiguousIdentityGroupsBySource",
    "source-level ambiguous-master aggregate",
  );
  contains(
    route,
    "unmatchedDuplicateIdentityGroupsBySource",
    "probe returns duplicate-identity aggregate",
  );
  contains(
    route,
    "unmatchedMissingAuthorBooksBySource",
    "probe returns missing-author aggregate",
  );
  contains(
    route,
    "unmatchedAmbiguousIdentityGroupsBySource",
    "probe returns ambiguous-master aggregate",
  );
});


test("temporary idefix schema probe is OIDC-protected and collection-free", () => {
  const route = source("src/app/api/internal/book-index-idefix-schema/route.ts");
  const workflow = source(".github/workflows/book-index-idefix-schema-probe.yml");

  contains(
    route,
    'GITHUB_OIDC_AUDIENCE = "ilkoku-idefix-schema-probe"',
    "dedicated idefix schema probe audience",
  );
  contains(
    route,
    'book-index-idefix-schema-probe.yml@refs/heads/main',
    "idefix probe workflow identity binding",
  );
  contains(route, "export async function GET", "read-only idefix schema method");
  contains(
    route,
    '"User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)"',
    "probe mirrors production collector user agent",
  );
  contains(route, "__NEXT_DATA__", "probe inspects collector data source");
  contains(route, "collectRelevantNodes", "probe limits output to schema evidence");
  notContains(route, "runBookIndexScheduler", "probe never runs scheduler");
  notContains(route, "autoMatchBookIndexExternalBook", "probe never mutates matching");
  notContains(route, "prisma.", "probe never writes or reads Book Index database");

  contains(workflow, "id-token: write", "idefix probe OIDC permission");
  contains(
    workflow,
    "https://ilkoku.com/api/internal/book-index-idefix-schema",
    "idefix production schema endpoint",
  );
  contains(
    workflow,
    "printf '%s\\n' \"$response\" | python3 -m json.tool",
    "idefix probe JSON print remains one shell line",
  );
  notContains(
    workflow,
    "api/internal/book-index-scheduler",
    "idefix probe never calls scheduler endpoint",
  );
});
