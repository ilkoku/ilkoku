import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("Sprint 7 production UAT maps every critical role to a real route surface", () => {
  const routeFiles = [
    "src/app/giris/page.tsx",
    "src/app/kesfet/page.tsx",
    "src/app/oku/[slug]/[chapterSlug]/page.tsx",
    "src/app/bildirimler/page.tsx",
    "src/app/yazar/page.tsx",
    "src/app/eserlerim/page.tsx",
    "src/app/yazmaya-devam/page.tsx",
    "src/app/hesabim/page.tsx",
    "src/app/yayinevleri/page.tsx",
    "src/app/editor/page.tsx",
    "src/app/editor/bildirimler/page.tsx",
    "src/app/editor/yayinevi-talepleri/page.tsx",
    "src/app/yayinevi/page.tsx",
    "src/app/yayinevi/kesfet/eserler/page.tsx",
    "src/app/yayinevi/bildirimler/page.tsx",
    "src/app/yayinevi/editor-talepleri/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/icerik/page.tsx",
    "src/app/icerik/arama/page.tsx",
  ];

  for (const file of routeFiles) {
    assert.equal(existsSync(join(ROOT, file)), true, `${file} must exist for Sprint 7 UAT`);
  }
});

test("Sprint 7 UAT document keeps automated and human acceptance explicitly separate", () => {
  const uat = source("docs/sprint-7-production-uat.md");

  for (const role of ["## Reader", "## Writer", "## Editor", "## Publisher", "## Admin / CMS"]) {
    assertContains(uat, role, "Sprint 7 UAT role matrix");
  }

  assertContains(uat, "AUTOMATED_PASS", "Sprint 7 automated status vocabulary");
  assertContains(uat, "HUMAN_PENDING", "Sprint 7 human status vocabulary");
  assertContains(uat, "HUMAN_PASS", "Sprint 7 human pass vocabulary");
  assertContains(uat, "BLOCKED", "Sprint 7 blocked status vocabulary");
  assertContains(
    uat,
    "do not store production credentials",
    "Sprint 7 production credential boundary",
  );
  assertContains(
    uat,
    "Do not mark **Final Release UAT / release readiness** complete while any critical row remains `HUMAN_PENDING` or `BLOCKED`.",
    "Sprint 7 final release UAT rule",
  );
  assertContains(
    uat,
    "Sprint 8 technical development may continue independently.",
    "Sprint 8 independence from deferred human UAT",
  );
});

test("Sprint 7 UAT locks the canonical high-risk workflow boundaries", () => {
  const publish = source("src/features/works/publish-work-event.ts");
  const publisherActions = source("src/features/publishers/actions.ts");
  const notifications = source("src/features/notifications/actions.ts");
  const policy = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");

  assertContains(publish, "FOR UPDATE", "canonical writer publish UAT boundary");
  assertContains(publish, 'action: "work_published"', "canonical writer publish audit boundary");
  assertContains(
    publisherActions,
    "Yeni doğrudan yayınevi başvuruları kapatıldı",
    "retired legacy publisher creation boundary",
  );
  assertContains(
    publisherActions,
    "withdrawLegacyPublisherSubmission",
    "historical publisher withdrawal boundary",
  );
  assertContains(notifications, "toggleNotificationReadAction", "notification read-state UAT boundary");
  assertContains(policy, 'path: "/yazar", roles: ["writer"]', "writer role policy boundary");
  assertContains(policy, 'path: "/editor", roles: ["editor"]', "editor role policy boundary");
  assertContains(proxy, "getRouteRoleRule(pathname)", "proxy canonical policy consumption");
  assertContains(proxy, "isPublisherRoute", "publisher membership boundary");
  assertContains(proxy, "isAdminRoute && !isAdmin", "admin boundary");
});
