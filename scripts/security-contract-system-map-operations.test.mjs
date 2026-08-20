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

test("deep system operations collector is server-only, read-only and source-derived", () => {
  const operations = source("src/features/system-map/operations.ts");

  contains(operations, 'import "server-only"', "operations server boundary");
  contains(operations, "scanModules", "source module scan");
  contains(operations, "transitiveDependencies", "transitive import graph");
  contains(operations, "current.depth > 8", "bounded dependency depth");
  contains(operations, "seen.size < 500", "bounded dependency graph");
  contains(operations, 'text.includes("$queryRaw")', "raw SQL observation");
  contains(operations, "prismaModelPattern", "Prisma model observation");
  contains(operations, "extractActionNames", "server action inventory");
  contains(operations, "extractMethods", "HTTP method inventory");
  contains(operations, "extractGuardEvidence", "handler guard evidence");
  notContains(operations, 'from "@/lib/prisma"', "operations must not connect to database");
  notContains(operations, "prisma.$transaction", "operations must not mutate database");
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

test("route to action to data chain is derived through bounded imports", () => {
  const operations = source("src/features/system-map/operations.ts");

  contains(operations, "resolveImport", "import resolution");
  contains(operations, 'specifier.startsWith("@/")', "alias import support");
  contains(operations, 'specifier.startsWith(".")', "relative import support");
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

test("deep operations panel exposes blocker warn pass semantics and scan limitations", () => {
  const panel = source("src/features/system-map/SystemOperationsPanel.tsx");
  const operations = source("src/features/system-map/operations.ts");

  for (const token of ["BLOCKER", "WARN", "PASS", "BİLİNMİYOR"]) {
    contains(panel, token, "operations status vocabulary");
  }
  contains(panel, "Derin tarama", "scan mode visibility");
  contains(operations, "Kaynak bağımlılık taraması kullanılamadı", "scan failure visibility");
  contains(operations, "Derin kaynak taraması sınırlı", "limited-mode gap");
});
