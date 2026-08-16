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

test("role workspaces preserve explicit role gates", () => {
  const editorAccess = source("src/features/editor-workspace/access.ts");
  const adminLayout = source("src/app/admin/layout.tsx");

  assertContains(editorAccess, 'profile.role !== "editor"', "editor workspace gate");
  assertContains(adminLayout, 'user.role !== "admin"', "admin workspace gate");
});

test("CMS access fails closed and access grants stay admin-only", () => {
  const access = source("src/lib/cms-access.ts");
  const manageAccess = source("src/app/api/cms-access-manage/route.ts");

  assertContains(access, "catch {", "CMS access lookup");
  assertContains(access, "canManage: false", "CMS access lookup");
  assertContains(access, "canPublish: false", "CMS access lookup");
  assertContains(manageAccess, "!access.isAdmin", "CMS access management");
  assertContains(manageAccess, "isSameOriginRequest(request)", "CMS access management");
});

test("CMS media writes require authenticated manager access and same-origin", () => {
  const media = source("src/app/api/cms-media-upload/route.ts");

  assertContains(media, "isSameOriginRequest(request)", "CMS media upload");
  assertContains(media, "!access.user", "CMS media upload");
  assertContains(media, "!access.canManage", "CMS media upload");
  assertContains(media, "MAX_CMS_MEDIA_BYTES", "CMS media upload");
  assertContains(media, "detectAllowedMediaMime", "CMS media upload");
});

test("published CMS content cannot be archived through manager-only authority", () => {
  const notices = source("src/app/api/content-notices/route.ts");
  const pages = source("src/features/cms/page-actions.ts");
  const guides = source("src/features/cms/guide-actions.ts");
  const faq = source("src/features/cms/faq-actions.ts");

  assertContains(notices, "prisma.$transaction", "announcement archive boundary");
  assertContains(notices, "FOR UPDATE", "announcement archive boundary");
  assertContains(
    notices,
    'notice.status === "published" && !access.canPublish',
    "announcement archive boundary",
  );
  assertContains(
    notices,
    'return "publish_forbidden" as const',
    "announcement archive boundary",
  );

  assertContains(
    pages,
    'page.status === "published"',
    "page archive boundary",
  );
  assertContains(
    pages,
    'requireCmsPublisher("/icerik/sayfalar")',
    "page archive boundary",
  );

  assertContains(
    guides,
    'guide.status === "published"',
    "guide archive boundary",
  );
  assertContains(
    guides,
    'requireCmsPublisher("/icerik/rehber")',
    "guide archive boundary",
  );

  assertContains(
    faq,
    'existing.status === "published" && !access.canPublish',
    "FAQ archive boundary",
  );
});
