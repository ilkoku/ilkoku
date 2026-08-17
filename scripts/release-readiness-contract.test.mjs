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

function metadataBlocks(text) {
  const blocks = [];
  const marker = "metadata: JSON.stringify({";
  let cursor = 0;

  while (true) {
    const start = text.indexOf(marker, cursor);
    if (start < 0) break;
    const end = text.indexOf("}),", start);
    assert.ok(end > start, "audit metadata block must have a recognizable end");
    blocks.push(text.slice(start, end + 3));
    cursor = end + 3;
  }

  return blocks;
}

test("writer notification route uses the same dedicated role boundary in proxy and page", () => {
  const authData = source("src/features/auth/data.ts");
  const proxy = source("src/proxy.ts");
  const page = source("src/app/bildirimler/page.tsx");

  assertContains(authData, "notificationWorkspaceRoles", "notification role boundary");
  assertContains(authData, '  "writer",', "notification role boundary");
  assertContains(proxy, "notificationWorkspaceRoles", "proxy notification boundary");
  assertContains(
    proxy,
    '{ approved: false, path: "/bildirimler", roles: [...notificationWorkspaceRoles] }',
    "proxy notification boundary",
  );
  assertContains(page, "canAccessNotificationWorkspace", "notification page boundary");
});

test("release role matrix keeps every workspace route present and explicitly protected", () => {
  const proxy = source("src/proxy.ts");
  const smoke = source(".github/workflows/production-smoke.yml");
  const routeFiles = [
    "src/app/okuyucu/page.tsx",
    "src/app/kesfet/page.tsx",
    "src/app/yazar/page.tsx",
    "src/app/eserlerim/page.tsx",
    "src/app/editor/page.tsx",
    "src/app/yayinevi/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/bildirimler/page.tsx",
  ];

  for (const file of routeFiles) {
    assert.equal(existsSync(join(ROOT, file)), true, `${file} must exist`);
  }

  for (const path of [
    '"/okuyucu"',
    '"/kesfet"',
    '"/yazar"',
    '"/eserlerim"',
    '"/yazmaya-devam"',
    '"/bildirimler"',
    '"/editor"',
    '"/yayinevi"',
  ]) {
    assertContains(proxy, path, `protected role path ${path}`);
  }

  assertContains(proxy, 'path: "/yazar", roles: ["writer"]', "writer role gate");
  assertContains(proxy, 'path: "/eserlerim", roles: ["writer"]', "writer role gate");
  assertContains(proxy, 'path: "/editor", roles: ["editor"]', "editor role gate");
  assertContains(proxy, "isPublisherRoute", "publisher membership gate");
  assertContains(proxy, "hasActivePublisherMembership", "publisher membership gate");
  assertContains(proxy, "isAdminRoute && !isAdmin", "admin role gate");

  for (const route of [
    "/bildirimler",
    "/editor/bildirimler",
    "/editor/yayinevi-talepleri",
    "/yayinevi/bildirimler",
    "/yayinevi/editor-talepleri",
    "/yayinevi/kesfet/eserler",
    "/yazmaya-devam",
  ]) {
    assertContains(smoke, `https://ilkoku.com${route}`, `critical live smoke ${route}`);
  }
});

test("release measurement is aggregate-only and never emits direct user or recipient identifiers", () => {
  const report = source("scripts/release-measurement-report.mjs");

  for (const sourceTable of [
    "ReadingProgress",
    "ReadingAccess",
    "PublisherWorkLike",
    "PublisherWorkFavorite",
    "PublisherAuthorLike",
    "PublisherAuthorFavorite",
    "PublisherAuthorFollow",
    "PublisherDiscoveryShare",
    "PublisherEditorRequest",
    "PublisherSubmission",
    "EmailDelivery",
    "AuditLog",
  ]) {
    assertContains(report, sourceTable, "release measurement source");
  }

  assertContains(report, "SET SESSION TRANSACTION READ ONLY", "release measurement read-only guard");
  assertContains(report, "COUNT(DISTINCT userId)", "reader aggregate measurement");
  assertContains(report, "GROUP BY action", "audit aggregate measurement");

  for (const forbidden of [
    "toAddress",
    "fromAddress",
    "recipientEmail",
    "actorId",
    "ipAddress",
    "userAgent",
    "tokenHash",
    "passwordHash",
  ]) {
    assert.equal(
      report.includes(forbidden),
      false,
      `release measurement must not read or output ${forbidden}`,
    );
  }
});

test("publisher engagement audit metadata remains measurement-safe", () => {
  const files = [
    "src/features/publisher-discovery/engagement-repository.ts",
    "src/features/publisher-discovery/engagement-extended-repository.ts",
    "src/features/publisher-discovery/sharing-repository.ts",
  ];
  const forbiddenKeys = [
    "recipientEmail",
    "invitedEmail",
    "email:",
    "note:",
    "content:",
    "password",
    "token",
    "ipAddress",
    "userAgent",
  ];

  for (const file of files) {
    const blocks = metadataBlocks(source(file));
    assert.ok(blocks.length > 0, `${file} must keep audited engagement writes`);
    for (const block of blocks) {
      for (const forbiddenKey of forbiddenKeys) {
        assert.equal(
          block.includes(forbiddenKey),
          false,
          `${file} audit metadata must not include ${forbiddenKey}`,
        );
      }
    }
  }
});

test("release CI rehearses measurement on both disposable and recovered databases", () => {
  const ci = source(".github/workflows/ci.yml");
  const packageJson = source("package.json");

  assertContains(ci, "Recover brand-new MariaDB from version-controlled baseline", "release CI");
  assertContains(ci, "Run release measurement report", "release CI");
  assertContains(ci, "Validate release measurement on recovered database", "release CI");
  assertContains(packageJson, '"release:measure"', "release scripts");
  assertContains(packageJson, '"release:measure:strict"', "release scripts");
});
