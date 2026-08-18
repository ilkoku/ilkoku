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
  assertContains(authData, "readerWorkspaceRoles", "notification role boundary");
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
  const item = source(
    "src/features/notifications/components/NotificationListItem.tsx",
  );
  const publisher = source("src/features/publisher-workspace/notification-center.ts");

  assertContains(reader, "resolveNotificationTargets", "shared notification page");
  assertContains(reader, "NotificationListItem", "shared notification page");
  assertContains(editor, "resolveNotificationTargets", "editor notification page");
  assertContains(editor, "NotificationListItem", "editor notification page");
  assertContains(item, "İlgili kayda git", "shared notification interaction");
  assertContains(publisher, "resolveNotificationTargets", "publisher notification center");
  assertNotContains(publisher, "workSlugById", "publisher notification center");
});

test("opening a notification reveals its details and marks it read", () => {
  const item = source(
    "src/features/notifications/components/NotificationListItem.tsx",
  );
  const actions = source("src/features/notifications/actions.ts");

  assertContains(item, "aria-expanded={expanded}", "notification disclosure control");
  assertContains(item, 'expanded ? "Kapat" : "Bildirimi aç"', "notification disclosure control");
  assertContains(item, "if (nextExpanded)", "notification disclosure read transition");
  assertContains(item, "markReadIfNeeded()", "notification disclosure read transition");
  assertContains(item, "markNotificationReadAction", "notification disclosure read transition");
  assertContains(item, "setRead(true)", "notification disclosure optimistic state");
  assertContains(actions, "export async function markNotificationReadAction", "notification read action");
  assertContains(actions, "userId: user.id", "notification read ownership boundary");
  assertContains(actions, "readAt: null", "notification read transition");
  assertContains(actions, "readAt: new Date()", "notification read transition");
});

test("related record action remains separate and securely resolved after reading", () => {
  const item = source(
    "src/features/notifications/components/NotificationListItem.tsx",
  );
  const actions = source("src/features/notifications/actions.ts");
  const publisher = source(
    "src/features/publisher-workspace/components/PublisherNotificationCenter.tsx",
  );

  assertContains(item, "openNotificationTargetAction", "notification related-record CTA");
  assertContains(item, "action={openNotificationTargetAction}", "notification related-record CTA");
  assertContains(item, "İlgili kayda git", "notification related-record CTA");
  assertContains(actions, "resolveNotificationTargets", "notification open action");
  assertContains(actions, "redirect(target)", "notification open action");
  assertContains(actions, "userId: user.id", "notification open action");
  assertContains(publisher, '<a href={href}>İlgili kaydı aç</a>', "publisher notification CTA");
});

test("notification envelope remains a reversible read-state control", () => {
  const item = source(
    "src/features/notifications/components/NotificationListItem.tsx",
  );

  assertContains(item, "toggleNotificationReadAction", "notification envelope control");
  assertContains(item, "NotificationEnvelopeIcon", "notification envelope control");
  assertContains(item, 'read ? "Okunmadı olarak işaretle"', "notification envelope label");
  assertContains(item, "setExpanded(false)", "notification unread reset");
});

test("shared and editor notification pages expose browser back navigation", () => {
  const shared = source("src/app/bildirimler/page.tsx");
  const editor = source("src/app/editor/bildirimler/page.tsx");
  const backButton = source(
    "src/features/notifications/components/NotificationBackButton.tsx",
  );

  assertContains(shared, "NotificationBackButton", "shared notification back control");
  assertContains(editor, "NotificationBackButton", "editor notification back control");
  assertContains(backButton, "window.history.back()", "notification back control");
  assertContains(backButton, "window.location.assign(fallbackHref)", "notification back fallback");
  assertContains(backButton, "Geri", "notification back label");
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
