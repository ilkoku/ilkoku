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

test("canonical integrity gate is server-only and combines existing read-only reports", () => {
  const integrity = source("src/features/system-map/integrity-control.ts");

  contains(integrity, 'import "server-only"', "integrity server boundary");
  contains(integrity, "SystemOperationsReport", "operations report input");
  contains(integrity, "RuntimeInfrastructureReport", "runtime report input");
  contains(integrity, "SystemMapSnapshot", "route snapshot input");
  contains(integrity, "getIntegrityControlReport", "canonical report builder");
  notContains(integrity, 'from "@/lib/prisma"', "integrity gate must not connect to DB");
  notContains(integrity, "prisma.$transaction", "integrity gate must not mutate DB");
  notContains(integrity, "process.env[", "integrity gate must not read bracket ENV values itself");
  notContains(integrity, "process.env.", "integrity gate must not read dotted ENV values itself");
});

test("unknown source findings remain visible as warnings instead of becoming false blockers or disappearing", () => {
  const integrity = source("src/features/system-map/integrity-control.ts");

  contains(integrity, 'function findingStatus(status: "blocker" | "warn" | "unknown")', "finding status normalizer");
  contains(integrity, 'return status === "blocker" ? "blocker" as const : "warn" as const', "unknown to warn semantics");
  contains(integrity, "const status = findingStatus(gap.status)", "operation and runtime finding normalization");
});

test("menu validation checks both route existence and role compatibility", () => {
  const integrity = source("src/features/system-map/integrity-control.ts");

  contains(integrity, 'menuLabel: "Yazar menüsü", roles: ["writer"]', "writer menu role expectation");
  contains(integrity, 'menuLabel: "Okuyucu menüsü", roles: ["reader", "editor_pending", "editor"]', "reader menu role expectation");
  contains(integrity, 'menuLabel: "Editör menüsü", roles: ["editor"]', "editor menu role expectation");
  contains(integrity, 'menuLabel: "Yayınevi menüsü", roles: ["publisher", "admin"]', "publisher menu role expectation");
  contains(integrity, 'menuLabel: "Sistem yönetimi menüsü", roles: ["admin"]', "admin menu role expectation");
  contains(integrity, "roleCompatible(route, expectation.roles)", "menu role cross-check");
  contains(integrity, 'domain: "Menü → Rol"', "menu role blocker domain");
  contains(integrity, 'title: "Menü hedefi rol sınırıyla uyumsuz"', "menu role blocker title");
});

test("integrity gate surfaces unreferenced exported server action candidates without treating heuristics as blockers", () => {
  const integrity = source("src/features/system-map/integrity-control.ts");

  contains(integrity, ".filter((sourceModule) => sourceModule.consumers.length === 0)", "unreferenced action scan");
  contains(integrity, 'domain: "Server Action Kullanımı"', "action usage domain");
  contains(integrity, 'status: "warn" as const', "action candidate warning semantics");
  contains(integrity, "Dinamik kullanım mümkün olduğundan WARN", "heuristic caveat");
});

test("integrity gate has explicit independent controls and fail-closed gate semantics", () => {
  const integrity = source("src/features/system-map/integrity-control.ts");

  for (const id of [
    "route-source",
    "menu-targets",
    "menu-role",
    "workflows",
    "api-guards",
    "dependency-coverage",
    "action-consumers",
    "route-rules",
    "env-contract",
    "orphan-routes",
    "schema-boundary",
    "collector-health",
  ]) {
    contains(integrity, `id: "${id}"`, `${id} integrity control`);
  }

  contains(integrity, 'snapshot.scanMode === "fallback" ? "blocker"', "fallback route inventory fail-closed");
  contains(integrity, 'operations.summary.menuTargetsBroken > 0 ? "blocker"', "broken menu fail-closed");
  contains(integrity, 'menuRoleMismatches > 0 ? "blocker"', "role mismatch fail-closed");
  contains(integrity, 'operations.summary.workflowBlockers > 0 ? "blocker"', "workflow fail-closed");
  contains(integrity, 'infrastructure.summary.routeRulesBroken > 0 ? "blocker"', "route rule fail-closed");
  contains(integrity, 'infrastructure.summary.unexpectedMigrationOnlyTables > 0 ? "warn" : "pass"', "unexpected migration-only drift warning");
  contains(integrity, '`${infrastructure.summary.acknowledgedMigrationOnlyTables} bilinçli · ${infrastructure.summary.unexpectedMigrationOnlyTables} beklenmedik migration-only tablo`', "acknowledged schema evidence");
  contains(integrity, 'blockers > 0 || checks.some((check) => check.status === "blocker")', "overall blocker gate");
});

test("integrity queue provides owner, evidence, remediation and deterministic re-verification", () => {
  const integrity = source("src/features/system-map/integrity-control.ts");
  const panel = source("src/features/system-map/IntegrityControlPanel.tsx");

  contains(integrity, "ownerHint:", "owner projection");
  contains(integrity, "fixPoint:", "fix point projection");
  contains(integrity, "remediation:", "remediation projection");
  contains(integrity, "verification:", "verification projection");
  contains(integrity, "evidence:", "evidence projection");
  contains(panel, "TEK KANONİK DENETİM KAPISI", "canonical gate UI label");
  contains(panel, "Kök bulgu → düzeltme → yeniden doğrulama", "remediation queue UI");
  contains(panel, "Düzeltme noktası", "fix point UI");
  contains(panel, "Nasıl kapanacak?", "verification UI");
  notContains(panel, '"use client"', "integrity panel must remain server-rendered");
  notContains(panel, "fetch(", "integrity panel must not create browser data source");
});

test("canonical integrity gate uses the same light dashboard surface as the rest of harita", () => {
  const styles = source("src/app/harita/integrity-control.css");

  contains(styles, "background: #fffdf9", "light integrity panel surface");
  contains(styles, "color: #171513", "dark text on light surface");
  contains(styles, "background: #f5dfdb", "pastel blocker status");
  contains(styles, "background: #fff0d7", "pastel warning status");
  contains(styles, "background: #e8f3ea", "pastel pass status");
  notContains(styles, "rgba(10, 12, 17, 0.88)", "legacy dark panel background");
});

test("harita renders integrity as its own specialist page while sharing the canonical report chain", () => {
  const loader = source("src/features/system-map/workspace-data.ts");
  const workspace = source("src/features/system-map/SystemMapWorkspacePage.tsx");
  const page = source("src/app/harita/denetim/page.tsx");
  const layout = source("src/app/harita/layout.tsx");

  contains(loader, "getIntegrityControlReport(snapshot, operations, infrastructure)", "integrity report generation");
  contains(workspace, '<IntegrityControlPanel report={integrity} />', "integrity specialist panel render");
  contains(page, 'workspace="integrity"', "dedicated integrity route");
  contains(layout, '<SystemMapNavigation />', "shared specialist navigation shell");
  contains(layout, 'import "./integrity-control.css"', "integrity styles");
});
