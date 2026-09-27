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
  contains(workflow, "workflow_run:", "automated cross-workflow delivery relay");
  contains(workflow, "workflows:", "relay workflow allowlist");
  contains(workflow, "- Email operations", "relay follows the hourly Email operations workflow");
  contains(
    workflow,
    "- Book Index readiness probe",
    "relay also follows the passive Book Index readiness workflow",
  );
  contains(workflow, "- completed", "relay waits for workflow completion");
  contains(
    workflow,
    "github.event.workflow_run.conclusion == 'success'",
    "relay only runs after a successful upstream workflow",
  );
  contains(
    workflow,
    "github.event.workflow_run.event == 'schedule'",
    "relay only accepts natural scheduled upstream runs",
  );
  notContains(workflow, "?matchPending=1", "one-time backfill request removed");
  contains(route, 'ALLOWED_GITHUB_EVENTS = new Set([', "OIDC event allowlist");
  contains(route, '"workflow_run"', "relay workflow-run OIDC event authorization");
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

  notContains(workflow, "Production smoke", "temporary production-smoke relay remains removed");
  contains(workflow, "- Email operations", "steady-state relay includes Email operations");
  contains(
    workflow,
    "- Book Index readiness probe",
    "steady-state relay includes passive readiness delivery",
  );
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
  contains(admin, "GitHub schedule tanımlı", "admin reports configured schedule without claiming delivery");
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
  contains(route, '"schedule"', "scheduled read-only authorization");
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
  contains(workflow, "schedule:", "passive scheduled readiness observer trigger");
  contains(workflow, 'cron: "7 * * * *"', "first passive readiness observation window");
  contains(workflow, 'cron: "37 * * * *"', "second passive readiness observation window");
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


test("Book Index readiness probe exposes overdue operations evidence without collection", () => {
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");

  contains(
    route,
    "getBookIndexOperationsSnapshot",
    "read-only Book Index operations snapshot",
  );
  contains(route, "dueCount: operations.dueCount", "probe due-list count");
  contains(
    route,
    "maxOverdueMinutes: operations.maxOverdueMinutes",
    "probe maximum overdue duration",
  );
  contains(route, "dueLists: operations.rows", "probe bounded due-list evidence");
  notContains(route, "runBookIndexScheduler", "readiness probe never runs scheduler");
  notContains(route, "collectBookIndexListByCode", "readiness probe never collects sources");

  contains(
    route,
    "schedulerSecretConfigured",
    "probe exposes scheduler secret configured state only",
  );
  contains(
    workflow,
    '"schedulerSecretConfigured"',
    "workflow prints scheduler secret configured state",
  );
  notContains(
    route,
    "BOOK_INDEX_SCHEDULER_SECRET",
    "readiness probe never reads or exposes the scheduler secret value",
  );
  contains(workflow, '"dueCount"', "workflow requires due-count evidence");
  contains(workflow, '"maxOverdueMinutes"', "workflow requires overdue duration");
  contains(workflow, '"dueLists"', "workflow prints overdue list evidence");
  contains(
    route,
    "unmatchedMissingAuthorWithIsbnBooksBySource",
    "probe exposes missing-author records with ISBN",
  );
  contains(
    route,
    "unmatchedMissingAuthorWithoutIsbnBooksBySource",
    "probe exposes missing-author records without ISBN",
  );
  contains(
    workflow,
    '"unmatchedMissingAuthorWithIsbnBooksBySource"',
    "workflow prints missing-author ISBN-present evidence",
  );
  contains(
    workflow,
    '"unmatchedMissingAuthorWithoutIsbnBooksBySource"',
    "workflow prints missing-author ISBN-absent evidence",
  );
  for (const metric of [
    "normalizedIdentityKeysOnAtLeast2Sources",
    "normalizedIdentityKeysOnAtLeast3Sources",
    "isbn13KeysOnAtLeast2Sources",
    "isbn13KeysOnAtLeast3Sources",
    "splitMasterCollisionCount",
    "normalizedTitleDifferentAuthorCount",
    "editionFamilyVariantOverlapCount",
  ]) {
    contains(route, metric, `readiness probe safety metric ${metric}`);
    contains(workflow, `"${metric}"`, `workflow safety metric ${metric}`);
  }
  contains(
    route,
    "normalizedTitleDifferentAuthorSamples",
    "probe exposes bounded title-author overlap samples",
  );
  contains(
    workflow,
    '"normalizedTitleDifferentAuthorSamples"',
    "workflow prints bounded title-author overlap samples",
  );
  contains(route, "failures: seoGate.failures", "probe SEO failure evidence");
  contains(route, "evidence: seoGate.evidence", "probe SEO evidence payload");
});


