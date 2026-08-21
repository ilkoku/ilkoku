import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("system map and central contract routes are private at request, server and crawler layers", () => {
  const policy = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");
  const robots = source("src/app/robots.ts");
  const mapLayout = source("src/app/harita/layout.tsx");
  const contractLayout = source("src/app/sozlesme/layout.tsx");
  const inboxLayout = source("src/app/sozlesmelerim/layout.tsx");

  for (const route of ["/harita", "/sozlesme"]) {
    contains(policy, route, "central route policy");
    contains(nextConfig, route, "private response headers");
    contains(robots, route, "robots private route policy");
  }
  contains(policy, 'contractInboxPath = "/sozlesmelerim"', "contract inbox policy");
  contains(policy, "pathname.startsWith(`${path}/`)", "nested private route inheritance");
  contains(proxy, "isAdminOnlyPath(pathname)", "proxy admin enforcement");
  contains(proxy, "isProtectedPath(pathname)", "proxy protected route enforcement");
  contains(mapLayout, 'user.role !== "admin"', "map server guard");
  contains(contractLayout, 'user.role !== "admin"', "contract server guard");
  contains(inboxLayout, "getCurrentUser()", "inbox authentication guard");
  contains(mapLayout, "index: false", "map noindex metadata");
  contains(contractLayout, "index: false", "contract noindex metadata");
});

test("system map is generated from build-time live sources while all specialist pages share the canonical loader", () => {
  const collector = source("src/features/system-map/collector.ts");
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");
  const loader = source("src/features/system-map/workspace-data.ts");
  const workspace = source("src/features/system-map/SystemMapWorkspacePage.tsx");
  const workbench = source("src/features/system-map/SystemMapWorkbench.tsx");

  contains(generator, "collectRoutes(files)", "build-time source route scan");
  contains(generator, "collectReferences(files)", "build-time reference scan");
  contains(generator, "collectModules(files)", "build-time dependency scan");
  contains(collector, "systemMapSourceManifest", "generated source manifest");
  contains(collector, 'from "@/lib/route-security"', "shared route security policy");
  contains(collector, "editorNavigationContent", "role menu inventory");
  contains(collector, "adminNavigation", "admin menu inventory");
  contains(collector, "inbound", "inbound link inventory");
  contains(collector, "outbound", "outbound link inventory");
  contains(collector, "orphanCandidate", "orphan route detection");
  for (const forbidden of ["node:fs", "node:path", "process.cwd()", "readdir(", "readFile("]) {
    notContains(collector, forbidden, `production collector must not contain ${forbidden}`);
  }
  contains(loader, "getSystemMapSnapshot()", "shared live snapshot");
  contains(workspace, "getSystemMapWorkspaceData()", "shared workspace data source");
  contains(workbench, "Bu sayfaya nasıl gelinir?", "inbound workbench detail");
  contains(workbench, "Buradan nereye gidilir?", "outbound workbench detail");
});

test("system map route inventory stays an inventory surface while architecture health stays canonical", () => {
  const workbench = source("src/features/system-map/SystemMapWorkbench.tsx");
  const architecture = source("src/features/system-map/SystemMapArchitecturePanel.tsx");
  const workspace = source("src/features/system-map/SystemMapWorkspacePage.tsx");
  const layout = source("src/app/harita/layout.tsx");
  const styles = source("src/app/harita/control-center.css");

  contains(workbench, "Route envanteri ve kontrol masası", "route inventory focused control surface");
  contains(workbench, "function riskSignals", "derived route topology signals");
  contains(workbench, '"public_handlers"', "public handler focus");
  contains(workbench, "Kanonik BLOCKER/WARN", "canonical health handoff");
  notContains(workbench, "Public handler erişimi doğrulanmalı", "route inventory must not auto-escalate public handlers");
  notContains(workbench, "Mimari sağlık", "route inventory must not claim a second architecture health surface");
  notContains(workbench, "healthScore", "route inventory must not calculate a second health score");
  notContains(workbench, "const penalty", "route inventory must not calculate a local health penalty");
  notContains(workbench, "/100", "route inventory must not render a competing numeric health score");
  contains(workbench, "Aksiyon kuyruğu", "priority action queue");
  contains(workbench, "Erişim dağılımı", "access distribution");
  contains(workbench, "Çalışma alanları", "area coverage");
  contains(workbench, "Filtreleri temizle", "workbench reset action");
  contains(workbench, "Kontrol sinyalleri", "route detail signals");
  contains(architecture, "KANONİK MİMARİ SAĞLIK", "canonical architecture health surface");
  contains(architecture, "integrity.summary.blockers", "architecture blocker source");
  contains(architecture, "integrity.summary.warnings", "architecture warning source");
  contains(architecture, "operations.apiSurface", "architecture API evidence source");
  contains(architecture, "Public API", "public API inventory remains visible");
  contains(architecture, "Tek başına risk değildir", "public API is not automatically critical");
  notContains(architecture, "Public handler erişimi doğrulanmalı", "canonical architecture must not auto-escalate public handlers");
  contains(workspace, "blockers={integrity.summary.blockers}", "workspace blocker source must remain canonical");
  contains(workspace, "warnings={integrity.summary.warnings}", "workspace warning source must remain canonical");
  contains(workspace, "<SystemMapArchitecturePanel integrity={integrity} operations={operations} snapshot={snapshot} />", "architecture workspace canonical report wiring");
  contains(layout, 'import "./control-center.css"', "control center styles");
  contains(styles, ".system-map-command-center", "command center styles");
  contains(styles, ".system-map-action-list", "action queue styles");
  notContains(workbench, "fetch(", "client workbench must not create a second route-data source");
});

