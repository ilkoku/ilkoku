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

test("professional feedback mutations stay limited to reports already delivered to the writer", () => {
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
    mutations.includes('editorReviewStatus: "completed"'),
    "professional feedback status changes must stay behind the writer-visible completed review boundary",
  );
  assertNotContains(
    mutations,
    '"awaiting_second_editor"',
    "professional feedback mutation",
  );
  assertNotContains(
    mutations,
    '"second_in_progress"',
    "professional feedback mutation",
  );
  assert.ok(
    mutations.includes("reports.length !== uniqueIds.length") &&
      mutations.includes("!uniqueIds.includes(report.id)"),
    "the requested report ids must exactly match the authorized delivered professional group",
  );
  assert.ok(
    mutations.includes("stages.has(\"first\")") &&
      mutations.includes("stages.has(\"second\")"),
    "professional groups must preserve first-stage presence and require a second stage for two-report groups",
  );
  assert.ok(
    mutations.includes("updated.count !== uniqueIds.length"),
    "professional feedback status updates must change every authorized requested report",
  );
});

test("professional feedback validator accepts the same one-or-two report group shape as the mutation", () => {
  const validators = source(
    "src/features/feedback/validators/feedback.validators.ts",
  );

  assertNotContains(
    validators,
    ".length(\n      2,",
    "professional feedback group validator",
  );
  assert.ok(
    validators.includes(".min(\n      1,") &&
      validators.includes(".max(\n      2,"),
    "professional feedback group validator must accept one or two report ids",
  );
});

test("writer feedback sidebar badge counts only visible unread feedback events", () => {
  const badges = source(
    "src/features/navigation/sidebar-badges.ts",
  );

  assert.ok(
    badges.includes("getUnreadWriterFeedbackBadgeCount"),
    "writer feedback badge must use its visibility-aware counter",
  );
  assert.ok(
    badges.includes('reportStatus: "completed"') &&
      badges.includes('isProfessionalReview: false') &&
      badges.includes('isProfessionalReview: true'),
    "writer feedback badge must ignore draft or incomplete feedback rows",
  );
  assert.ok(
    badges.includes('editorReviewStatus: "completed"'),
    "professional feedback must not reach the sidebar badge before the review is writer-visible",
  );
  assert.ok(
    badges.includes('distinct: ["workId"]'),
    "a completed professional review group must count as one sidebar feedback event instead of one badge per editor report",
  );
});

test("sidebar navigation stays client-side and writer shells skip publisher membership lookups", () => {
  const navItem = source("src/components/ui/NavItem.tsx");
  const appShell = source("src/components/layout/AppShell.tsx");

  assert.ok(
    navItem.includes('import Link from "next/link"') &&
      navItem.includes("<Link"),
    "internal sidebar navigation must use Next.js client navigation",
  );
  assertNotContains(
    navItem,
    '<a className="nav-item"',
    "sidebar navigation",
  );
  assert.ok(
    appShell.includes("shouldLoadPublisherPermissions") &&
      appShell.includes('profile.role === "publisher"') &&
      appShell.includes("Promise.all"),
    "non-publisher app shells must skip the publisher membership query and independent shell lookups should run in parallel",
  );
});