test("Book Index retries unsuccessful runs without resetting the full source cadence", () => {
  const due = source("src/lib/book-index/due.ts");
  const scheduler = source("src/lib/book-index/scheduler.ts");
  const operations = source("src/lib/book-index/operations.ts");
  const workflow = source(".github/workflows/book-index-scheduler.yml");

  contains(
    due,
    "BOOK_INDEX_UNSUCCESSFUL_RETRY_MINUTES = 30",
    "bounded unsuccessful-run retry backoff",
  );
  contains(
    due,
    'status === "success" || status === "no_change"',
    "successful runs keep the configured cadence",
  );
  contains(
    due,
    "Math.min(cadenceMinutes, BOOK_INDEX_UNSUCCESSFUL_RETRY_MINUTES)",
    "unsuccessful retry never exceeds the source cadence",
  );
  contains(
    scheduler,
    "nextBookIndexDueAt",
    "scheduler uses shared due-time semantics",
  );
  contains(
    scheduler,
    "status: true",
    "scheduler reads the latest run status for retry timing",
  );
  notContains(
    scheduler,
    "const intervalMs = listDefinition.collectionEveryMinutes * 60_000",
    "scheduler no longer resets the full cadence after failed attempts",
  );
  contains(
    operations,
    "nextBookIndexDueAt",
    "operations evidence uses the same retry timing",
  );
  contains(workflow, 'cron: "17 * * * *"', "primary hourly scheduler remains");
  contains(workflow, 'cron: "47 * * * *"', "half-hour fallback remains");
  contains(workflow, "- Email operations", "successful Email operations relay remains");
  contains(
    workflow,
    "- Book Index readiness probe",
    "successful readiness relay remains",
  );
  contains(
    workflow,
    "github.event.workflow_run.conclusion == 'success'",
    "relay ignores unsuccessful upstream workflow runs",
  );
  contains(
    workflow,
    "github.event.workflow_run.event == 'schedule'",
    "relay ignores manually dispatched upstream runs",
  );
});


test("Book Index readiness distinguishes historical coverage from latest composite snapshot coverage", () => {
  const readiness = source("src/lib/book-index/readiness.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");

  for (const metric of [
    "latestCompositeExternalBookCount",
    "latestCompositeMatchedExternalBookCount",
    "latestCompositeUnmatchedExternalBookCount",
    "latestCompositeUnmatchedBooksBySource",
    "latestCompositeUnmatchedSamples",
    "latestCompositeMatchCoveragePercent",
  ]) {
    contains(readiness, metric, `readiness latest composite metric ${metric}`);
    contains(route, metric, `probe latest composite metric ${metric}`);
    contains(workflow, `"${metric}"`, `workflow latest composite metric ${metric}`);
  }

  contains(
    readiness,
    "latestCompositeExternalBooks.set(book.id",
    "latest composite coverage deduplicates external books by record id",
  );
  contains(
    readiness,
    ".slice(0, 30)",
    "latest composite unmatched evidence stays bounded",
  );
  contains(
    readiness,
    "productUrl: book.productUrl",
    "latest composite unmatched samples retain source evidence",
  );
  contains(
    route,
    "matchCoveragePercent: readiness.matchCoveragePercent",
    "SEO evidence keeps the existing historical coverage input in this diagnostic change",
  );
  notContains(
    route,
    "matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent",
    "diagnostic does not silently switch SEO gate coverage semantics",
  );
});


test("Book Index scheduler uses a database lease across GitHub and external triggers", () => {
  const schema = source("prisma/schema.prisma");
  const lease = source("src/lib/book-index/scheduler-lease.ts");
  const scheduler = source("src/lib/book-index/scheduler.ts");
  const migration = source(
    "prisma/migrations/20260927121500_book_index_scheduler_lease/migration.sql",
  );

  contains(schema, "model BookIndexSchedulerLease {", "scheduler lease model");
  contains(schema, "leaseKey    String   @id", "one row per scheduler lease key");
  contains(schema, "lockedUntil DateTime", "crash-safe expiring lease");
  contains(migration, "CREATE TABLE `BookIndexSchedulerLease`", "scheduler lease migration");
  contains(lease, 'const LEASE_KEY = "book-index-scheduler";', "stable lease key");
  contains(lease, "const LEASE_DURATION_MS = 10 * 60_000;", "bounded lease duration");
  contains(lease, "lockedUntil: { lte: now }", "expired lease takeover is conditional");
  contains(lease, '(error as { code?: unknown }).code === "P2002"', "concurrent insert collision is treated as busy");
  contains(lease, "deleteMany", "lease release uses a bounded delete");
  contains(lease, "token,", "lease ownership token");
  contains(scheduler, "acquireBookIndexSchedulerLease(now)", "scheduler acquires cross-trigger lease");
  contains(scheduler, "if (!lease.acquired)", "busy scheduler exits without collection");
  contains(scheduler, "runBookIndexSchedulerUnlocked(now)", "collector runs only under the lease");
  contains(scheduler, "releaseBookIndexSchedulerLease(lease.token)", "scheduler releases its own lease");
});
