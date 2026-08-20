import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("deep system operations stays server-only and consumes build-time structural metadata", () => {
  const operations = source("src/features/system-map/operations.ts");
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");

  contains(operations, 'import "server-only"', "operations server boundary");
  contains(operations, 'systemMapSourceManifest', "build-time source manifest");
  contains(operations, "transitiveDependencies", "transitive import graph");
  contains(operations, "current.depth > 8", "bounded dependency depth");
  contains(operations, "seen.size < 500", "bounded dependency graph");
  contains(generator, 'source.text.includes("$queryRaw")', "raw SQL observation at build time");
  contains(generator, "prismaModelPattern", "Prisma model observation at build time");
  contains(generator, "extractActionNames", "server action inventory at build time");
  contains(generator, "extractMethods", "HTTP method inventory at build time");
  contains(generator, "extractGuardEvidence", "handler guard evidence at build time");
  for (const forbidden of ['node:fs', 'node:path', 'process.cwd()', 'readdir(', 'readFile(']) {
    notContains(operations, forbidden, `production operations must not contain ${forbidden}`);
  }
  notContains(operations, 'from "@/lib/prisma"', "operations must not connect to database");
  notContains(operations, "prisma.$transaction", "operations must not mutate database");
});

test("canonical workflows use real application routes and never invent contract index pages", () => {
  const collector = source("src/features/system-map/collector.ts");

  contains(collector, '${contractManagementPath}/sablonlar/yeni', "contract template create route");
  contains(collector, '${contractManagementPath}/sablonlar/[templateId]', "contract template edit route");
  contains(collector, '${contractInboxPath}/[contractId]', "recipient contract detail route");
  contains(collector, '"/icerik/ana-sayfa | /icerik/rol-kartlari | /icerik/menuler | /icerik/seo"', "CMS real route workflow");
  notContains(collector, '`${contractManagementPath}/sablonlar`,', "nonexistent contract template index");
  notContains(collector, '"yayın işlemi"', "non-route writer workflow label");
  notContains(collector, '"rol + kullanıcı seçimi"', "non-route contract workflow label");
  notContains(collector, '"kabul / ret"', "non-route contract workflow label");
});

test("API evidence classification distinguishes public, CMS-protected and internal-secret surfaces", () => {
  const collector = source("src/features/system-map/collector.ts");
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");

  for (const path of [
    "/api/content-faq",
    "/api/media",
    "/api/public-announcements",
    "/api/site-contact",
    "/api/site-content",
  ]) {
    contains(collector, `"${path}"`, `${path} public API classification`);
  }
  contains(collector, "publicApiPaths", "public API registry");
  contains(collector, "cmsProtectedApiPaths", "CMS API registry");
  contains(collector, 'matchesPath(route, "/api/internal")', "internal secret API classification");
  contains(generator, '["getCmsAccess", "CMS access"]', "CMS access guard evidence");
  contains(generator, '["isSameOriginRequest", "same-origin check"]', "same-origin guard evidence");
  contains(generator, '["timingSafeEqual", "timing-safe secret check"]', "timing-safe secret guard evidence");
});

test("operations report cross-checks menu targets, workflows, route dependencies and API guards", () => {
  const operations = source("src/features/system-map/operations.ts");

  contains(operations, "menuChecks", "menu target cross-check");
  contains(operations, "validateWorkflow", "workflow cross-check");
  contains(operations, "routeDependencies", "route dependency chain");
  contains(operations, "apiSurface", "API surface");
  contains(operations, 'title: "Kırık menü hedefi"', "broken menu blocker");
  contains(operations, 'title: "Akışta eksik route"', "workflow blocker");
  contains(operations, 'title: "Admin API guard kanıtı eksik"', "admin API blocker");
  contains(operations, 'title: "Yetim route adayı"', "orphan warning");
  contains(operations, 'scanMode === "limited"', "fail-closed limited scan state");
});

test("route to action to data chain is derived at build time then traversed through bounded imports", () => {
  const operations = source("src/features/system-map/operations.ts");
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");

  contains(generator, "resolveImport", "build-time import resolution");
  contains(generator, 'specifier.startsWith("@/")', "alias import support");
  contains(generator, 'specifier.startsWith(".")', "relative import support");
  contains(generator, "consumers", "server action consumer derivation");
  contains(operations, "serverActions", "route server action projection");
  contains(operations, "dataModels", "route data model projection");
  contains(operations, "apiTargets", "route API projection");
  contains(operations, "dependencyCount", "route dependency count");
});

test("harita renders the deep operations report on the server without a second browser data source", () => {
  const page = source("src/app/harita/page.tsx");
  const panel = source("src/features/system-map/SystemOperationsPanel.tsx");
  const layout = source("src/app/harita/layout.tsx");

  contains(page, "getSystemMapSnapshot", "canonical map snapshot");
  contains(page, "getSystemOperationsReport(snapshot)", "operations derived from canonical snapshot");
  contains(page, "SystemOperationsPanel", "operations panel render");
  contains(panel, "Eksik puzzle parçası denetimi", "puzzle control center");
  contains(panel, "Kanonik kullanıcı akışları", "workflow UI");
  contains(panel, "Rol menüsü hedef doğrulaması", "menu validation UI");
  contains(panel, "Çalışma bağımlılık zinciri", "dependency UI");
  contains(panel, "HTTP ve guard kanıtı", "API guard UI");
  contains(layout, 'import "./operations.css"', "operations styles");
  notContains(panel, '"use client"', "operations panel server render");
  notContains(panel, "fetch(", "operations panel must not create browser fetch source");
});

test("deep operations panel exposes blocker warn pass semantics and fail-closed manifest limitations", () => {
  const panel = source("src/features/system-map/SystemOperationsPanel.tsx");
  const operations = source("src/features/system-map/operations.ts");

  for (const token of ["BLOCKER", "WARN", "PASS", "BİLİNMİYOR"]) {
    contains(panel, token, "operations status vocabulary");
  }
  contains(panel, "Derin tarama", "scan mode visibility");
  contains(operations, "Build-time kaynak bağımlılık manifesti boş", "manifest failure visibility");
  contains(operations, "Derin kaynak taraması sınırlı", "limited-mode gap");
});
