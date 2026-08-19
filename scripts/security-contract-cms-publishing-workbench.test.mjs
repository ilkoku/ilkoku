import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("publish queue is a master-detail decision workbench without bypassing canonical publish actions", () => {
  const queue = source("src/app/icerik/yayin-kuyrugu/page.tsx");

  assertContains(queue, "PublishingOperationsWorkbench.module.css", "publish queue workbench styling");
  assertContains(queue, "searchParams: Promise<QueueSearchParams>", "publish queue filter state");
  assertContains(queue, "queueHref(params", "publish queue selection navigation");
  assertContains(queue, "const selected = filtered.find", "publish queue selected decision record");
  assertContains(queue, "<PublishButton item={selected}", "publish queue selected canonical publish action");
  assertContains(queue, "publishRoleCardsAction", "role cards canonical publish action retained");
  assertContains(queue, "publishFaqAction", "faq canonical publish action retained");
  assertContains(queue, "saveCmsDocumentAction", "legal canonical publish action retained");
  assertContains(queue, "saveCmsGuideAction", "guide canonical publish action retained");
  assertContains(queue, "saveCmsPageAction", "page canonical publish action retained");
  assertContains(queue, "requireCmsManager(\"/icerik/yayin-kuyrugu\")", "queue manager boundary retained");
});

test("publish queue links only eligible first-publication targets into scheduling", () => {
  const queue = source("src/app/icerik/yayin-kuyrugu/page.tsx");

  assertContains(queue, "target?.status === \"draft\"", "site target first-publication schedule gate");
  assertContains(queue, "page.status === \"draft\"", "page first-publication schedule gate");
  assertContains(queue, "locale === \"tr\"", "TR schedule locale boundary");
  assertContains(queue, "encodeURIComponent(selected.scheduleTarget)", "queue to scheduler deep link");
  assertContains(queue, "mevcut scheduler akışında desteklenmiyor", "unsupported update scheduling is explicit");
});

test("scheduling uses selected target workbench instead of exposing a giant target dropdown", () => {
  const page = source("src/app/icerik/zamanlama/page.tsx");

  assertContains(page, "PublishingOperationsWorkbench.module.css", "schedule workbench styling");
  assertContains(page, "const selectedTarget =", "selected scheduling target");
  assertContains(page, "activeByTarget", "active plan target map");
  assertContains(page, "selectedPlan", "selected target duplicate-plan surface");
  assertContains(page, 'type="hidden" name="target" value={selectedTarget.value}', "selected target submitted server-side");
  assertNotContains(page, '<select name="target"', "legacy giant scheduling target dropdown");
  assertContains(page, 'selectedTarget.status === "draft"', "draft versus published planner split");
  assertContains(page, "runCmsSchedulerNowSafeAction", "safe scheduler integrity action retained");
  assertContains(page, "cancelCmsScheduleAction", "canonical schedule cancellation retained");
});

test("schedule mutation keeps server-side permission, state, duplicate and timezone protections", () => {
  const actions = source("src/features/cms/schedule-actions.ts");
  const scheduler = source("src/lib/cms-scheduler.ts");

  assertContains(actions, 'requireCmsPublisher("/icerik/zamanlama")', "schedule publisher boundary");
  assertContains(actions, 'target.status !== "draft"', "publish schedule draft-only boundary");
  assertContains(actions, 'target.status !== "published"', "unpublish schedule published-only boundary");
  assertContains(actions, "payload?.state === \"scheduled\"", "duplicate active-plan check");
  assertContains(actions, 'timezone: "Europe/Istanbul"', "Istanbul timezone persisted");
  assertContains(actions, "encodeURIComponent(rawTarget)", "selected target preserved after scheduling");
  assertContains(scheduler, 'return namespace === "homepage" || namespace === "faq"', "site scheduler scope retained");
  assertContains(scheduler, 'contentKey.startsWith("legal:en:") || contentKey.startsWith("guide:en:")', "EN schedule exclusion retained");
});
