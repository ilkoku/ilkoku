import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertContains(text, fragment, label) {
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

function assertNotContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("notification targets fail closed on stale comment and work entities", () => {
  const text = source("src/features/notifications/targets.ts");

  assertContains(text, 'status: "visible"', "notification resolver");
  assertContains(text, "deletedAt: null", "notification resolver");
  assertContains(text, 'status: "published" as const', "notification resolver");
  assertContains(text, 'visibility: "public" as const', "notification resolver");
  assertContains(text, "publishedAt: { not: null }", "notification resolver");
  assertContains(text, "parentId: null", "notification resolver");
});

test("publisher notification targets validate publisher ownership before deep linking", () => {
  const text = source("src/features/notifications/targets.ts");

  assertContains(text, 'entityType === "publisher_editor_request"', "publisher notification resolver");
  assertContains(text, "publisherEditorRequestIdSet.has(entityId)", "publisher notification resolver");
  assertContains(text, 'href = "/yayinevi/editor-talepleri"', "publisher notification resolver");
  assertContains(text, "publisherSubmissionIdSet.has(entityId)", "publisher notification resolver");
  assertContains(text, "publisherId: membership.publisherId", "publisher notification resolver");
  assertContains(text, 'notification.type === "publisher_discovery_shared"', "publisher share notification resolver");
  assertContains(text, 'href = "/yayinevi/paylasilanlar"', "publisher share notification resolver");
  assertNotContains(text, 'notification.type === "publisher_discovery_share"', "publisher share notification resolver");
});

test("writer submission notifications only link to submissions owned by that writer", () => {
  const text = source("src/features/notifications/targets.ts");

  assertContains(text, "authorId: input.userId", "writer notification resolver");
  assertContains(text, "writerSubmissionIds.has(entityId)", "writer notification resolver");
  assertContains(text, "/yayinevleri?basvuru=", "writer notification resolver");
});

test("editor work notifications disambiguate assignments from recommendations", () => {
  const text = source("src/features/notifications/targets.ts");

  assertContains(text, 'stage: "second"', "editor notification resolver");
  assertContains(text, 'href = "/editor/incelemeler?asama=ikinci"', "editor notification resolver");
  assertContains(text, 'href = "/editor/incelemeler?durum=tamamlanan"', "editor notification resolver");
  assertContains(text, "recipientEditorId: input.userId", "editor notification resolver");
  assertContains(text, 'href = "/editor/onerilenler"', "editor notification resolver");
});

test("all role notification pages use the central resolver and writer navigation exposes notifications", () => {
  const reader = source("src/app/bildirimler/page.tsx");
  const editor = source("src/app/editor/bildirimler/page.tsx");
  const publisher = source("src/features/publisher-workspace/notification-center.ts");
  const navigation = source("src/content/navigation.ts");

  assertContains(reader, "resolveNotificationTargets", "reader notification page");
  assertContains(reader, "İlgili kaydı aç", "reader notification page");
  assertContains(editor, "resolveNotificationTargets", "editor notification page");
  assertContains(editor, "İlgili kaydı aç", "editor notification page");
  assertContains(publisher, "resolveNotificationTargets", "publisher notification center");
  assertNotContains(publisher, "workSlugById", "publisher notification center");
  assertContains(navigation, '{ label: "Bildirimler", href: "/bildirimler" }', "writer navigation");
});

test("production smoke covers newly critical role surfaces", () => {
  const text = source(".github/workflows/production-smoke.yml");

  for (const path of [
    "/yayinevleri",
    "/bildirimler",
    "/yorumlarim",
    "/yorumlarim/rapor",
    "/editor/bildirimler",
    "/editor/yayinevi-talepleri",
    "/yayinevi/bildirimler",
    "/yayinevi/editor-talepleri",
  ]) {
    assertContains(text, `https://ilkoku.com${path}`, "production smoke");
  }
});
