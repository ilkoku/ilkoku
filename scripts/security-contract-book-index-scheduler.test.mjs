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
  contains(workflow, "- Email operations", "relay follows natural Email operations delivery");
  contains(workflow, "- Book Index readiness probe", "relay follows natural readiness probe delivery");
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
  notContains(route, '"push"', "retired marker-push OIDC authorization");
  contains(
    route,
    'FORCE_LISTS_HEADER = "x-ilkoku-book-index-force-lists"',
    "forced refresh uses a dedicated authenticated header",
  );
  contains(route, "MAX_FORCED_LISTS = 12", "forced refresh remains bounded");
  contains(
    route,
    "getBookIndexList(listCode)",
    "forced refresh validates list registry membership",
  );
  contains(
    route,
    "collectBookIndexListByCode(listCode)",
    "forced refresh uses the existing list collector",
  );
  notContains(
    workflow,
    ".book-index-force-refresh",
    "force refresh no longer depends on a repository marker",
  );
  notContains(
    workflow,
    "push:",
    "force refresh no longer uses repository pushes",
  );
  contains(
    workflow,
    "force_lists:",
    "manual dispatch exposes bounded force-list input",
  );
  contains(
    workflow,
    "DISPATCH_FORCE_LISTS:",
    "manual dispatch forwards force-list input without a commit",
  );
  contains(
    workflow,
    'X-IlkOku-Book-Index-Force-Lists: $force_lists',
    "workflow forwards bounded forced list codes",
  );
  contains(
    workflow,
    'payload.get("forced") is True',
    "workflow retries until the production forced-refresh route is deployed",
  );
  const forceRequest = source(".github/workflows/book-index-force-request.yml");
  contains(forceRequest, "issues:", "deployless force request uses issue events");
  contains(forceRequest, "github.actor == 'ilkoku'", "force request is owner-gated");
  contains(forceRequest, "[book-index-force] ", "force request command prefix");
  contains(forceRequest, "gh workflow run book-index-scheduler.yml", "force request dispatches scheduler");
  contains(forceRequest, "-f \"force_lists=$FORCE_LISTS\"", "force request passes explicit list codes");
  contains(forceRequest, "gh issue close", "force request closes the one-shot command issue");
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











test("Book Index scheduler invalidates public Book Index ISR routes after collection", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");

  contains(route, 'import { revalidatePath } from "next/cache";', "Next cache invalidation import");
  contains(route, '"/en-cok-satanlar/dunya"', "global bestseller ISR path");
  contains(route, '"/yeni-cikanlar"', "new releases ISR path");
  contains(route, '"/en-cok-satanlar/turkiye"', "Turkey bestseller public path");
  contains(route, "revalidateBookIndexPublicPages();", "scheduler invalidates public Book Index pages");
  contains(route, "revalidatePath(path);", "bounded path revalidation loop");
});

test("Book Index KitaplarSepette canary health is read-only and the one-time probe is removed", () => {
  const route = source("src/app/api/internal/book-index-scheduler/route.ts");
  const workflow = source(".github/workflows/book-index-scheduler.yml");
  const readiness = source("src/lib/book-index/readiness.ts");

  notContains(workflow, "Production smoke", "temporary production-smoke relay remains removed");
  contains(workflow, "- Email operations", "steady-state relay keeps Email operations");
  contains(workflow, "- Book Index readiness probe", "steady-state relay also uses readiness probe");
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
    'GITHUB_OIDC_HEADER = "x-ilkoku-github-oidc"',
    "dedicated readiness OIDC forwarding header",
  );
  contains(
    route,
    'request.headers.get(GITHUB_OIDC_HEADER)',
    "readiness accepts OIDC from the forwarding-safe header",
  );
  contains(
    route,
    'authorization.startsWith("Bearer ")',
    "readiness retains Bearer authorization fallback",
  );
  contains(
    route,
    'book-index-readiness.yml@refs/heads/main',
    "readiness workflow identity binding",
  );
  contains(route, '"workflow_run"', "post-CI workflow-run authorization");
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
  contains(
    workflow,
    'X-IlkOku-GitHub-OIDC: $oidc_token',
    "readiness sends OIDC through the dedicated forwarding header",
  );
  contains(workflow, "OIDC_SAFE_CLAIMS=", "readiness logs only a labelled safe OIDC claim summary");
  for (const safeClaim of [
    "repository",
    "repository_id",
    "workflow_ref",
    "ref",
    "event_name",
  ]) {
    contains(workflow, `"${safeClaim}"`, `safe OIDC diagnostic claim: ${safeClaim}`);
  }
  notContains(
    workflow,
    'print(os.environ["OIDC_TOKEN"])',
    "raw OIDC token must never be printed",
  );
  notContains(
    workflow,
    'print("OIDC_TOKEN="',
    "raw OIDC token must never be labelled into logs",
  );
  contains(workflow, "workflow_run:", "post-CI production probe trigger");
  contains(workflow, "- CI", "readiness waits for main CI completion");
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



test("Book Index readiness exposes read-only new-release collector health", () => {
  const route = source("src/app/api/internal/book-index-readiness/route.ts");
  const workflow = source(".github/workflows/book-index-readiness.yml");

  contains(
    route,
    'list.categoryKey === "new-releases"',
    "new-release diagnostics are scoped by registry category",
  );
  contains(
    route,
    'row.listCode.endsWith("-new-releases")',
    "new-release operations rows are isolated",
  );
  contains(
    route,
    "latestRunErrorCode: row.latestRunErrorCode",
    "new-release diagnostic exposes latest failure code",
  );
  contains(
    route,
    "lastSuccessfulRunAt: row.lastSuccessfulRunAt",
    "new-release diagnostic exposes last success",
  );
  contains(
    route,
    "newReleaseLists,",
    "readiness operations response includes new-release list diagnostics",
  );
  contains(
    workflow,
    '"newReleaseLists"',
    "readiness workflow requires new-release diagnostics",
  );
  notContains(
    route,
    "collectBookIndexListByCode",
    "new-release readiness diagnostics remain collection-free",
  );
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
  contains(workflow, "- Book Index readiness probe", "successful readiness probe relay remains");
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
    "probe response preserves the all-list operational coverage metric",
  );
  contains(
    route,
    "matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent",
    "SEO evidence uses the latest Turkey composite coverage metric",
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