test("central contract migration stores templates, immutable snapshots and append-only events", () => {
  const migration = source("prisma/migrations/20260820004500_admin_contract_management/migration.sql");

  for (const table of ["ContractTemplate", "UserContract", "UserContractEvent"]) {
    contains(migration, `CREATE TABLE \`${table}\``, "contract migration");
  }
  contains(migration, "titleSnapshot", "immutable contract title snapshot");
  contains(migration, "bodySnapshot", "immutable contract body snapshot");
  contains(migration, "templateVersion", "template version snapshot");
  contains(migration, "activeKey", "active duplicate guard");
  contains(migration, "UserContract_recipientUserId_fkey", "recipient foreign key");
  contains(migration, "UserContractEvent_contractId_fkey", "event foreign key");
  assert.ok(
    migration.split("INSERT INTO `ContractTemplate`").length - 1 >= 1,
    "migration must seed contract examples",
  );
  for (const role of ["writer", "editor", "publisher", "reader", "any"]) {
    contains(migration, `'${role}'`, `seeded ${role} template`);
  }
});

test("central contract writes re-authorize and lock live database state", () => {
  const repository = source("src/features/contracts/repository.ts");
  const manualDispatch = source("src/features/contracts/manual-dispatch.ts");
  const templateLifecycle = source("src/features/contracts/template-lifecycle.ts");
  const actions = source("src/features/contracts/actions.ts");
  const guardedActions = source("src/features/contracts/guarded-response-actions.ts");
  const viewActions = source("src/features/contracts/view-actions.ts");

  contains(manualDispatch, "prisma.$transaction", "manual dispatch transaction");
  contains(repository, "prisma.$transaction", "response/cancel/view transaction");
  contains(templateLifecycle, "prisma.$transaction", "template lifecycle transaction");
  const lockEvidence = [repository, manualDispatch, templateLifecycle]
    .reduce((count, text) => count + text.split("FOR UPDATE").length - 1, 0);
  assert.ok(
    lockEvidence >= 7,
    "canonical contract writes must lock live admin, recipient, template, contract and duplicate state",
  );
  contains(manualDispatch, 'actor.role === "admin"', "database-level admin authorization");
  contains(manualDispatch, 'recipient.status === "active"', "database-level recipient eligibility");
  contains(manualDispatch, 'template.lifecycleStatus !== "active"', "active lifecycle authorization");
  contains(manualDispatch, 'templateRole !== "any" && templateRole !== recipient.role', "template role validation");
  contains(manualDispatch, "activeKey", "active duplicate validation");
  contains(manualDispatch, "bodySnapshot", "immutable sent body");
  contains(manualDispatch, "UserContractEvent", "manual dispatch audit");
  contains(manualDispatch, "transaction.notification.create", "manual dispatch notification");
  contains(repository, "contract.recipientUserId !== recipient.id", "recipient ownership authorization");
  contains(repository, "UserContractEvent", "response/cancel/view audit");
  contains(repository, "notification.create", "response/cancel notifications");
  contains(actions, "requireAdmin()", "admin server action authorization");
  contains(guardedActions, "recipientUserId: user.id", "terminal response ownership binding");
  contains(viewActions, "recipientUserId: user.id", "view ownership binding");
});

