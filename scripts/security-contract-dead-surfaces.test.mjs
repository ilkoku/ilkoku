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

function assertContains(text, fragment, label) {
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

test("obsolete publisher contract and publication repository writes stay removed", () => {
  const repository = source("src/features/publisher-workspace/repository.ts");

  assertNotContains(
    repository,
    "upsertPublisherContract",
    "publisher repository",
  );
  assertNotContains(
    repository,
    "upsertPublicationPlan",
    "publisher repository",
  );
});

test("editor notification reads stay on the central notification surface", () => {
  const queries = source("src/features/editor-workspace/queries.ts");
  const page = source("src/app/editor/bildirimler/page.tsx");

  assertNotContains(
    queries,
    "getEditorNotifications",
    "editor query repository",
  );
  assert.ok(
    page.includes("prisma.notification.findMany"),
    "editor notification page must read the full Notification row for safe target resolution",
  );
});

test("legacy second-editor module cannot expose draft or completion write actions", () => {
  const legacy = source("src/features/editor-workspace/second-editor.actions.ts");
  const canonical = source("src/features/editor-workspace/second-editor-review-state.actions.ts");

  assertNotContains(
    legacy,
    "saveSecondEditorReviewDraftAction",
    "legacy second-editor action surface",
  );
  assertNotContains(
    legacy,
    "completeSecondEditorReviewAction",
    "legacy second-editor action surface",
  );
  assertContains(
    canonical,
    "saveSecondEditorReviewDraftAction",
    "canonical second-editor review state",
  );
  assertContains(
    canonical,
    "completeSecondEditorReviewAction",
    "canonical second-editor review state",
  );
  assertContains(
    legacy,
    "lockLiveEditor",
    "second-editor assignment authority boundary",
  );
  assertContains(
    legacy,
    "lockSecondReviewWorkState",
    "second-editor assignment state boundary",
  );
});

test("admin and content management provide explicit two-way navigation", () => {
  const admin = source("src/components/admin/AdminShell.tsx");
  const content = source("src/components/content/ContentShell.tsx");

  assertContains(admin, 'href="/icerik"', "admin to content navigation");
  assertContains(admin, "İçerik Yönetimi", "admin to content label");
  assertContains(content, "isAdmin &&", "content admin-only return gate");
  assertContains(
    content,
    'href="/sistem-yonetimi"',
    "content to admin navigation",
  );
  assertContains(
    content,
    "Sistem Yönetimine Dön",
    "content to admin label",
  );
});
