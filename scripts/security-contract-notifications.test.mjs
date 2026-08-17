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

test("writer-owned work notifications stay inside the writer workspace", () => {
  const targets = source("src/features/notifications/targets.ts");
  const passportRoute = source("src/app/eserlerim/[workId]/pasaport/page.tsx");

  assertContains(targets, "writerOwnedWorkIds", "writer work notification resolver");
  assertContains(targets, "authorId: input.userId", "writer work notification resolver");
  assertContains(
    targets,
    "`/eserlerim/${encodeURIComponent(entityId)}/pasaport`",
    "writer work notification resolver",
  );
  assertContains(passportRoute, "AuthorOwnershipPassportPage", "writer work target route");
});

test("blocked public work slugs never receive public notification links", () => {
  const targets = source("src/features/notifications/targets.ts");

  assertContains(targets, "isBlockedPublicWorkSlug", "notification public target resolver");
  assertContains(
    targets,
    "if (isBlockedPublicWorkSlug(work.slug)) continue;",
    "notification public work target resolver",
  );
  assertContains(
    targets,
    "isBlockedPublicWorkSlug(comment.work.slug)",
    "notification public comment target resolver",
  );
});

test("editor work notifications disambiguate assignments from recommendations", () => {
  const text = source("src/features/notifications/targets.ts");

  assertContains(text, "EditorAssignmentStatus", "editor notification resolver");
  assertContains(text, 'stage: "second"', "editor notification resolver");
  assertContains(text, 'href = "/editor/incelemeler?asama=ikinci"', "editor notification resolver");
  assertContains(text, 'href = "/editor/incelemeler?durum=tamamlanan"', "editor notification resolver");
  assertContains(text, "recipientEditorId: input.userId", "editor notification resolver");
  assertContains(text, 'href = "/editor/onerilenler"', "editor notification resolver");
});

test("shared notification page explicitly allows writer without widening reader workspace", () => {
  const page = source("src/app/bildirimler/page.tsx");
  const authData = source("src/features/auth/data.ts");
  const navigation = source("src/content/navigation.ts");

  assertContains(page, "canAccessNotificationWorkspace", "shared notification page");
  assertNotContains(page, "canAccessReaderWorkspace", "shared notification page");
  assertContains(authData, "notificationWorkspaceRoles", "notification role boundary");
  assertContains(authData, '  "writer",', "notification role boundary");
  assertContains(authData, "readerWorkspaceRoles", "reader role boundary");
  assertNotContains(
    authData.slice(
      authData.indexOf("export const readerWorkspaceRoles"),
      authData.indexOf("export const notificationWorkspaceRoles"),
    ),
    '"writer"',
    "reader role boundary",
  );
  assertContains(navigation, '{ label: "Bildirimler", href: "/bildirimler" }', "writer navigation");
});

test("all role notification pages use the central resolver", () => {
  const reader = source("src/app/bildirimler/page.tsx");
  const editor = source("src/app/editor/bildirimler/page.tsx");
  const publisher = source("src/features/publisher-workspace/notification-center.ts");

  assertContains(reader, "resolveNotificationTargets", "shared notification page");
  assertContains(reader, "İlgili kaydı aç", "shared notification page");
  assertContains(editor, "resolveNotificationTargets", "editor notification page");
  assertContains(editor, "İlgili kaydı aç", "editor notification page");
  assertContains(publisher, "resolveNotificationTargets", "publisher notification center");
  assertNotContains(publisher, "workSlugById", "publisher notification center");
});

test("related-record CTAs use native browser navigation on every notification surface", () => {
  const shared = source("src/app/bildirimler/page.tsx");
  const editor = source("src/app/editor/bildirimler/page.tsx");
  const publisher = source(
    "src/features/publisher-workspace/components/PublisherNotificationCenter.tsx",
  );

  assertContains(shared, '<a className="button button--ghost" href={href}>', "shared notification CTA");
  assertContains(editor, '<a className="button button--ghost" href={href}>', "editor notification CTA");
  assertContains(publisher, '<a href={href}>İlgili kaydı aç</a>', "publisher notification CTA");
  assertNotContains(shared, 'from "next/link"', "shared notification CTA");
  assertNotContains(editor, 'from "next/link"', "editor notification CTA");
  assertNotContains(publisher, 'from "next/link"', "publisher notification CTA");
});

test("notification work and comment href shapes stay backed by real App Router routes", () => {
  const targets = source("src/features/notifications/targets.ts");
  const showcaseRoute = source("src/app/kitap/[slug]/page.tsx");
  const readingRoute = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");

  assertContains(targets, "`/kitap/${encodeURIComponent(slug)}`", "work notification target");
  assertContains(targets, "`/oku/${encodeURIComponent(comment.work.slug)}/bolum-${comment.chapter.position}#yorum-${comment.id}`", "comment notification target");
  assertContains(showcaseRoute, "DynamicBookShowcasePage", "work target route");
  assertContains(readingRoute, "DynamicReadingPage", "comment target route");
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