test("all role menus expose one shared contract inbox while admin uses the central workbench", () => {
  const navigation = source("src/content/navigation.ts");
  const adminNavigation = source("src/lib/admin-navigation.ts");

  assert.ok(
    navigation.split('{ label: "Sözleşme Yönetimi", href: "/sozlesmelerim" }').length - 1 >= 2,
    "writer and reader menus must expose contract inbox",
  );
  assert.ok(
    navigation.split('{ type: "item", label: "Sözleşme Yönetimi", href: "/sozlesmelerim" }').length - 1 >= 2,
    "editor and publisher menus must expose contract inbox",
  );
  contains(adminNavigation, '{ href: "/sozlesme", label: "Sözleşme Yönetimi"', "admin contract center nav");
  contains(adminNavigation, '{ href: "/harita", label: "Sistem Haritası"', "admin system map nav");
});

test("user contract inbox is owner-scoped and does not become an electronic-signature claim", () => {
  const listPage = source("src/app/sozlesmelerim/page.tsx");
  const detailPage = source("src/app/sozlesmelerim/[contractId]/page.tsx");
  const viewedMarker = source("src/features/contracts/ContractViewedMarker.tsx");
  const viewActions = source("src/features/contracts/view-actions.ts");
  const repository = source("src/features/contracts/repository.ts");
  const guardedActions = source("src/features/contracts/guarded-response-actions.ts");

  contains(listPage, "ignoreAdminRoleView: true", "actual-user contract inbox");
  contains(listPage, "listUserContracts(profile.id)", "owner-scoped contract list");
  contains(detailPage, "getUserContract(contractId, profile.id)", "owner-scoped contract detail");
  contains(detailPage, "ContractViewedMarker", "mounted viewed evidence marker");
  notContains(detailPage, "markUserContractViewed", "server render must not mutate viewed state");
  contains(viewedMarker, "markContractViewedAction(contractId)", "client mounted view signal");
  contains(viewActions, "markUserContractViewed", "authenticated viewed transition action");
  contains(viewActions, "recipientUserId: user.id", "view actor ownership binding");
  contains(repository, "contract.recipientUserId !== recipient.id", "view repository ownership re-check");
  contains(detailPage, "respondToContractWithConfirmationAction", "guarded contract response action");
  contains(guardedActions, "respondToUserContract", "canonical owner-scoped response repository");
  contains(guardedActions, "recipientUserId: user.id", "response actor ownership binding");
  contains(detailPage, "nitelikli elektronik imza işlemi değildir", "signature accuracy notice");
});

test("publisher contract send path is retired in favor of admin central management while publication planning remains", () => {
  const component = source("src/features/publisher-workspace/components/PublisherContractCenter.tsx");
  const actions = source("src/features/publisher-contracts/actions.ts");

  notContains(component, "saveSecurePublisherContractAction", "publisher contract UI");
  contains(component, "saveSecurePublicationPlanAction", "publisher publication plan UI");
  contains(component, "Yeni sözleşme oluşturma ve kullanıcıya gönderme yetkisi", "publisher centralization notice");
  contains(actions, "Yeni sözleşmeler yalnız İlkOku merkezi Sözleşme Yönetimi", "legacy publisher write guard");
  notContains(actions, "savePublisherContractLifecycle", "retired publisher contract write path");
});

test("required system map and contract workbench files exist", () => {
  for (const relativePath of [
    "src/app/harita/page.tsx",
    "src/app/harita/denetim/page.tsx",
    "src/app/harita/rotalar/page.tsx",
    "src/app/harita/sozlesmeler/page.tsx",
    "src/app/harita/control-center.css",
    "src/app/harita/navigation.css",
    "src/app/harita/workspace.css",
    "src/app/sozlesme/page.tsx",
    "src/app/sozlesmelerim/page.tsx",
    "src/features/system-map/SystemMapArchitecturePanel.tsx",
    "src/features/system-map/SystemMapNavigation.tsx",
    "src/features/system-map/SystemMapWorkspacePage.tsx",
    "src/features/system-map/navigation.ts",
    "src/features/system-map/workspace-data.ts",
    "src/features/system-map/collector.ts",
    "src/features/system-map/build-manifest-types.ts",
    "src/features/contracts/manual-dispatch.ts",
    "src/features/contracts/template-lifecycle.ts",
    "src/features/contracts/repository.ts",
    "src/features/contracts/ContractViewedMarker.tsx",
    "src/features/contracts/view-actions.ts",
  ]) {
    assert.ok(existsSync(join(ROOT, relativePath)), `${relativePath} must exist`);
  }
});
