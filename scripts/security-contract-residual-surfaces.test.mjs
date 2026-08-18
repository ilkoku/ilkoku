import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertNotContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("obsolete publisher submission write helpers stay removed", () => {
  const repository = source("src/features/publisher-workspace/repository.ts");

  assertNotContains(
    repository,
    "updatePublisherSubmissionDecision",
    "publisher workspace repository",
  );
  assertNotContains(
    repository,
    "addPublisherInternalNote",
    "publisher workspace repository",
  );
});

test("obsolete publisher notification query helper stays removed", () => {
  const queries = source("src/features/publisher-workspace/queries.ts");
  const enhanced = source("src/features/publisher-workspace/notification-center.ts");

  assertNotContains(
    queries,
    "getPublisherNotificationCenter",
    "publisher workspace queries",
  );
  assert.ok(
    enhanced.includes("resolveNotificationTargets"),
    "publisher notification center must stay on the central target resolver",
  );
});

test("CMS global search stays read-only and excludes sensitive operational namespaces", () => {
  const searchPage = source("src/app/icerik/arama/page.tsx");

  assert.ok(
    searchPage.includes("requireCmsManager(\"/icerik/arama\")"),
    "CMS search must keep the CMS manager boundary",
  );
  assert.ok(
    searchPage.includes("namespace IN ('homepage', 'homepage_en', 'faq', 'faq_en', 'announcement', 'media')"),
    "CMS search must use an explicit editorial namespace allowlist",
  );
  assert.ok(
    searchPage.includes("namespace = 'cms_draft'"),
    "CMS search must include staged working copies through the dedicated draft namespace",
  );
  assertNotContains(searchPage, "form_submission", "CMS global search");
  assertNotContains(searchPage, "AuditLog", "CMS global search");
  assertNotContains(searchPage, "FROM User", "CMS global search");
  assertNotContains(searchPage, "publisher_application", "CMS global search");
  assertNotContains(searchPage, "$executeRaw", "CMS global search");
  assertNotContains(searchPage, "$transaction", "CMS global search");
});

test("professional feedback groups follow the editor review lifecycle without weakening ownership checks", () => {
  const mutations = source(
    "src/features/feedback/mutations/feedback.mutations.ts",
  );

  assertNotContains(
    mutations,
    "uniqueIds.length !== 2",
    "professional feedback group mutation",
  );
  assert.ok(
    mutations.includes("uniqueIds.length < 1") &&
      mutations.includes("uniqueIds.length > 2"),
    "professional feedback groups must accept one or two unique report ids only",
  );
  assert.ok(
    mutations.includes('"awaiting_second_editor"') &&
      mutations.includes('"second_in_progress"') &&
      mutations.includes('"completed"'),
    "a completed first-editor report must stay readable while the work advances through the second-editor lifecycle",
  );
  assert.ok(
    mutations.includes("reports.length !== uniqueIds.length") &&
      mutations.includes("!uniqueIds.includes(report.id)"),
    "the requested report ids must exactly match the authorized completed professional group",
  );
  assert.ok(
    mutations.includes("stages.has(\"first\")") &&
      mutations.includes("stages.has(\"second\")"),
    "professional groups must preserve first-stage presence and require a second stage for two-report groups",
  );
  assert.ok(
    mutations.includes('reports.length === 1') &&
      mutations.includes('reviewStatus === "completed"'),
    "single-report and final two-report lifecycle states must be validated explicitly",
  );
  assert.ok(
    mutations.includes("updated.count !== uniqueIds.length"),
    "professional feedback status updates must change every authorized requested report",
  );
});
